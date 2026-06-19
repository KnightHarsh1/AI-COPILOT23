import re
from pathlib import Path
from typing import Any, List

import pandas as pd

from app.services.ingestion.parsers import ParseError, RawTable

_NUMERIC_RE = re.compile(r'^[\s\u20b9$,.\-()]*\d[\d,.\-()\s]*$')
_MAX_HEADER_SCAN_ROWS = 15


def _looks_numeric(value: Any) -> bool:
    return bool(_NUMERIC_RE.match(str(value)))


def _detect_header_row(raw_rows: List[List[Any]], max_scan: int = _MAX_HEADER_SCAN_ROWS) -> int:
    """Indian bank/Tally/GST exports very commonly have one or more
    title/preamble rows before the real header row (e.g. a company name
    or report title in cell A1). Assuming row 0 is always the header
    breaks on exactly these real-world files, so instead: score each of
    the first `max_scan` rows by how many non-empty, non-numeric-looking
    cells it has, and pick the highest-scoring row. A real header row
    (mostly short text labels, one per column) reliably outscores a
    title row (one cell filled) or a data row (many numeric cells).
    """
    best_idx = 0
    best_score = -1

    for idx, row in enumerate(raw_rows[:max_scan]):
        non_null = [c for c in row if c is not None and str(c).strip() != '']
        if not non_null:
            continue
        text_like = [c for c in non_null if not _looks_numeric(c)]
        score = len(non_null) + len(text_like)
        if score > best_score:
            best_score = score
            best_idx = idx

    return best_idx


class XLSXParser:
    """One RawTable per non-empty sheet. Header-row detection handles
    the common case of preamble rows before the real header."""

    def parse(self, file_path: Path) -> List[RawTable]:
        try:
            sheets = pd.read_excel(file_path, sheet_name=None, header=None)
        except Exception as exc:
            raise ParseError(f"Could not read XLSX file: {exc}") from exc

        tables: List[RawTable] = []

        for sheet_name, df in sheets.items():
            df = df.where(pd.notnull(df), None)
            raw_rows = df.values.tolist()

            if not raw_rows:
                continue

            header_idx = _detect_header_row(raw_rows)
            header_row = raw_rows[header_idx]
            data_rows = raw_rows[header_idx + 1:]

            headers = [str(cell).strip() if cell is not None else f"column_{i}" for i, cell in enumerate(header_row)]

            # Drop fully-empty data rows (common trailing blank rows in
            # exported workbooks).
            data_rows = [row for row in data_rows if any(c is not None and str(c).strip() != '' for c in row)]

            if not data_rows and header_idx == 0:
                # Likely an empty or non-data sheet (e.g. a notes tab) --
                # skip it rather than surfacing a useless empty table.
                continue

            tables.append(RawTable(
                headers=headers,
                rows=data_rows,
                sheet_name=str(sheet_name),
                metadata={'header_row_index': header_idx, 'skipped_preamble_rows': header_idx},
            ))

        if not tables:
            raise ParseError("No readable data found in any sheet of this workbook.")

        return tables
