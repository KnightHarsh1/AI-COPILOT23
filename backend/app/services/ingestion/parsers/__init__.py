"""Shared parser interface.

Every format-specific parser (CSV, XLSX, Tally, GST, bank statement,
balance sheet, P&L) implements `parse()` and returns a list of
`RawTable` -- one per relevant sheet, since multi-sheet workbooks are
common in Tally and GST exports and the relevant data isn't always on
the first sheet.

Parsers never write to the database and never know about canonical
field names -- that's ColumnMappingService's and NormalizationService's
job. A parser's only responsibility is: "here are the headers and rows
I found, as literally as possible."
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, List, Optional, Protocol


@dataclass
class RawTable:
    headers: List[str]
    rows: List[List[Any]]
    sheet_name: Optional[str] = None
    # Free-form hints a parser can leave for FormatDetectorService or
    # ColumnMappingService, e.g. {"header_row_index": 3} when a parser
    # had to skip preamble rows before finding the real header row.
    #
    # One key has a reserved meaning: metadata["document_type_hint"].
    # A parser that already knows its output's document type with
    # certainty (e.g. TallyXMLParser splitting vouchers by voucher
    # type before this table is even built) sets this to skip
    # FormatDetectorService's header-keyword guessing entirely, since
    # that guessing is for tables where the type genuinely isn't known
    # yet -- it would be the wrong tool once a parser already knows.
    metadata: dict = field(default_factory=dict)

    def as_dict_rows(self) -> List[dict]:
        return [dict(zip(self.headers, row)) for row in self.rows]


class BaseParser(Protocol):
    def parse(self, file_path: Path) -> List[RawTable]:
        ...


class RefinementParser(Protocol):
    """Operates on an already-parsed RawTable to apply format-specific
    cleanup that requires knowing the document type -- e.g. stripping a
    bank statement's non-transaction summary rows, or skipping a
    balance sheet's subtotal rows so they aren't double-counted as line
    items. Applied after generic parsing AND detection, never before --
    see orchestrator_service.py's two-stage analyze() flow.
    """
    def refine(self, table: RawTable) -> RawTable:
        ...


class ParseError(Exception):
    """Raised when a parser cannot make sense of a file at all (not to
    be confused with row-level validation issues, which are the
    ValidationService's job and don't stop the whole batch)."""
