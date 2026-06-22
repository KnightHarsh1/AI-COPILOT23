"""Manages the lifecycle of an import after it's committed: delete an import
(and every row it created), then trigger a full recalculation so KPIs, health
score, and all intelligence reflect the change with no orphaned data.

Committed rows link back to their source file via `source_file_id`; an
IngestionBatch links to that same file via `file_id`. Deleting by file_id
therefore removes exactly the rows that import created.
"""
from sqlalchemy.orm import Session

from app.db.models.ingestion import IngestionBatch, StagingRow
from app.db.models.sale import Sale
from app.db.models.expense import Expense
from app.db.models.bank_transaction import BankTransaction
from app.db.models.financial_statement import FinancialStatementLine


class ImportManagementService:
    def __init__(self, session: Session):
        self.session = session

    def _batch(self, company_id, batch_id):
        return (
            self.session.query(IngestionBatch)
            .filter(IngestionBatch.company_id == company_id, IngestionBatch.id == batch_id)
            .first()
        )

    def delete_import(self, company_id, batch_id) -> dict:
        """Delete an import batch and all records it created, then recalculate.
        Returns a summary of what was removed."""
        batch = self._batch(company_id, batch_id)
        if not batch:
            return {"deleted": False, "reason": "not_found"}

        file_id = batch.file_id
        removed = {"sales": 0, "expenses": 0, "bank_transactions": 0, "statements": 0}

        if file_id:
            removed["sales"] = (
                self.session.query(Sale)
                .filter(Sale.company_id == company_id, Sale.source_file_id == file_id)
                .delete(synchronize_session=False)
            )
            removed["expenses"] = (
                self.session.query(Expense)
                .filter(Expense.company_id == company_id, Expense.source_file_id == file_id)
                .delete(synchronize_session=False)
            )
            removed["bank_transactions"] = (
                self.session.query(BankTransaction)
                .filter(BankTransaction.company_id == company_id, BankTransaction.source_file_id == file_id)
                .delete(synchronize_session=False)
            )
            removed["statements"] = (
                self.session.query(FinancialStatementLine)
                .filter(FinancialStatementLine.company_id == company_id, FinancialStatementLine.source_file_id == file_id)
                .delete(synchronize_session=False)
            )

        # Remove staging rows + the batch record itself (cascade handles rows,
        # but delete explicitly to be safe across backends).
        self.session.query(StagingRow).filter(StagingRow.batch_id == batch.id).delete(synchronize_session=False)
        self.session.delete(batch)
        self.session.commit()

        self.recalculate(company_id)
        return {"deleted": True, "removed": removed}

    def recalculate(self, company_id) -> dict:
        """Full refresh pipeline after any data change. Recomputes KPIs/health
        (which persist Metric snapshots) and regenerates alerts +
        recommendations so the Command Center is never stale. Each step is
        guarded so one failure can't abort the rest."""
        steps = {}

        try:
            from app.services.kpi_engine import KPIService
            KPIService(self.session).calculate_kpis(company_id)
            steps["kpis"] = "ok"
        except Exception as exc:
            steps["kpis"] = f"skipped: {exc.__class__.__name__}"

        try:
            from app.services.health_score import HealthScoreService
            HealthScoreService(self.session).calculate_health_score(company_id)
            steps["health_score"] = "ok"
        except Exception as exc:
            steps["health_score"] = f"skipped: {exc.__class__.__name__}"

        try:
            from app.services.alert_service import AlertService
            AlertService(self.session).generate_alerts(company_id)
            steps["alerts"] = "ok"
        except Exception as exc:
            steps["alerts"] = f"skipped: {exc.__class__.__name__}"

        try:
            from app.services.recommendation_service import RecommendationService
            RecommendationService(self.session).generate_recommendations(company_id, None)
            steps["recommendations"] = "ok"
        except Exception as exc:
            steps["recommendations"] = f"skipped: {exc.__class__.__name__}"

        return {"recalculated": True, "steps": steps}
