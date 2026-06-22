from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Expense, FinancialStatementLine, InventoryItem, Metric, Sale


COGS_CATEGORIES = {
    'cogs',
    'cost_of_goods_sold',
    'cost of goods sold',
    'cost of goods',
    'goods sold',
}


class KPIService:
    """Computes and persists core business KPIs for a company.

    Note: this service is intentionally pure (compute + persist metrics only).
    Alert generation lives exclusively in AlertService / AlertRuleEngine so
    there is a single source of truth for business risk signals.
    """

    def __init__(self, session: Session):
        self.session = session

    def _data_date_range(self, company_id):
        """Returns (latest_date, earliest_date) across sales and expenses for
        the company, or (None, None) if there's no data. Used to window KPIs
        around the company's real data rather than the calendar."""
        sale_max = self.session.query(func.max(Sale.invoice_date)).filter(Sale.company_id == company_id).scalar()
        sale_min = self.session.query(func.min(Sale.invoice_date)).filter(Sale.company_id == company_id).scalar()
        exp_max = self.session.query(func.max(Expense.incurred_date)).filter(Expense.company_id == company_id).scalar()
        exp_min = self.session.query(func.min(Expense.incurred_date)).filter(Expense.company_id == company_id).scalar()

        maxes = [d for d in (sale_max, exp_max) if d is not None]
        mins = [d for d in (sale_min, exp_min) if d is not None]
        return (max(maxes) if maxes else None, min(mins) if mins else None)

    @staticmethod
    def _normalize_value(value: Any) -> Decimal:
        if value is None:
            return Decimal('0')
        if isinstance(value, Decimal):
            return value
        try:
            return Decimal(str(value))
        except Exception:
            return Decimal('0')

    def _get_revenue(self, company_id, start_date, end_date):
        revenue = self.session.query(
            func.coalesce(func.sum(Sale.amount), 0)
        ).filter(
            Sale.company_id == company_id,
            Sale.invoice_date >= start_date,
            Sale.invoice_date <= end_date,
        ).scalar()

        return self._normalize_value(revenue)

    def _get_total_expenses(self, company_id, start_date: date, end_date: date) -> Decimal:
        expenses = self.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.company_id == company_id,
            Expense.incurred_date >= start_date,
            Expense.incurred_date <= end_date,
        ).scalar()
        return self._normalize_value(expenses)

    def _get_cogs(self, company_id, start_date: date, end_date: date) -> Decimal:
        cogs = self.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.company_id == company_id,
            Expense.incurred_date >= start_date,
            Expense.incurred_date <= end_date,
            func.lower(func.coalesce(Expense.category, '')).in_(COGS_CATEGORIES),
        ).scalar()
        cogs_value = self._normalize_value(cogs)
        if cogs_value == 0:
            return self._get_total_expenses(company_id, start_date, end_date)
        return cogs_value

    def _get_customer_value(self, company_id, start_date: date, end_date: date, revenue: Decimal) -> Decimal:
        customer_count = self.session.query(func.count(func.distinct(Sale.customer_id))).filter(
            Sale.company_id == company_id,
            Sale.invoice_date >= start_date,
            Sale.invoice_date <= end_date,
            Sale.customer_id.isnot(None),
        ).scalar()

        if not customer_count:
            return Decimal('0')
        return revenue / Decimal(customer_count)

    def _get_inventory_turnover(self, company_id, start_date: date, end_date: date) -> Decimal:
        avg_inventory = self.session.query(
            func.coalesce(func.avg(InventoryItem.quantity * InventoryItem.unit_cost), 0)
        ).filter(InventoryItem.company_id == company_id).scalar()
        avg_inventory_value = self._normalize_value(avg_inventory)
        cogs = self._get_cogs(company_id, start_date, end_date)
        if avg_inventory_value == 0:
            return Decimal('0')
        return cogs / avg_inventory_value

    def _get_growth_rate(self, company_id, start_date: date, end_date: date):
        period_days = (end_date - start_date).days + 1
        previous_start = start_date - timedelta(days=period_days)
        previous_end = end_date - timedelta(days=period_days)

        current_revenue = self._get_revenue(company_id, start_date, end_date)
        previous_revenue = self._get_revenue(company_id, previous_start, previous_end)

        # If there is genuinely no prior-period revenue to compare against,
        # growth is UNKNOWN — returning a fabricated 100% misleads a first-time
        # user with a single month of data. None signals "new / not enough
        # history" so the UI can show that honestly instead of "+100%".
        if previous_revenue == 0:
            if current_revenue > 0:
                return None
            return Decimal('0')

        return (current_revenue - previous_revenue) / previous_revenue * Decimal('100')

    def _persist_metric(
        self,
        name: str,
        value: Decimal,
        company_id,
        period_start: date,
        period_end: date,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        if value is None:
            return None
        metric = (
            self.session.query(Metric)
            .filter(
                Metric.company_id == company_id,
                Metric.name == name,
                Metric.period_start == period_start,
                Metric.period_end == period_end,
            )
            .first()
        )

        if metric is None:
            metric = Metric(
                company_id=company_id,
                name=name,
                value=value,
                period_start=period_start,
                period_end=period_end,
                payload=payload,
            )
            self.session.add(metric)
        else:
            metric.value = value
            metric.payload = payload

        self.session.commit()
        return metric

    def _to_float(self, value) -> float:
        if value is None:
            return None
        return float(round(value, 4))

    def _get_collected(self, company_id, start_date, end_date) -> Decimal:
        total = self.session.query(func.coalesce(func.sum(Sale.amount_paid), 0)).filter(
            Sale.company_id == company_id,
            Sale.invoice_date >= start_date,
            Sale.invoice_date <= end_date,
        ).scalar()
        return Decimal(str(total or 0))

    def _get_outstanding_receivables(self, company_id) -> Decimal:
        rows = self.session.query(
            func.coalesce(func.sum(Sale.amount), 0),
            func.coalesce(func.sum(Sale.amount_paid), 0),
        ).filter(
            Sale.company_id == company_id,
            Sale.payment_status.in_(['unpaid', 'partial']),
        ).first()
        billed = Decimal(str(rows[0] or 0))
        paid = Decimal(str(rows[1] or 0))
        return max(Decimal('0'), billed - paid)

    def _get_working_capital(self, company_id, outstanding: Decimal) -> Decimal:
        # Approximation from available data: receivables + inventory value
        # (current assets we can see) minus unpaid vendor bills (proxy = 0
        # without payables data). Honest, data-available estimate.
        inv_value = self.session.query(
            func.coalesce(func.sum(InventoryItem.quantity * InventoryItem.unit_cost), 0)
        ).filter(InventoryItem.company_id == company_id).scalar()
        return outstanding + Decimal(str(inv_value or 0))

    def _get_vendor_dependency(self, company_id, start_date, end_date) -> Decimal:
        rows = self.session.query(
            Expense.vendor, func.coalesce(func.sum(Expense.amount), 0)
        ).filter(
            Expense.company_id == company_id,
            Expense.incurred_date >= start_date,
            Expense.incurred_date <= end_date,
        ).group_by(Expense.vendor).all()
        if not rows:
            return Decimal('0')
        totals = [Decimal(str(r[1] or 0)) for r in rows]
        grand = sum(totals)
        if grand <= 0:
            return Decimal('0')
        return (max(totals) / grand) * Decimal('100')

    def _get_churn_risk(self, company_id, end_date) -> Decimal:
        # Share of customers who bought historically but not in the last 60
        # days of data -- a simple, explainable churn-risk proxy.
        cutoff = end_date - timedelta(days=60)
        recent = self.session.query(func.count(func.distinct(Sale.customer_id))).filter(
            Sale.company_id == company_id, Sale.customer_id.isnot(None),
            Sale.invoice_date > cutoff,
        ).scalar() or 0
        total = self.session.query(func.count(func.distinct(Sale.customer_id))).filter(
            Sale.company_id == company_id, Sale.customer_id.isnot(None),
        ).scalar() or 0
        if total <= 0:
            return Decimal('0')
        return (Decimal(total - recent) / Decimal(total)) * Decimal('100')

    def calculate_kpis(
        self,
        company_id,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:

        if end_date is None or start_date is None:
            data_end, data_start = self._data_date_range(company_id)
            if end_date is None:
                end_date = data_end or date.today()
            if start_date is None:
                # Window the latest ~30 days of ACTUAL data, not the last 30
                # calendar days from today -- otherwise uploaded historical
                # data (older invoice dates) reads as zero and alerts/insights
                # never change after an import.
                start_date = max(end_date - timedelta(days=29), data_start) if data_start else (end_date - timedelta(days=29))

        revenue = self._get_revenue(company_id, start_date, end_date)
        total_expenses = self._get_total_expenses(company_id, start_date, end_date)
        gross_profit = revenue - self._get_cogs(company_id, start_date, end_date)
        net_profit = revenue - total_expenses

        profit_margin = Decimal('0')
        if revenue != 0:
            profit_margin = (net_profit / revenue) * Decimal('100')

        customer_value = self._get_customer_value(company_id, start_date, end_date, revenue)
        inventory_turnover = self._get_inventory_turnover(company_id, start_date, end_date)
        growth_rate = self._get_growth_rate(company_id, start_date, end_date)

        # --- Cash & working-capital KPIs (the numbers owners actually feel) ---
        period_days = max((end_date - start_date).days + 1, 1)
        collected = self._get_collected(company_id, start_date, end_date)
        outstanding = self._get_outstanding_receivables(company_id)
        cash_position = collected - total_expenses
        # Receivable Days (DSO): outstanding / avg daily credit sales.
        avg_daily_rev = (revenue / Decimal(period_days)) if revenue else Decimal('0')
        receivable_days = (outstanding / avg_daily_rev) if avg_daily_rev else Decimal('0')
        receivable_days = min(receivable_days, Decimal('365'))
        # Burn / runway: only meaningful when running at a loss.
        monthly_factor = Decimal(period_days) / Decimal('30')
        net_monthly = (net_profit / monthly_factor) if monthly_factor else net_profit
        burn_rate = -net_monthly if net_monthly < 0 else Decimal('0')
        runway_months = (cash_position / burn_rate) if burn_rate > 0 and cash_position > 0 else Decimal('0')
        working_capital = self._get_working_capital(company_id, outstanding)
        vendor_dependency = self._get_vendor_dependency(company_id, start_date, end_date)
        churn_risk = self._get_churn_risk(company_id, end_date)

        results = {
            'revenue': self._to_float(revenue),
            'gross_profit': self._to_float(gross_profit),
            'net_profit': self._to_float(net_profit),
            'total_expenses': self._to_float(total_expenses),
            'profit_margin': self._to_float(profit_margin),
            'growth_rate': self._to_float(growth_rate),
            'customer_value': self._to_float(customer_value),
            'inventory_turnover': self._to_float(inventory_turnover),
            'cash_position': self._to_float(cash_position),
            'outstanding_receivables': self._to_float(outstanding),
            'receivable_days': self._to_float(receivable_days),
            'burn_rate': self._to_float(burn_rate),
            'runway_months': self._to_float(runway_months),
            'working_capital': self._to_float(working_capital),
            'vendor_dependency': self._to_float(vendor_dependency),
            'churn_risk': self._to_float(churn_risk),
            'period_start': start_date,
            'period_end': end_date,
        }

        # --- Balance-sheet override (authoritative when uploaded) ---
        # A balance sheet is point-in-time truth for cash, working capital and
        # liquidity. When one exists, its figures override the sales-derived
        # approximations above, and we surface the dedicated balance-sheet
        # KPIs (current/quick/debt ratio, net worth, liquidity & strength).
        try:
            from app.services.ingestion.balance_sheet_service import BalanceSheetService
            bs = BalanceSheetService(self.session)
            bs_kpis = bs.kpis(company_id)
            if bs_kpis.get('available'):
                if bs_kpis.get('cash_position') is not None:
                    results['cash_position'] = bs_kpis['cash_position']
                if bs_kpis.get('working_capital') is not None:
                    results['working_capital'] = bs_kpis['working_capital']
                results['current_ratio'] = bs_kpis.get('current_ratio')
                results['quick_ratio'] = bs_kpis.get('quick_ratio')
                results['debt_ratio'] = bs_kpis.get('debt_ratio')
                results['liquidity_score'] = bs_kpis.get('liquidity_score')
                results['financial_strength_score'] = bs_kpis.get('financial_strength_score')
                results['net_worth'] = bs_kpis.get('net_worth')
                results['balance_sheet_available'] = True
        except Exception:
            pass

        # --- Bank statement cash position (when no balance sheet override) ---
        # A bank statement's latest balance is authoritative for cash on hand.
        # If a balance sheet already set cash_position above, that wins; else
        # the bank balance makes an uploaded bank statement move the dashboard.
        try:
            if not results.get('balance_sheet_available'):
                from app.services.cash_flow_service import CashFlowService
                cf = CashFlowService(self.session)
                cf_kpis = cf.kpis(company_id)
                if cf_kpis.get('available') and cf_kpis.get('cash_position') is not None:
                    results['cash_position'] = cf_kpis['cash_position']
                    results['net_cash_flow'] = cf_kpis.get('net_cash_flow')
                    results['cash_flow_available'] = True
        except Exception:
            pass

        # --- P&L reconciliation (avoid double counting) ---
        # Transactional Sales/Expense data is the PRIMARY source for revenue
        # and profit. A P&L statement is a SECONDARY/summary source. To avoid
        # double counting, we only fill revenue/profit FROM the P&L when there
        # is no transactional data for the period (revenue and expenses both
        # zero). When sales exist, the P&L still powers Profitability
        # Intelligence (margins, EBITDA) but does not overwrite the KPIs.
        try:
            from app.services.ingestion.profit_loss_service import ProfitLossService
            pl = ProfitLossService(self.session)
            pl_kpis = pl.kpis(company_id)
            if pl_kpis.get('available'):
                results['pnl_available'] = True
                # Always expose P&L-derived margins/EBITDA (additive, no clash).
                results['gross_margin'] = pl_kpis.get('gross_margin')
                results['operating_margin'] = pl_kpis.get('operating_margin')
                results['ebitda'] = pl_kpis.get('ebitda')
                results['profitability_score'] = pl_kpis.get('profitability_score')
                no_txn = (not results.get('revenue')) and (not results.get('total_expenses'))
                if no_txn:
                    # No transactional data — use the P&L as the source of
                    # revenue/profit so the dashboard isn't empty.
                    if pl_kpis.get('revenue'):
                        results['revenue'] = pl_kpis['revenue']
                    if pl_kpis.get('gross_profit') is not None:
                        results['gross_profit'] = pl_kpis['gross_profit']
                    if pl_kpis.get('net_profit') is not None:
                        results['net_profit'] = pl_kpis['net_profit']
                    if pl_kpis.get('net_margin') is not None:
                        results['profit_margin'] = pl_kpis['net_margin']
        except Exception:
            pass

        for metric_name, decimal_value in (
            ('revenue', revenue),
            ('gross_profit', gross_profit),
            ('net_profit', net_profit),
            ('profit_margin', profit_margin),
            ('growth_rate', growth_rate),
            ('customer_value', customer_value),
            ('inventory_turnover', inventory_turnover),
        ):
            self._persist_metric(metric_name, decimal_value, company_id, start_date, end_date)

        return results

    # -- New, additive: liquidity and solvency ratios from financial
    # statement data (Universal Data Upload Engine, Phase 4). These are
    # point-in-time balance-sheet metrics, not period-flow metrics like
    # the KPIs above -- so they key off the latest available balance
    # sheet date for the company, not a date range.

    def _latest_balance_sheet_date(self, company_id) -> Optional[date]:
        return self.session.query(func.max(FinancialStatementLine.statement_date)).filter(
            FinancialStatementLine.company_id == company_id,
            FinancialStatementLine.statement_type == 'balance_sheet',
        ).scalar()

    def _balance_sheet_category_sum(self, company_id, statement_date: date, category: str) -> Decimal:
        result = self.session.query(func.coalesce(func.sum(FinancialStatementLine.amount), 0)).filter(
            FinancialStatementLine.company_id == company_id,
            FinancialStatementLine.statement_type == 'balance_sheet',
            FinancialStatementLine.statement_date == statement_date,
            FinancialStatementLine.line_category == category,
        ).scalar()
        return self._normalize_value(result)

    def calculate_liquidity_ratios(self, company_id, as_of_date: Optional[date] = None) -> Dict[str, Any]:
        # Delegate to the dedicated balance-sheet pipeline so cash/receivables/
        # payables that now land in granular categories are all counted.
        from app.services.ingestion.balance_sheet_service import BalanceSheetService
        bs = BalanceSheetService(self.session)
        k = bs.kpis(company_id)
        if not k.get('available'):
            return {
                'available': False,
                'reason': 'No balance sheet data uploaded yet.',
                'current_ratio': None,
                'quick_ratio': None,
                'statement_date': None,
            }
        return {
            'available': True,
            'current_ratio': k.get('current_ratio'),
            'quick_ratio': k.get('quick_ratio'),
            'statement_date': k.get('statement_date'),
        }

    def calculate_solvency_ratios(self, company_id, as_of_date: Optional[date] = None) -> Dict[str, Any]:
        from app.services.ingestion.balance_sheet_service import BalanceSheetService
        bs = BalanceSheetService(self.session)
        f = bs.figures(company_id)
        if not f.get('available'):
            return {
                'available': False,
                'reason': 'No balance sheet data uploaded yet.',
                'debt_to_equity': None,
                'statement_date': None,
            }
        equity = Decimal(str(f.get('equity') or 0))
        total_liabilities = Decimal(str(f.get('total_liabilities') or 0))
        if equity == 0:
            return {
                'available': True,
                'debt_to_equity': None,
                'statement_date': f.get('statement_date'),
                'note': 'No equity recorded -- ratio is undefined, not zero.',
            }
        return {
            'available': True,
            'debt_to_equity': self._to_float(total_liabilities / equity),
            'statement_date': f.get('statement_date'),
        }
