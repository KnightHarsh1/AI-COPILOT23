"""Shared refinement logic for balance sheet and P&L statements.

Both formats share the same structural quirk: hierarchical line items
where section-header rows (e.g. "CURRENT ASSETS" with no figure next to
it) and subtotal rows (e.g. "Total Current Assets") are mixed in among
the real leaf line items. Both need to be skipped, or the subtotal
would be double-counted alongside the items that sum to it, and a
section header with no amount would just be a useless staging row.
"""

import re
from typing import List, Optional, Tuple

from app.services.ingestion.parsers import RawTable

_TOTAL_PREFIX_RE = re.compile(r'^\s*(total|grand total|sub.?total)\b', re.IGNORECASE)
_NUMERIC_RE = re.compile(r'^[\s\u20b9$,.\-()]*\d[\d,.\-()\s]*$')


def _looks_numeric(value) -> bool:
    return value is not None and bool(_NUMERIC_RE.match(str(value)))


def _guess_label_and_amount_columns(headers: List[str], rows: List[list]) -> Tuple[Optional[int], Optional[int]]:
    """Looks for header names matching the canonical line_label/amount
    synonyms first; falls back to picking whichever column is mostly
    text (label) and whichever is mostly numeric (amount) across a
    sample of rows, if the header names themselves aren't recognizable.
    """
    label_synonyms = {'particulars', 'account', 'account name', 'description', 'head of account'}
    amount_synonyms = {'amount', 'value', 'balance', 'total'}

    label_idx, amount_idx = None, None
    for idx, header in enumerate(headers):
        normalized = str(header).strip().lower()
        if label_idx is None and normalized in label_synonyms:
            label_idx = idx
        if amount_idx is None and normalized in amount_synonyms:
            amount_idx = idx

    if label_idx is not None and amount_idx is not None:
        return label_idx, amount_idx

    # Fallback: score each column by text-ness vs numeric-ness across a sample.
    sample = rows[:30]
    if not sample:
        return label_idx, amount_idx

    text_scores = [0] * len(headers)
    numeric_scores = [0] * len(headers)
    for row in sample:
        for idx in range(len(headers)):
            if idx >= len(row) or row[idx] is None:
                continue
            if _looks_numeric(row[idx]):
                numeric_scores[idx] += 1
            else:
                text_scores[idx] += 1

    if label_idx is None and text_scores:
        label_idx = max(range(len(headers)), key=lambda i: text_scores[i])
    if amount_idx is None and numeric_scores:
        amount_idx = max(range(len(headers)), key=lambda i: numeric_scores[i])

    return label_idx, amount_idx


def refine_statement_table(table: RawTable) -> RawTable:
    label_idx, amount_idx = _guess_label_and_amount_columns(table.headers, table.rows)

    if label_idx is None or amount_idx is None:
        return table

    kept_rows = []
    skipped_section_headers = 0
    skipped_subtotals = 0

    for row in table.rows:
        label = str(row[label_idx]).strip() if label_idx < len(row) and row[label_idx] is not None else ''
        amount = row[amount_idx] if amount_idx < len(row) else None

        if not label:
            continue

        if amount is None or str(amount).strip() == '':
            skipped_section_headers += 1
            continue

        if _TOTAL_PREFIX_RE.match(label):
            skipped_subtotals += 1
            continue

        kept_rows.append(row)

    metadata = dict(table.metadata)
    metadata['statement_section_headers_skipped'] = skipped_section_headers
    metadata['statement_subtotals_skipped'] = skipped_subtotals

    return RawTable(headers=table.headers, rows=kept_rows, sheet_name=table.sheet_name, metadata=metadata)
