"""The only class the API layer calls directly. Ties together format
detection, parsing, mapping suggestion, staging, and (on confirm)
normalization -- in that order, matching the pipeline diagram in
UNIVERSAL_INGESTION_ARCHITECTURE.md.

Known simplification, documented rather than hidden: when a workbook has
multiple sheets with data, this picks the single highest-confidence
sheet and creates one batch for it. Handling multiple independently
relevant sheets from one upload (e.g. a GST export with both a summary
and a line-items sheet) as separate batches is a reasonable follow-up,
not built here.
"""

from pathlib import Path
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models.ingestion import IngestionBatch
from app.schemas.ingestion import (
    AnalyzeResponse,
    BatchStatusResponse,
    ColumnSuggestion as ColumnSuggestionSchema,
    IngestionCommitResult,
    PreviewRow,
)
from app.services.alert_service import AlertService
from app.services.gemini_service import GeminiService
from app.services.recommendation_service import RecommendationService
from app.services.ingestion.canonical_field_dictionary import required_fields_for
from app.services.ingestion.column_mapping_service import ColumnMappingService
from app.services.ingestion.format_detector import FormatDetectorService
from app.services.ingestion.mapping_memory_service import MappingMemoryService, compute_signature_hash
from app.services.ingestion.normalization_service import NormalizationService
from app.services.ingestion.parsers.csv_parser import CSVParser
from app.services.ingestion.parsers.xlsx_parser import XLSXParser
from app.services.ingestion.parsers.tally_xml_parser import TallyXMLParser
from app.services.ingestion.parsers.tally_excel_parser import TallyExcelParser
from app.services.ingestion.parsers.gst_report_parser import GSTReportParser
from app.services.ingestion.parsers.bank_statement_parser import BankStatementParser
from app.services.ingestion.parsers.balance_sheet_parser import BalanceSheetParser
from app.services.ingestion.parsers.profit_and_loss_parser import ProfitAndLossParser
from app.services.ingestion.parsers.pdf_parser import PDFParser
from app.services.ingestion.parsers.image_parser import ImageParser
from app.services.ingestion.parsers import ParseError, RawTable
from app.services.ingestion.staging_service import StagingService

_PARSERS_BY_EXTENSION = {
    '.csv': CSVParser(),
    '.xlsx': XLSXParser(),
    '.xls': XLSXParser(),
    '.xml': TallyXMLParser(),
    '.pdf': PDFParser(),
    '.png': ImageParser(),
    '.jpg': ImageParser(),
    '.jpeg': ImageParser(),
}

# Applied after generic parsing AND initial detection -- these refine
# an already-detected table (e.g. stripping a bank statement's summary
# rows) rather than parsing from scratch. tally_export and gst_report
# are "generic, needs another look" buckets with no NormalizationService
# handler of their own -- after refining, detection runs a second time
# excluding those buckets so e.g. a Tally Excel sales register can be
# reclassified as plain 'sales' once its headers are cleaned up. If it
# still doesn't match anything specific, it honestly falls to
# 'unknown' rather than silently failing later at confirm time.
_REFINEMENT_PARSERS_BY_TYPE = {
    'bank_statement': BankStatementParser(),
    'balance_sheet': BalanceSheetParser(),
    'profit_and_loss': ProfitAndLossParser(),
    'gst_report': GSTReportParser(),
    'tally_export': TallyExcelParser(),
}
_RECLASSIFY_AFTER_REFINEMENT = {'tally_export', 'gst_report'}


