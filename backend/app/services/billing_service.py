"""Billing & plans. Defines tiers and what each unlocks, and provides a
Razorpay-compatible order/verify foundation that works in 'manual' mode
without live keys (so the paywall is fully functional in dev and can flip
to real payments by setting RAZORPAY_* env vars).
"""

import hashlib
import hmac
import time

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.company import Company

PLANS = {
    'starter': {
        'name': 'Starter', 'price_inr': 0,
        'features': ['command_center', 'kpis', 'health_score', 'reports', 'collections', 'product', 'goals', 'coverage'],
    },
    'growth': {
        'name': 'Growth', 'price_inr': 999,
        'features': ['command_center', 'kpis', 'health_score', 'reports', 'collections', 'product', 'goals',
                     'coverage', 'market_radar', 'benchmark', 'compliance', 'weekly_digest', 'forecast'],
    },
    'pro': {
        'name': 'Pro', 'price_inr': 2499,
        'features': ['command_center', 'kpis', 'health_score', 'reports', 'collections', 'product', 'goals',
                     'coverage', 'market_radar', 'benchmark', 'compliance', 'weekly_digest', 'forecast',
                     'whatsapp', 'team', 'priority_support', 'unlimited_history'],
    },
}

# Features that require a paid plan (used by the gate dependency).
PREMIUM_FEATURES = {'market_radar', 'whatsapp', 'team', 'forecast', 'unlimited_history'}


def plan_features(plan: str):
    return PLANS.get(plan or 'starter', PLANS['starter'])['features']


def has_feature(plan: str, feature: str) -> bool:
    return feature in plan_features(plan)


class BillingService:
    def __init__(self, session: Session):
        self.session = session

    def _company(self, company_id):
        return self.session.query(Company).filter(Company.id == company_id).one_or_none()

    def status(self, company_id) -> dict:
        company = self._company(company_id)
        plan = (company.plan if company else 'starter') or 'starter'
        info = PLANS.get(plan, PLANS['starter'])
        return {
            'plan': plan,
            'plan_name': info['name'],
            'price_inr': info['price_inr'],
            'features': info['features'],
            'all_plans': [
                {'id': k, 'name': v['name'], 'price_inr': v['price_inr'], 'features': v['features']}
                for k, v in PLANS.items()
            ],
            'razorpay_enabled': bool(getattr(settings, 'razorpay_key_id', '')),
        }

    def create_order(self, company_id, plan: str) -> dict:
        if plan not in PLANS:
            return {'ok': False, 'reason': 'unknown plan'}
        amount = PLANS[plan]['price_inr'] * 100  # paise
        order_id = f"order_{int(time.time())}_{plan}"
        key = getattr(settings, 'razorpay_key_id', '')
        # In manual mode (no keys) the frontend can confirm directly; with
        # keys, this would call Razorpay's orders API.
        return {
            'ok': True, 'order_id': order_id, 'amount': amount, 'currency': 'INR',
            'plan': plan, 'razorpay_key_id': key, 'manual_mode': not bool(key),
        }

    def activate(self, company_id, plan: str, payment_id: str = None, signature: str = None) -> dict:
        if plan not in PLANS:
            return {'ok': False, 'reason': 'unknown plan'}
        secret = getattr(settings, 'razorpay_key_secret', '')
        # If running with real keys, verify the signature; in manual mode,
        # accept (dev/no-payment-gateway path).
        if secret and payment_id and signature:
            expected = hmac.new(secret.encode(), payment_id.encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(expected, signature):
                return {'ok': False, 'reason': 'signature mismatch'}
        company = self._company(company_id)
        if company is None:
            return {'ok': False, 'reason': 'company not found'}
        company.plan = plan
        self.session.commit()
        try:
            from app.services.insight_support_service import AuditService
            AuditService(self.session).log(company_id, 'settings', f'Upgraded to {PLANS[plan]["name"]} plan')
        except Exception:
            pass
        return {'ok': True, 'plan': plan}
