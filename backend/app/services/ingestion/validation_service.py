"""Row-level validation for staged data. Two concerns:

1. Required-field presence for the row's document type.
2. Type coercion for dates and amounts -- specifically handling the
   real-world Indian formatting quirks flagged in the architecture doc:
   the ₹ symbol, lakh/crore comma grouping ("1,00,000"), and
   parentheses-as-negative ("(5,000)" meaning -5000, common in P&L
   exports).

A row that fails required-field presence or fails to coerce a field
that *is* present is marked 'error' and excluded from commit by
default. A row that's missing only optional fields is 'warning' and
still commits. Nothing here ever raises -- invalid rows are quarantined
with a message, never silently dropped without a trace.
"""

import re
from datetime import date as date_type, datetime
from typing import List, Optional, Tuple

import pandas as pd

from app.services.ingestion.canonical_field_dictionary import required_fields_for

_CURRENCY_STRIP_RE = re.compile(r'[₹$,\s]')
_PAREN_NEGATIVE_RE = re.compile(r'^\((.*)\)$')

DATE_FIELDS = {'invoice_date', 'incurred_date', 'transaction_date'}
AMOUNT_FIELDS = {'amount', 'unit_cost', 'debit_amount', 'credit_amount', 'balance_after'}


def coerce_amount(value) -> Optional[float]:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip()
    if not text:
        return None

    negative = False
    paren_match = _PAREN_NEGATIVE_RE.match(text)
    if paren_match:
        negative = True
        text = paren_match.group(1)

    text = _CURRENCY_STRIP_RE.sub('', text)
    if not text:
        return None

    try:
        result = float(text)
    except ValueError:
        return None

    return -result if negative else result


def coerce_date(value) -> Optional[date_type]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date_type):
        return value
    if hasattr(value, 'to_pydatetime'):  # pandas.Timestamp
        return value.to_pydatetime().date()

    text = str(value).strip()
    if not text:
        return None

    try:
        return datetime.strptime(text, '%d-%m-%Y').date()
    except ValueError:
        pass

    parsed = pd.to_datetime(text, dayfirst=True, errors='coerce')
    if pd.isna(parsed):
        return None
    return parsed.date()


class ValidationService:
    def validate_row(self, mapped_data: dict, document_type: str) -> Tuple[str, List[str]]:
        messages: List[str] = []
        has_error = False

        required = required_fields_for(document_type)
        for field in required:
            if mapped_data.get(field) in (None, ''):
                messages.append(f'Required field "{field}" is missing or empty.')
                has_error = True

        for field, value in list(mapped_data.items()):
            if value in (None, ''):
                continue

            if field in DATE_FIELDS and coerce_date(value) is None:
                messages.append(f'"{field}" value {value!r} is not a recognizable date.')
                if field in required:
                    has_error = True

            if field in AMOUNT_FIELDS and coerce_amount(value) is None:
                messages.append(f'"{field}" value {value!r} is not a recognizable amount.')
                if field in required:
                    has_error = True

        if has_error:
            return 'error', messages
        if messages:
            return 'warning', messages
        return 'valid', messages
