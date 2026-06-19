"""Computes a 0-100 data quality score for a staged ingestion batch, plus
plain-language suggested fixes. Surfaced in the import wizard so an SME
owner knows how clean their file is before committing.
"""

from sqlalchemy.orm import Session

from app.db.models.ingestion import IngestionBatch, StagingRow


class DataQualityService:
    def __init__(self, session: Session):
        self.session = session

    def score_batch(self, batch: IngestionBatch, missing_required=None) -> dict:
        rows = self.session.query(StagingRow).filter(StagingRow.batch_id == batch.id).all()
        total = len(rows)
        if total == 0:
            return {'score': 0, 'grade': 'No data', 'total_rows': 0, 'issues': [], 'suggestions': []}

        valid = sum(1 for r in rows if r.validation_status == 'valid')
        warnings = sum(1 for r in rows if r.validation_status == 'warning')
        errors = sum(1 for r in rows if r.validation_status == 'error')

        # Score: valid rows full credit, warnings half, errors none.
        score = round((valid + warnings * 0.5) / total * 100, 1)

        # Penalize unmapped required fields directly — they block a clean import.
        missing_required = missing_required or []
        if missing_required:
            score = max(0.0, score - len(missing_required) * 10)

        if score >= 90:
            grade = 'Excellent'
        elif score >= 75:
            grade = 'Good'
        elif score >= 50:
            grade = 'Needs attention'
        else:
            grade = 'Poor'

        issues = []
        if errors:
            issues.append({'type': 'errors', 'count': errors,
                           'message': f'{errors} row(s) have errors and will be skipped on import.'})
        if warnings:
            issues.append({'type': 'warnings', 'count': warnings,
                           'message': f'{warnings} row(s) have minor issues but will still import.'})
        if missing_required:
            issues.append({'type': 'missing_fields', 'count': len(missing_required),
                           'message': f'Required field(s) not mapped: {", ".join(missing_required)}.'})

        suggestions = []
        if missing_required:
            suggestions.append('Map the required fields highlighted above before importing.')
        if errors:
            suggestions.append('Open the preview to see which rows have errors — usually bad dates or amounts.')
        if errors and total and errors / total > 0.3:
            suggestions.append('A large share of rows failed — check the file has a clean header row and consistent date format.')
        if not suggestions:
            suggestions.append('Your file looks clean and is ready to import.')

        return {
            'score': score,
            'grade': grade,
            'total_rows': total,
            'valid_rows': valid,
            'warning_rows': warnings,
            'error_rows': errors,
            'issues': issues,
            'suggestions': suggestions,
        }
