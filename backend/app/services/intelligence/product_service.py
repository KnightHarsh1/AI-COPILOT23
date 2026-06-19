"""Product Intelligence engine.

Best-selling and most-profitable products, dead/slow-moving stock,
stockout risk, product dependency, and a product health score.

Coverage honesty: most historical sales aren't linked to an inventory
item (inventory_item_id is null), so velocity-based metrics report the
coverage ("based on N of M sales") and stock-level metrics (which only
need the inventory table) always work regardless.
"""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.inventory import InventoryItem
from app.db.models.sale import Sale

DEAD_STOCK_DAYS = 90
SLOW_MOVING_DAYS = 45


def _f(value) -> float:
    return float(value) if value is not None else 0.0


class ProductIntelligenceService:
    def __init__(self, session: Session):
        self.session = session

    def analyze(self, company_id) -> dict:
        items = self.session.query(InventoryItem).filter(InventoryItem.company_id == company_id).all()

        if not items:
            return {
                'available': False,
                'reason': 'No inventory data yet. Upload or import an inventory report to unlock product insights.',
            }

        today = date.today()
        dead_stock = []
        slow_moving = []
        stockout_risk = []
        inventory_value = 0.0

        for item in items:
            inventory_value += _f(item.unit_cost) * (item.quantity or 0)

            if item.quantity is not None and item.reorder_level is not None and item.quantity <= item.reorder_level:
                stockout_risk.append({
                    'product_name': item.product_name,
                    'sku': item.sku,
                    'quantity': item.quantity,
                    'reorder_level': item.reorder_level,
                })

            if item.last_sold_date is None:
                days_idle = None
            else:
                days_idle = (today - item.last_sold_date).days

            if (days_idle is None or days_idle >= DEAD_STOCK_DAYS) and (item.quantity or 0) > 0:
                dead_stock.append({
                    'product_name': item.product_name,
                    'sku': item.sku,
                    'quantity': item.quantity,
                    'value': round(_f(item.unit_cost) * (item.quantity or 0), 2),
                    'days_idle': days_idle,
                })
            elif days_idle is not None and days_idle >= SLOW_MOVING_DAYS:
                slow_moving.append({
                    'product_name': item.product_name,
                    'sku': item.sku,
                    'days_idle': days_idle,
                })

        # Best sellers / most profitable from linked sales.
        linked = (
            self.session.query(
                Sale.inventory_item_id,
                func.coalesce(func.sum(Sale.amount), 0).label('revenue'),
                func.count(Sale.id).label('order_count'),
            )
            .filter(Sale.company_id == company_id, Sale.inventory_item_id.isnot(None))
            .group_by(Sale.inventory_item_id)
            .order_by(func.sum(Sale.amount).desc())
            .all()
        )

        total_sales = self.session.query(func.count(Sale.id)).filter(Sale.company_id == company_id).scalar() or 0
        linked_sales = self.session.query(func.count(Sale.id)).filter(
            Sale.company_id == company_id, Sale.inventory_item_id.isnot(None)
        ).scalar() or 0

        item_by_id = {item.id: item for item in items}
        best_sellers = []
        most_profitable = []
        for inv_id, revenue, order_count in linked[:10]:
            item = item_by_id.get(inv_id)
            if not item:
                continue
            best_sellers.append({
                'product_name': item.product_name,
                'sku': item.sku,
                'revenue': round(_f(revenue), 2),
                'order_count': order_count,
            })
            est_margin = _f(revenue) - (_f(item.unit_cost) * (item.total_units_sold or 0))
            most_profitable.append({
                'product_name': item.product_name,
                'sku': item.sku,
                'estimated_margin': round(est_margin, 2),
            })

        most_profitable.sort(key=lambda x: x['estimated_margin'], reverse=True)

        # Product dependency: top product's share of linked revenue.
        top_product_share = 0.0
        if best_sellers:
            linked_revenue = sum(b['revenue'] for b in best_sellers)
            if linked_revenue:
                top_product_share = round(best_sellers[0]['revenue'] / linked_revenue * 100, 1)

        # Product health score: penalize dead-stock share + heavy dependency.
        dead_value = sum(d['value'] for d in dead_stock)
        dead_ratio = (dead_value / inventory_value) if inventory_value else 0.0
        score = 100.0
        score -= dead_ratio * 40
        score -= len(stockout_risk) * 3
        if top_product_share > 50:
            score -= (top_product_share - 50) * 0.4
        score = max(0.0, min(100.0, round(score, 1)))

        coverage_note = None
        if total_sales and linked_sales < total_sales:
            coverage_note = f'Sales-based metrics use {linked_sales} of {total_sales} sales that are linked to a product.'

        return {
            'available': True,
            'total_products': len(items),
            'inventory_value': round(inventory_value, 2),
            'best_sellers': best_sellers[:5],
            'most_profitable': most_profitable[:5],
            'dead_stock': dead_stock[:10],
            'dead_stock_value': round(dead_value, 2),
            'slow_moving': slow_moving[:10],
            'stockout_risk': stockout_risk[:10],
            'top_product_share': top_product_share,
            'product_health_score': score,
            'coverage_note': coverage_note,
        }
