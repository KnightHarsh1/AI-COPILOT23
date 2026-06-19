"""Refines an already-detected tally_export RawTable that arrived as
XLSX rather than the XML daybook format (see tally_xml_parser.py for
that one).

Tally's Excel export commonly uses a two-row header: a parent row like
"Particulars | Amount" where "Amount" visually spans two merged
columns, then a second row underneath with "Debit | Credit" as the
actual sub-column labels. XLSXParser's generic single-row header
detection picks up the parent row, leaving the Debit/Credit row as a
confusing first "data" row. This merges the two into single column
names ("Amount Debit", "Amount Credit") when it detects that pattern.

Like the other Phase 5 parsers, this was built from Tally's documented
export conventions, not a real sample file -- flagged accordingly.
"""

from typing import List

from app.services.ingestion.parsers import RawTable

_SUB_HEADER_TOKENS = {'debit', 'credit', 'dr', 'cr'}


def _looks_like_sub_header_row(row: list) -> bool:
    non_null = [str(c).strip().lower() for c in row if c is not None and str(c).strip() != '']
    if not non_null:
        return False
    matches = sum(1 for c in non_null if c in _SUB_HEADER_TOKENS)
    return matches >= 1 and matches / len(non_null) >= 0.5


def _merge_headers(parent_headers: List[str], sub_row: list) -> List[str]:
    merged = []
    for idx, parent in enumerate(parent_headers):
        sub = sub_row[idx] if idx < len(sub_row) and sub_row[idx] is not None else None
        sub_text = str(sub).strip() if sub and str(sub).strip() else None
        merged.append(f"{parent} {sub_text}".strip() if sub_text else parent)
    return merged


class TallyExcelParser:
    def refine(self, table: RawTable) -> RawTable:
        if not table.rows:
            return table

        first_row = table.rows[0]
        if not _looks_like_sub_header_row(first_row):
            return table

        new_headers = _merge_headers(table.headers, first_row)
        metadata = dict(table.metadata)
        metadata['tally_excel_subheader_merged'] = True

        return RawTable(headers=new_headers, rows=table.rows[1:], sheet_name=table.sheet_name, metadata=metadata)
