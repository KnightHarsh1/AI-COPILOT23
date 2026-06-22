"""Profiles a parsed table before import: row/column counts, per-column type
inference, missing-value %, duplicate rows, date-range detection, currency
detection, outlier flags, and unique customer/product counts.

Operates on the already-parsed RawTable (a sample of rows the parser loaded),
so it never re-reads the whole file and never holds large datasets. Pure
arithmetic + regex — no AI, fully deterministic and defensible.
"""

import re
from collections import Counter
from datetime import datetime

# Currency symbols / codes we recognise in cell values.
_CURRENCY_PATTERNS = [
    ("INR", re.compile(r"(₹|\bINR\b|\bRs\.?\b)", re.I)),
    ("USD", re.compile(r"(\$|\bUSD\b)")),
    ("EUR", re.compile(r"(€|\bEUR\b)")),
    ("GBP", re.compile(r"(£|\bGBP\b)")),
]

_DATE_FORMATS = ["%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d.%m.%Y", "%Y/%m/%d", "%d %b %Y", "%d %B %Y"]

_NUM_RE = re.compile(r"^-?[\d,]+(\.\d+)?$")


def _clean_num(v):
    if v is None:
        return None
    s = str(v).strip().replace(",", "")
    s = re.sub(r"[₹$€£]", "", s).replace("Rs.", "").replace("Rs", "").strip()
    if _NUM_RE.match(s.replace(",", "")) or re.match(r"^-?\d+(\.\d+)?$", s):
        try:
            return float(s)
        except ValueError:
            return None
    return None


def _try_date(v):
    if v is None:
        return None
    s = str(v).strip()
    if not s or len(s) < 6:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _infer_type(values):
    non_empty = [v for v in values if v is not None and str(v).strip() != ""]
    if not non_empty:
        return "empty"
    nums = sum(1 for v in non_empty if _clean_num(v) is not None)
    dates = sum(1 for v in non_empty if _try_date(v) is not None)
    n = len(non_empty)
    if dates >= n * 0.6:
        return "date"
    if nums >= n * 0.8:
        return "number"
    return "text"


class DataProfiler:
    def profile(self, table, mapping=None) -> dict:
        headers = list(table.headers)
        rows = table.rows
        total_rows = len(rows)
        col_count = len(headers)

        # Per-column analysis.
        columns = []
        total_cells = 0
        missing_cells = 0
        currency_votes = Counter()
        date_values = []

        for ci, header in enumerate(headers):
            col_vals = [(r[ci] if ci < len(r) else None) for r in rows]
            non_empty = [v for v in col_vals if v is not None and str(v).strip() != ""]
            missing = total_rows - len(non_empty)
            total_cells += total_rows
            missing_cells += missing
            ctype = _infer_type(col_vals)

            # currency detection from this column's values
            for v in non_empty[:50]:
                for code, pat in _CURRENCY_PATTERNS:
                    if pat.search(str(v)):
                        currency_votes[code] += 1
                        break

            if ctype == "date":
                for v in non_empty:
                    d = _try_date(v)
                    if d:
                        date_values.append(d)

            columns.append({
                "name": header,
                "type": ctype,
                "missing": missing,
                "missing_pct": round(missing / total_rows * 100, 1) if total_rows else 0.0,
                "unique": len(set(str(v).strip().lower() for v in non_empty)),
            })

        # Duplicate rows (exact match across all cells).
        seen = Counter(tuple((str(c).strip() if c is not None else "") for c in r) for r in rows)
        duplicate_rows = sum(c - 1 for c in seen.values() if c > 1)

        # Date range.
        date_range = None
        if date_values:
            date_range = {
                "start": min(date_values).strftime("%b %Y"),
                "end": max(date_values).strftime("%b %Y"),
            }

        # Currency.
        currency = currency_votes.most_common(1)[0][0] if currency_votes else "INR"

        # Unique customers / products via mapping if available.
        unique_customers = self._unique_for_field(table, mapping, {"customer_name", "customer", "client", "party", "buyer"})
        unique_products = self._unique_for_field(table, mapping, {"product_name", "product", "item", "sku"})

        # Outliers: numeric columns where a value is far above the median.
        outliers = self._detect_outliers(table)

        missing_pct = round(missing_cells / total_cells * 100, 1) if total_cells else 0.0

        return {
            "rows": total_rows,
            "columns": col_count,
            "column_detail": columns,
            "missing_pct": missing_pct,
            "duplicate_rows": duplicate_rows,
            "date_range": date_range,
            "currency": currency,
            "unique_customers": unique_customers,
            "unique_products": unique_products,
            "outliers": outliers[:10],
            "note": "Profiled from a sample of the file — large files are analysed without loading every row into your browser.",
        }

    def _unique_for_field(self, table, mapping, field_names):
        if not mapping:
            return None
        # find the source column mapped to any of the target field names
        for src, field in mapping.items():
            if field in field_names:
                if src in table.headers:
                    ci = table.headers.index(src)
                    vals = set()
                    for r in table.rows:
                        if ci < len(r) and r[ci] is not None and str(r[ci]).strip():
                            vals.add(str(r[ci]).strip().lower())
                    return len(vals)
        return None

    def _detect_outliers(self, table):
        outliers = []
        for ci, header in enumerate(table.headers):
            nums = []
            for r in table.rows:
                if ci < len(r):
                    n = _clean_num(r[ci])
                    if n is not None:
                        nums.append(n)
            if len(nums) < 5:
                continue
            nums_sorted = sorted(nums)
            mid = nums_sorted[len(nums_sorted) // 2] or 1
            if mid == 0:
                continue
            # flag values more than 20x the median as suspicious
            for n in nums:
                if abs(n) > abs(mid) * 20 and abs(n) > 100000:
                    outliers.append({
                        "column": header,
                        "value": n,
                        "typical": round(mid, 2),
                    })
        return outliers
