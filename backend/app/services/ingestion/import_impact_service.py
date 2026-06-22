"""Import Impact Report. Captures a snapshot of the key business metrics before
an import and another after it commits, then reports exactly what changed —
revenue, profit, cash, health score, and the counts of new alerts / actions /
opportunities. This is what makes intelligence *visible* after each upload.

The snapshot is intentionally cheap (a handful of already-computed figures) so
it can run inline during confirm without slowing the import.
"""
from decimal import Decimal


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


class ImportImpactService:
    # The metrics we track deltas on, with display labels and whether a rise is
    # good (so the UI can colour them).
    TRACKED = [
        ('revenue', 'Revenue', 'up_good'),
        ('net_profit', 'Net profit', 'up_good'),
        ('total_expenses', 'Expenses', 'up_bad'),
        ('cash_position', 'Cash position', 'up_good'),
        ('working_capital', 'Working capital', 'up_good'),
        ('profit_margin', 'Profit margin', 'up_good'),
    ]

    def __init__(self, session):
        self.session = session

    def snapshot(self, company_id) -> dict:
        """Capture the current state: tracked KPIs, health score, and the count
        of open alerts / available actions / opportunities."""
        snap = {'kpis': {}, 'health_score': None, 'gst_liability': None,
                'alert_count': 0, 'action_count': 0, 'opportunity_count': 0}

        try:
            from app.services.kpi_engine import KPIService
            kpis = KPIService(self.session).calculate_kpis(company_id)
            for key, _label, _dir in self.TRACKED:
                snap['kpis'][key] = _num(kpis.get(key))
        except Exception:
            pass

        try:
            from app.services.health_score import HealthScoreService
            h = HealthScoreService(self.session).calculate_health_score(company_id)
            snap['health_score'] = _num(h.get('health_score'))
        except Exception:
            pass

        try:
            from app.services.intelligence.gst_intelligence_service import GSTIntelligenceService
            g = GSTIntelligenceService(self.session).analyze(company_id)
            if g.get('available'):
                snap['gst_liability'] = _num(g.get('liability', {}).get('output_tax'))
        except Exception:
            pass

        try:
            from app.db.models.alert import Alert
            snap['alert_count'] = (
                self.session.query(Alert)
                .filter(Alert.company_id == company_id, Alert.status == 'open')
                .count()
            )
        except Exception:
            pass

        try:
            from app.services.intelligence.action_center_service import ActionCenterService
            ac = ActionCenterService(self.session).generate(company_id)
            snap['action_count'] = ac.get('total_actions') or len(
                ac.get('today', [])) + len(ac.get('week', [])) + len(ac.get('month', []))
        except Exception:
            pass

        try:
            from app.services.intelligence.opportunity_intelligence_service import OpportunityIntelligenceService
            op = OpportunityIntelligenceService(self.session).analyze(company_id)
            snap['opportunity_count'] = op.get('opportunity_count', 0) if op.get('available') else 0
        except Exception:
            pass

        return snap

    def diff(self, before: dict, after: dict, *, document_type=None, result=None) -> dict:
        """Compare two snapshots into a human-readable impact report."""
        changes = []
        for key, label, direction in self.TRACKED:
            b = (before.get('kpis') or {}).get(key)
            a = (after.get('kpis') or {}).get(key)
            if a is None and b is None:
                continue
            b = b or 0.0
            a = a or 0.0
            if abs(a - b) < 0.005:
                continue
            delta = a - b
            good = (delta > 0) if direction == 'up_good' else (delta < 0)
            changes.append({
                'metric': key, 'label': label,
                'before': round(b, 2), 'after': round(a, 2),
                'delta': round(delta, 2),
                'tone': 'good' if good else 'bad',
                'is_percent': key == 'profit_margin',
            })

        def _delta(field):
            b = before.get(field) or 0
            a = after.get(field) or 0
            return {'before': b, 'after': a, 'delta': a - b}

        health = None
        if before.get('health_score') is not None or after.get('health_score') is not None:
            hb = before.get('health_score')
            ha = after.get('health_score')
            health = {
                'before': round(hb, 1) if hb is not None else None,
                'after': round(ha, 1) if ha is not None else None,
                'delta': round((ha or 0) - (hb or 0), 1),
            }

        gst = None
        if after.get('gst_liability') is not None:
            gb = before.get('gst_liability') or 0
            ga = after.get('gst_liability') or 0
            gst = {'before': round(gb, 2), 'after': round(ga, 2), 'delta': round(ga - gb, 2)}

        records = 0
        if result is not None:
            records = (getattr(result, 'sales_added', 0) or 0) \
                + (getattr(result, 'expenses_added', 0) or 0) \
                + (getattr(result, 'statement_lines_added', 0) or 0) \
                + (getattr(result, 'bank_transactions_added', 0) or 0) \
                + (getattr(result, 'inventory_added', 0) or 0) \
                + (getattr(result, 'customers_added', 0) or 0)

        return {
            'document_type': document_type,
            'records_imported': records,
            'metric_changes': changes,
            'health_score': health,
            'gst_liability': gst,
            'new_alerts': max(0, _delta('alert_count')['delta']),
            'new_actions': max(0, _delta('action_count')['delta']),
            'new_opportunities': max(0, _delta('opportunity_count')['delta']),
            'totals': {
                'alerts': after.get('alert_count', 0),
                'actions': after.get('action_count', 0),
                'opportunities': after.get('opportunity_count', 0),
            },
        }
