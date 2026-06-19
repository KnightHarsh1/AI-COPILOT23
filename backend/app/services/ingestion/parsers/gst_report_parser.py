"""Refines an already-detected gst_report RawTable.

GST portal exports (GSTR-1, GSTR-3B) commonly pack multiple sections
into one sheet -- a B2B invoices section, then a B2C section, each
introduced by its own header row. XLSXParser's generic header detection
only finds the *first* header, so any later section's repeated header
row ends up as a stray "data" row mixed into the table -- a row whose
cells are mostly column-name-like text rather than real data.

Without a real GSTR export to validate against, this is intentionally
scoped to the one sub-problem that's safe to solve generically: detect
and drop rows that closely match the table's own header (a repeated
header row), rather than attempting to fully re-segment multiple
differently-shaped sections, which would need real samples to get
right.
"""

from typing import List

from app.services.ingestion.parsers import RawTable


def _row_matches_header(row: list, headers: List[str]) -> bool:
    if not row:
        return False
    normalized_headers = {str(h).strip().lower() for h in headers}
    matches = sum(
        1 for cell in row
        if cell is not None and str(cell).strip().lower() in normalized_headers
    )
    # More than half the row's non-null cells echoing actual header
    # names is a strong signal this is a repeated header, not data.
    non_null = sum(1 for c in row if c is not None and str(c).strip() != '')
    return non_null > 0 and matches / non_null > 0.5


class GSTReportParser:
    def refine(self, table: RawTable) -> RawTable:
        kept_rows = []
        dropped = 0

        for row in table.rows:
            if _row_matches_header(row, table.headers):
                dropped += 1
                continue
            kept_rows.append(row)

        metadata = dict(table.metadata)
        metadata['gst_repeated_header_rows_dropped'] = dropped

        return RawTable(headers=table.headers, rows=kept_rows, sheet_name=table.sheet_name, metadata=metadata)