class IngestionOrchestratorService:
    def __init__(self, session: Session):
        self.session = session
        self.detector = FormatDetectorService()
        self.staging = StagingService(session)
        self.mapping_memory = MappingMemoryService(session)
        self.column_mapper = ColumnMappingService(session, gemini_service=GeminiService())
        self.normalizer = NormalizationService(session)

    def analyze(self, file_path: Path, filename: str, company_id: UUID, file_id: UUID) -> AnalyzeResponse:
        extension = file_path.suffix.lower()
        parser = _PARSERS_BY_EXTENSION.get(extension)
        if parser is None:
            raise ParseError(f"Unsupported file extension '{extension}'.")

        tables = parser.parse(file_path)
        table, detection = self._pick_best_table(tables, filename)
        table, detection = self._apply_refinement(table, detection, filename)

        # Multi-sheet workbooks (like the test data file with Sales/Expenses/
        # Inventory/Customers tabs) previously imported only the single
        # highest-confidence sheet. Auto-commit every OTHER confidently
        # detected sheet now, so one upload populates every section instead
        # of silently dropping 3 of 4 sheets.
        self._auto_commit_secondary_sheets(tables, table, filename, company_id, file_id)

        batch = self.staging.create_batch(
            company_id=company_id,
            file_id=file_id,
            document_type=detection.document_type,
            confidence=detection.confidence,
            sheet_name=table.sheet_name,
        )

        # Map columns. When detection was unknown/low-confidence, this also
        # infers the document type from which fields the columns map to, so
        # a plain business spreadsheet still gets auto-mapped instead of
        # showing 0/N.
        suggestions, inferred_type, inferred_confidence = self.column_mapper.suggest_with_inference(
            table, detection.document_type, detection.confidence, company_id
        )

        # If inference upgraded an unknown/low-confidence detection, adopt it.
        if inferred_type != detection.document_type or inferred_confidence != detection.confidence:
            batch.document_type = inferred_type
            batch.detection_confidence = inferred_confidence
            self.session.commit()
            effective_type = inferred_type
            effective_confidence = inferred_confidence
        else:
            effective_type = detection.document_type
            effective_confidence = detection.confidence

        mapping = {s.source_column: s.suggested_field for s in suggestions}

        self.staging.write_rows(batch, table, mapping)

        matched_template = self.mapping_memory.find_cached_mapping(
            company_id, compute_signature_hash(table.headers)
        )

        return AnalyzeResponse(
            batch_id=batch.id,
            document_type=effective_type,
            detection_confidence=effective_confidence,
            sheet_name=table.sheet_name,
            status=batch.status,
            suggested_mapping=[
                ColumnSuggestionSchema(
                    source_column=s.source_column,
                    sample_values=s.sample_values,
                    suggested_field=s.suggested_field,
                    confidence=s.confidence,
                    source=s.source,
                )
                for s in suggestions
            ],
            preview_rows=[
                PreviewRow(
                    row_index=row.row_index,
                    raw_data=row.raw_data,
                    mapped_data=row.mapped_data or {},
                    validation_status=row.validation_status,
                    validation_messages=[m.get('message', str(m)) if isinstance(m, dict) else str(m) for m in (row.validation_messages or [])],
                )
                for row in self.staging.get_preview(batch)
            ],
            required_fields_missing=self.staging.missing_required_fields(batch, mapping),
            matched_template_id=matched_template.id if matched_template else None,
            data_quality=self._quality(batch, self.staging.missing_required_fields(batch, mapping)),
        )

    def _pick_best_table(self, tables: List[RawTable], filename: str):
        detections = self.detector.detect_all_sheets(tables, filename)
        ranked = sorted(zip(tables, detections), key=lambda pair: pair[1].confidence, reverse=True)
        return ranked[0]

    def _auto_commit_secondary_sheets(self, tables, primary_table, filename, company_id, file_id):
        """For a multi-sheet workbook, stage+map+commit every sheet other
        than the primary one (which goes through the interactive wizard).
        Each is committed independently and best-effort -- a failure on one
        sheet never blocks the others or the primary import."""
        if len(tables) <= 1:
            return
        for tbl in tables:
            if tbl is primary_table:
                continue
            try:
                det = self.detector.detect(tbl, filename)
                tbl2, det = self._apply_refinement(tbl, det, filename)
                b = self.staging.create_batch(
                    company_id=company_id, file_id=file_id,
                    document_type=det.document_type, confidence=det.confidence,
                    sheet_name=tbl2.sheet_name,
                )
                suggestions, inferred_type, inferred_conf = self.column_mapper.suggest_with_inference(
                    tbl2, det.document_type, det.confidence, company_id
                )
                if inferred_type != det.document_type:
                    b.document_type = inferred_type
                    b.detection_confidence = inferred_conf
                    self.session.commit()
                mapping = {s.source_column: s.suggested_field for s in suggestions}
                self.staging.write_rows(b, tbl2, mapping)
                self.normalizer.commit_batch(b)
            except Exception:
                self.session.rollback()
                continue
        # Refresh insights once after all secondary sheets land.
        try:
            from app.services.health_score import HealthScoreService
            from app.services.alert_service import AlertService
            from app.services.recommendation_service import RecommendationService
            HealthScoreService(self.session).calculate_health_score(company_id)
            AlertService(self.session).generate_alerts(company_id)
        except Exception:
            pass

    def _apply_refinement(self, table: RawTable, detection, filename: str):
        refiner = _REFINEMENT_PARSERS_BY_TYPE.get(detection.document_type)
        if refiner is None:
            return table, detection

        refined_table = refiner.refine(table)

        if detection.document_type in _RECLASSIFY_AFTER_REFINEMENT:
            new_detection = self.detector.detect(
                refined_table, filename, exclude_types=_RECLASSIFY_AFTER_REFINEMENT
            )
            return refined_table, new_detection

        return refined_table, detection

    def update_mapping(self, batch: IngestionBatch, mapping: Dict[str, Optional[str]]):
        self.staging.update_row_mapping(batch, mapping)
        missing = self.staging.missing_required_fields(batch, mapping)
        preview = self.staging.get_preview(batch)
        return preview, missing

    def _quality(self, batch: IngestionBatch, missing):
        try:
            from app.services.data_quality_service import DataQualityService
            return DataQualityService(self.session).score_batch(batch, missing_required=missing)
        except Exception:
            return None

    def confirm(
        self,
        batch: IngestionBatch,
        current_user,
        final_mapping: Dict[str, Optional[str]],
        save_mapping: bool = True,
        statement_date=None,
        bank_name: Optional[str] = None,
        bank_account_last4: Optional[str] = None,
    ) -> IngestionCommitResult:
        # Re-apply the mapping once more so any edit made right up to the
        # confirm click is reflected, then commit from that final state.
        self.staging.update_row_mapping(batch, final_mapping)

        result = self.normalizer.commit_batch(
            batch,
            statement_date=statement_date,
            bank_name=bank_name,
            bank_account_last4=bank_account_last4,
        )

        batch.confirmed_by_id = current_user.id
        self.session.commit()

        if save_mapping:
            self.mapping_memory.save_mapping(
                company_id=batch.company_id,
                document_type=batch.document_type,
                headers=list(final_mapping.keys()),
                mapping=final_mapping,
                confidence=float(batch.detection_confidence or 0),
                created_by_id=current_user.id,
            )

        # Post-import refresh pipeline. Each step is independently guarded so
        # one failure can't silently block the rest, and the stale-clearing
        # inside each service commits regardless -- so the Action Center never
        # shows alerts/recs that don't match the just-imported data.
        from app.services.health_score import HealthScoreService
        from app.services.upload_freshness_service import UploadFreshnessService

        try:
            HealthScoreService(self.session).calculate_health_score(batch.company_id)
        except Exception:
            pass
        try:
            AlertService(self.session).generate_alerts(batch.company_id)
        except Exception:
            pass
        try:
            RecommendationService(self.session).generate_recommendations(
                company_id=batch.company_id,
                generated_by_id=current_user.id,
            )
        except Exception:
            pass
        try:
            UploadFreshnessService(self.session).touch(batch.company_id)
        except Exception:
            pass
        try:
            from app.services.notification_dispatcher import NotificationDispatcher
            from app.services.insight_support_service import AuditService
            AuditService(self.session).log(batch.company_id, 'import',
                                           f'Imported {batch.document_type} data', user_id=current_user.id)
            NotificationDispatcher(self.session).run_daily_checks(batch.company_id)
        except Exception:
            pass

        return result

    def get_batch_status(self, batch: IngestionBatch) -> BatchStatusResponse:
        return BatchStatusResponse.model_validate(batch)
