"""Parses Tally ERP 9 / TallyPrime XML exports (the "Daybook" or voucher
export format).

IMPORTANT, stated plainly rather than buried: this was built against the
*publicly documented* structure of Tally's XML export (<VOUCHER> elements
under <TALLYMESSAGE>, with DATE/VOUCHERTYPENAME/PARTYLEDGERNAME/AMOUNT
fields) -- not against a real sample file, because none was available
during this build. Tally ERP 9 and TallyPrime are known to differ in
some XML details, and individual company configurations can add more.
Treat this parser as structurally reasonable, not field-validated.
Real Tally XML samples should be the first thing tested against it.

Design choices made to absorb that uncertainty rather than be brittle
to it:
  - Uses `.//VOUCHER` (search-anywhere), not a fixed path, so the exact
    ENVELOPE/BODY/IMPORTDATA/REQUESTDATA/TALLYMESSAGE nesting depth
    (which does vary) doesn't matter.
  - Reads fields by tag name wherever they appear under a <VOUCHER>,
    rather than assuming a fixed child order.
  - Splits vouchers by VOUCHERTYPENAME into separate tables (Sales,
    Purchase are mapped to canonical sales/expense document types via
    document_type_hint; everything else -- Payment, Receipt, Journal,
    Contra -- is left as a generic, undetected table for now rather
    than guessed at, since misclassifying a cash movement as a sale
    would be a worse failure mode than asking the user to classify it).
"""

import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from app.services.ingestion.parsers import ParseError, RawTable

_VOUCHER_TYPE_TO_DOCUMENT_TYPE = {
    'sales': 'sales',
    'sale': 'sales',
    'purchase': 'expense',
}


def _find_text(voucher: ET.Element, *tag_names: str) -> Optional[str]:
    for tag in tag_names:
        el = voucher.find(f'.//{tag}')
        if el is not None and el.text:
            return el.text.strip()
    return None


def _parse_tally_date(raw: Optional[str]) -> Optional[str]:
    """Tally typically exports dates as YYYYMMDD with no separators."""
    if not raw:
        return None
    raw = raw.strip()
    try:
        return datetime.strptime(raw, '%Y%m%d').strftime('%d-%m-%Y')
    except ValueError:
        return raw  # Pass through as-is; ValidationService's coerce_date has its own fallback.


def _voucher_amount(voucher: ET.Element) -> Optional[str]:
    """Takes the largest absolute ledger-entry amount under this
    voucher, not a sum. In Tally's double-entry convention, a simple
    2-entry voucher (party + sales/purchase ledger) has both legs at
    the same absolute value, so the max is that value. In a voucher
    with a GST split (party + sales + tax ledgers, 3+ entries), the
    party's leg is the full invoice total while the others are parts
    of it, so the max still correctly picks out the total rather than
    a partial line. This is a heuristic absent a real sample file to
    confirm against -- flagged accordingly."""
    amounts = []
    for amount_el in voucher.findall('.//AMOUNT'):
        if amount_el.text:
            try:
                amounts.append(abs(float(amount_el.text.strip())))
            except ValueError:
                continue
    return str(max(amounts)) if amounts else None


class TallyXMLParser:
    def parse(self, file_path: Path) -> List[RawTable]:
        try:
            tree = ET.parse(file_path)
        except ET.ParseError as exc:
            raise ParseError(f"Could not parse this as XML: {exc}") from exc

        root = tree.getroot()
        vouchers = root.findall('.//VOUCHER')

        if not vouchers:
            raise ParseError(
                "No <VOUCHER> elements found. This may not be a Tally voucher/daybook "
                "export, or it may use a Tally XML structure this parser doesn't yet recognize."
            )

        rows_by_type: Dict[str, List[list]] = {}

        for voucher in vouchers:
            voucher_type = (_find_text(voucher, 'VOUCHERTYPENAME') or 'unknown').strip().lower()
            tally_date = _parse_tally_date(_find_text(voucher, 'DATE'))
            party = _find_text(voucher, 'PARTYLEDGERNAME', 'PARTYNAME')
            amount = _voucher_amount(voucher)
            narration = _find_text(voucher, 'NARRATION')
            voucher_number = _find_text(voucher, 'VOUCHERNUMBER')

            rows_by_type.setdefault(voucher_type, []).append(
                [tally_date, party, amount, narration, voucher_number]
            )

        headers = ['Date', 'Party Name', 'Amount', 'Narration', 'Voucher Number']
        tables = []

        for voucher_type, rows in rows_by_type.items():
            hint = _VOUCHER_TYPE_TO_DOCUMENT_TYPE.get(voucher_type)
            tables.append(RawTable(
                headers=headers,
                rows=rows,
                sheet_name=voucher_type.title(),
                metadata={'document_type_hint': hint} if hint else {},
            ))

        return tables
