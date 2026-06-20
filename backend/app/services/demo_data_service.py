"""Demo Dataset Mode: seeds realistic, recent-dated business data so a
first-time user sees a fully working Command Center immediately. Idempotent
guard prevents double-seeding."""

import random
from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.sale import Sale
from app.db.models.expense import Expense
from app.db.models.inventory import InventoryItem
from app.db.models.customer import Customer


class DemoDataService:
    def __init__(self, session: Session):
        self.session = session

    def load(self, company_id, user_id=None) -> dict:
        existing = self.session.query(func.count(Sale.id)).filter(Sale.company_id == company_id).scalar() or 0
        if existing > 0:
            return {'loaded': False, 'reason': 'Data already present; demo skipped to avoid mixing.'}

        rng = random.Random(42)
        today = date.today()
        cats = ['Electronics', 'Clothing', 'Grocery', 'Furniture']
        custs = ['Sharma Traders', 'Verma Stores', 'Iqbal & Sons', 'Reddy Mart', 'Khanna Retail']

        customers = {}
        for name in custs:
            c = Customer(company_id=company_id, name=name, status='active')
            self.session.add(c)
            self.session.flush()
            customers[name] = c.id

        statuses = ['paid', 'paid', 'paid', 'unpaid', 'partial']
        for i in range(50):
            amt = rng.choice([2880, 11616, 4990, 1500, 8400, 3299])
            st = rng.choice(statuses)
            paid = amt if st == 'paid' else (round(amt * 0.5) if st == 'partial' else 0)
            day = rng.randint(0, 25)
            cust = rng.choice(custs)
            self.session.add(Sale(
                company_id=company_id,
                invoice_date=today - timedelta(days=day),
                amount=amt, category=rng.choice(cats),
                customer_id=customers[cust],
                payment_status=st, amount_paid=paid,
                due_date=today - timedelta(days=max(day - 15, 0)),
                is_credit_sale=(st != 'paid'),
            ))

        vendors = [('BSES Power', 'Utilities'), ('Airtel Biz', 'Internet'), ('Landlord', 'Rent'),
                   ('FedEx', 'Shipping'), ('Staff', 'Salary'), ('Raw Supplier', 'Raw Material')]
        for i in range(24):
            v, c = rng.choice(vendors)
            self.session.add(Expense(
                company_id=company_id,
                incurred_date=today - timedelta(days=rng.randint(0, 25)),
                vendor=v, category=c, amount=rng.choice([1500, 3000, 8000, 15000, 42000]),
            ))

        inv = [('Laptop', 4, 3, 42000), ('Phone', 2, 5, 18000), ('Headphones', 0, 4, 1200),
               ('T-Shirt', 120, 20, 250), ('Office Chair', 3, 5, 3500), ('Old Desk', 15, 5, 4000)]
        for name, qty, reorder, cost in inv:
            self.session.add(InventoryItem(
                company_id=company_id, product_name=name, quantity=qty,
                reorder_level=reorder, unit_cost=cost,
            ))

        self.session.commit()

        # Refresh insights so the dashboard is populated immediately.
        try:
            from app.services.health_score import HealthScoreService
            from app.services.alert_service import AlertService
            from app.services.recommendation_service import RecommendationService
            from app.services.upload_freshness_service import UploadFreshnessService
            HealthScoreService(self.session).calculate_health_score(company_id)
            AlertService(self.session).generate_alerts(company_id)
            RecommendationService(self.session).generate_recommendations(company_id=company_id, generated_by_id=user_id)
            UploadFreshnessService(self.session).touch(company_id)
        except Exception:
            pass

        try:
            from app.services.insight_support_service import AuditService
            AuditService(self.session).log(company_id, 'import', 'Loaded demo dataset', user_id=user_id)
        except Exception:
            pass

        return {'loaded': True, 'sales': 50, 'expenses': 24, 'inventory': len(inv), 'customers': len(custs)}
