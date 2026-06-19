"""Refines an already-parsed, already-detected bank_statement RawTable.

Bank statement exports commonly include non-transaction rows mixed in
with real transactions: an "Opening Balance" row at the top, a "Closing
Balance" / "Statement Summary" row at the bottom, occasional blank
separator rows. None of these are transactions and would otherwise
become garbage staging rows (a label with no real date/amount), so
they're stripped here before column mapping ever sees them.
"""

import re
from typing import List, Optional

from app.services.ingestion.parsers import RawTable

_NON_TRANSACTION_PATTERNS = [
    re.compile(r'^\s*opening\s*balance', re.IGNORECASE),
    re.compile(r'^\s*closing\s*balance', re.IGNORECASE),
    re.compile(r'^\s*statement\s*summary', re.IGNORECASE),
    re.compile(r'^\s*total\b', re.IGNORECASE),
]


def _find_narration_column(headers: List[str]) -> Optional[int]:
    candidates = ['description', 'narration', 'particulars', 'details', 'remarks']
    for idx, header in enumerate(headers):
        if str(header).strip().lower() in candidates:
            return idx
    return None


class BankStatementParser:
    def refine(self, table: RawTable) -> RawTable:
        narration_idx = _find_narration_column(table.headers)

        if narration_idx is None:
            # No recognizable narration column to filter on -- nothing
            # safe to strip, pass the table through unchanged rather
            # than guessing.
            return table

        kept_rows = []
        dropped = 0

        for row in table.rows:
            narration = str(row[narration_idx]) if narration_idx < len(row) and row[narration_idx] is not None else ''
            non_null_count = sum(1 for c in row if c is not None and str(c).strip() != '')

            is_summary_row = any(p.match(narration) for p in _NON_TRANSACTION_PATTERNS)
            is_sparse_row = non_null_count <= 2  # a bare balance figure with little else

            if is_summary_row or is_sparse_row:
                dropped += 1
                continue

            kept_rows.append(row)

        metadata = dict(table.metadata)
        metadata['bank_statement_rows_dropped'] = dropped

        return RawTable(headers=table.headers, rows=kept_rows, sheet_name=table.sheet_name, metadata=metadata)
