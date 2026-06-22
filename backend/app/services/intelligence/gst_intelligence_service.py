"""GST Intelligence — turns the tax detail captured from GST R1 imports
(taxable value, CGST, SGST, IGST, total tax per invoice) into real compliance
intelligence: GST liability, a GST health score, risk alerts, monthly tax
trends, and filing readiness.

This complements the deadline-calendar ComplianceService (which tracks WHEN to
file); this service answers HOW MUCH and HOW HEALTHY. None-safe: returns
{'available': False} when no GST tax data has been captured.
"""
from collections import defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy import func

from app.db.models.sale import Sale


def _d(v):
    try:
        return Decimal(str(v or 0))
    except Exception:
        return Decimal('0')


class GSTIntelligenceService:
    def __init__(self, session):
        self.session = session

    def _has_columns(self) -> bool:
        try:
            from sqlalchemy import inspect as _sa_inspect
            cols = {c['name'] for c in _sa_inspect(self.session.get_bind()).get_columns('sales')}
            return 'total_tax' in cols
        except Exception:
            return False

    def has_gst_data(self, company_id) -> bool:
        if not self._has_columns():
            return False
        try:
            return self.session.query(Sale.id).filter(
                Sale.company_id == company_id,
                Sale.total_tax.isnot(None),
            ).first() is not None
        except Exception:
            return False

    def _rows(self, company_id):
        return (
            self.session.query(Sale)
            .filter(Sale.company_id == company_id, Sale.total_tax.isnot(None))
            .all()
        )

    def analyze(self, company_id) -> dict:
        if not self.has_gst_data(company_id):
            return {'available': False, 'reason': 'Import a GST R1 report to unlock GST liability and health.'}

        rows = self._rows(company_id)
        taxable = sum((_d(r.taxable_value) for r in rows), Decimal('0'))
        cgst = sum((_d(r.cgst) for r in rows), Decimal('0'))
        sgst = sum((_d(r.sgst) for r in rows), Decimal('0'))
        igst = sum((_d(r.igst) for r in rows), Decimal('0'))
        total_tax = sum((_d(r.total_tax) for r in rows), Decimal('0'))
        # If total_tax wasn't provided per row, derive it.
        if total_tax == 0:
            total_tax = cgst + sgst + igst

        invoice_count = len(rows)
        # Effective tax rate against taxable value.
        eff_rate = float(total_tax / taxable * 100) if taxable > 0 else None

        # Monthly GST trend (output tax liability per month).
        monthly = defaultdict(lambda: Decimal('0'))
        for r in rows:
            key = r.invoice_date.strftime('%Y-%m') if r.invoice_date else 'unknown'
            monthly[key] += _d(r.total_tax) or (_d(r.cgst) + _d(r.sgst) + _d(r.igst))
        trend = [{'month': k, 'tax': float(v)} for k, v in sorted(monthly.items())]

        # Output GST liability = tax collected on sales (R1 is outward supplies).
        # Without purchase/input data we report gross output liability and say
        # so honestly (net payable would subtract input tax credit).
        liability = {
            'output_tax': float(total_tax),
            'cgst': float(cgst),
            'sgst': float(sgst),
            'igst': float(igst),
            'taxable_value': float(taxable),
            'note': 'Output GST on sales (GST R1). Net payable would subtract input tax credit from purchases.',
        }

        health = self._health(rows, taxable, total_tax, eff_rate)
        alerts = self._alerts(rows, total_tax, eff_rate, trend)
        readiness = self._filing_readiness(company_id, rows, total_tax)

        return {
            'available': True,
            'invoice_count': invoice_count,
            'effective_tax_rate': round(eff_rate, 2) if eff_rate is not None else None,
            'liability': liability,
            'gst_health_score': health['score'],
            'health_factors': health['factors'],
            'trend': trend,
            'alerts': alerts,
            'filing_readiness': readiness,
        }

    def _health(self, rows, taxable, total_tax, eff_rate):
        """GST health 0-100: data completeness + rate sanity + GSTIN coverage."""
        factors = []
        score = 100.0

        # Invoices missing a GSTIN (B2C or incomplete) reduce reconcilability.
        missing_taxable = sum(1 for r in rows if not r.taxable_value)
        if rows and missing_taxable:
            pct = missing_taxable / len(rows) * 100
            penalty = min(30, pct * 0.5)
            score -= penalty
            factors.append({'label': f'{missing_taxable} invoice(s) missing taxable value', 'tone': 'bad'})
        else:
            factors.append({'label': 'All invoices have taxable value', 'tone': 'good'})

        # Effective rate sanity (Indian GST slabs ~0-28%). Outside → data issue.
        if eff_rate is not None:
            if eff_rate > 30:
                score -= 20
                factors.append({'label': f'Effective tax rate {eff_rate:.0f}% looks high', 'tone': 'bad'})
            elif eff_rate < 1:
                score -= 10
                factors.append({'label': f'Effective tax rate {eff_rate:.1f}% looks low', 'tone': 'neutral'})
            else:
                factors.append({'label': f'Effective tax rate {eff_rate:.1f}% is in range', 'tone': 'good'})

        return {'score': max(0, min(100, round(score))), 'factors': factors}

    def _alerts(self, rows, total_tax, eff_rate, trend):
        out = []
        if total_tax > 0:
            out.append({
                'type': 'tax_liability', 'severity': 'medium',
                'title': f'GST output liability of ₹{total_tax:,.0f}',
                'detail': 'This is the GST collected on sales that must be reported in your return.',
            })
        # High liability warning relative to the largest month.
        if trend:
            latest = trend[-1]
            if latest['tax'] > 0 and len(trend) >= 2:
                prev = trend[-2]['tax']
                if prev > 0 and latest['tax'] > prev * 1.5:
                    out.append({
                        'type': 'tax_spike', 'severity': 'medium',
                        'title': f'GST liability rose to ₹{latest["tax"]:,.0f} in {latest["month"]}',
                        'detail': 'Tax liability jumped over 50% vs the prior month — ensure cash is set aside.',
                    })
        if eff_rate is not None and eff_rate > 30:
            out.append({
                'type': 'rate_anomaly', 'severity': 'high',
                'title': 'Effective GST rate looks unusually high',
                'detail': f'{eff_rate:.0f}% of taxable value — check for data entry errors before filing.',
            })
        return out

    def _filing_readiness(self, company_id, rows, total_tax):
        """How ready the GST return is: do we have the data needed to file?"""
        has_taxable = all(r.taxable_value is not None for r in rows) if rows else False
        checks = [
            {'label': 'Invoice-level tax captured', 'ok': bool(rows)},
            {'label': 'Taxable value on every invoice', 'ok': has_taxable},
            {'label': 'Output tax computed', 'ok': total_tax > 0},
        ]
        ready = sum(1 for c in checks if c['ok'])
        pct = round(ready / len(checks) * 100) if checks else 0
        return {
            'score': pct,
            'checks': checks,
            'status': 'Ready to reconcile' if pct == 100 else 'Needs attention',
        }

    # -- Daily AI Action Center contributions --------------------------------
    def actions(self, company_id) -> list:
        data = self.analyze(company_id)
        if not data.get('available'):
            return []
        out = []
        liability = data['liability']['output_tax']
        if liability > 0:
            out.append({
                'category': 'compliance', 'priority': 'high',
                'title': f'Set aside ₹{liability:,.0f} for GST',
                'reason': 'This is the output GST collected on sales and payable in your return.',
                'expected_impact': 'Avoids a cash shortfall at filing time.',
                'recommended_action': 'Reserve the GST liability and reconcile input tax credit before filing.',
                'horizon': 'week',
            })
        for a in data['alerts']:
            if a['type'] == 'rate_anomaly':
                out.append({
                    'category': 'compliance', 'priority': 'high',
                    'title': a['title'],
                    'reason': a['detail'],
                    'expected_impact': 'Prevents filing errors and penalties.',
                    'recommended_action': 'Review invoices with unusual tax before submitting the return.',
                    'horizon': 'today',
                })
        return out
