from datetime import date
from app.db.models.sale import Sale
from app.services.insight_support_service import DataCoverageService


def test_coverage_reflects_data(session, company):
    cov = DataCoverageService(session).coverage(company.id)
    assert cov['coverage_score'] == 0
    session.add(Sale(company_id=company.id, invoice_date=date.today(), amount=100, category='X'))
    session.commit()
    cov2 = DataCoverageService(session).coverage(company.id)
    assert cov2['coverage_score'] > 0
