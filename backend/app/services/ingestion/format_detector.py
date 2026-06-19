"""Detects what kind of document was uploaded, from its headers and
filename alone -- before any column mapping happens. This has to work
on RAW, un-mapped headers ("Invoice Date", "Sale Value", ...), which is
why it can't just check for exact canonical column names the way
upload.py's sales-vs-expense check does today.

Detection is a chain of regex signatures, most distinctive first, so a
generic word like "amount" appearing in several document types doesn't
cause false positives. This is inherently a heuristic, best-effort
classifier -- real-world exports vary, which is exactly why a human
confirms the result before anything commits (see the pipeline diagram
in UNIVERSAL_INGESTION_ARCHITECTURE.md).
"""

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Pattern

from app.services.ingestion.parsers import RawTable


@dataclass
class DetectionResult:
    document_type: str
    confidence: float  # 0-100
    matched_signals: List[str] = field(default_factory=list)


@dataclass
class _Signature:
    document_type: str
    header_patterns: List[Pattern]
    filename_patterns: List[Pattern] = field(default_factory=list)
    min_matches: int = 1


def _compiled(*patterns: str) -> List[Pattern]:
    return [re.compile(p, re.IGNORECASE) for p in patterns]


# Ordered most-distinctive-first. The first signature that meets its
# min_matches threshold wins -- this is deliberately a priority chain,
# not a "highest score across all" comparison, so a GST export (which
# will also incidentally match some "amount"-like sales signals) is
# still correctly classified as GST rather than sales.
_SIGNATURES: List[_Signature] = [
    _Signature(
        document_type='gst_report',
        header_patterns=_compiled(r'gstin', r'\bhsn\b', r'\bsac\b', r'taxable value', r'gstr'),
        filename_patterns=_compiled(r'gstr', r'\bgst\b'),
        min_matches=1,
    ),
    _Signature(
        document_type='tally_export',
        header_patterns=_compiled(r'voucher type', r'voucher no', r'ledger name', r'ledger'),
        filename_patterns=_compiled(r'tally', r'daybook', r'day book'),
        min_matches=1,
    ),
    _Signature(
        document_type='balance_sheet',
        header_patterns=_compiled(r'sundry debtors', r'sundry creditors', r'share capital', r'fixed assets'),
        filename_patterns=_compiled(r'balance.?sheet'),
        min_matches=1,
    ),
    _Signature(
        document_type='profit_and_loss',
        header_patterns=_compiled(r'gross profit', r'net profit', r'cost of goods sold', r'\bcogs\b', r'operating expenses'),
        filename_patterns=_compiled(r'profit.?(and|&)?.?loss', r'\bp\s?&\s?l\b'),
        min_matches=1,
    ),
    _Signature(
        document_type='bank_statement',
        header_patterns=_compiled(r'withdrawal', r'deposit', r'closing balance', r'value date'),
        filename_patterns=_compiled(r'bank.?statement', r'account.?statement'),
        min_matches=2,
    ),
    _Signature(
        document_type='inventory',
        header_patterns=_compiled(r'\bsku\b', r'reorder level', r'stock quantity', r'closing stock', r'godown'),
        min_matches=1,
    ),
    _Signature(
        document_type='expense',
        header_patterns=_compiled(r'vendor', r'supplier', r'payee', r'incurred date', r'paid to'),
        min_matches=1,
    ),
    _Signature(
        document_type='sales',
        header_patterns=_compiled(r'invoice date', r'invoice no', r'sale date', r'sale value', r'bill date'),
        min_matches=1,
    ),
    _Signature(
        document_type='customer',
        header_patterns=_compiled(r'customer name', r'client name', r'email', r'phone'),
        min_matches=2,
    ),
]


class FormatDetectorService:
    def detect(self, table: RawTable, filename: str, exclude_types: Optional[set] = None) -> DetectionResult:
        exclude_types = exclude_types or set()
        hint = table.metadata.get('document_type_hint')
        if hint:
            return DetectionResult(document_type=hint, confidence=95.0, matched_signals=['parser_hint'])

        header_text = ' '.join(str(h) for h in table.headers)
        name = Path(filename).stem

        for sig in _SIGNATURES:
            if sig.document_type in exclude_types:
                continue
            matched = [p.pattern for p in sig.header_patterns if p.search(header_text)]
            matched += [p.pattern for p in sig.filename_patterns if p.search(name)]

            if len(matched) >= sig.min_matches:
                total_possible = len(sig.header_patterns) + len(sig.filename_patterns)
                confidence = min(100.0, 50.0 + (len(matched) / max(total_possible, 1)) * 50.0)
                return DetectionResult(
                    document_type=sig.document_type,
                    confidence=round(confidence, 2),
                    matched_signals=matched,
                )

        return DetectionResult(document_type='unknown', confidence=0.0, matched_signals=[])

    def detect_all_sheets(self, tables: List[RawTable], filename: str) -> List[DetectionResult]:
        """For multi-sheet workbooks, detect each sheet independently --
        a GST export might have a summary sheet and a line-items sheet
        that should be classified separately."""
        return [self.detect(table, filename) for table in tables]
