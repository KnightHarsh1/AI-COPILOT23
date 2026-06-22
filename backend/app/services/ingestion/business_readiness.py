"""Scores how ready a company's data is for full analysis, from the mapped
fields in the current import plus what already exists. Drives the
"Business Analysis Readiness" panel in the import wizard's final summary.

Heuristic and explainable: each data area contributes a weighted share, and
forecast / AI confidence are derived from how much of the important data is
present. No mock values — everything is read from the mapping and counts.
"""


def _coverage_from_mapping(mapping, field_names):
    """1.0 if any of the target fields is mapped, else 0.0 — a coarse but
    honest 'do we have this data at all' signal for the current file."""
    mapped_fields = set(mapping.values()) if mapping else set()
    return 1.0 if (mapped_fields & field_names) else 0.0


class BusinessReadinessEngine:
    REVENUE_FIELDS = {"revenue", "amount", "sales", "total", "net_amount"}
    EXPENSE_FIELDS = {"expense", "cost", "amount_paid", "debit"}
    INVENTORY_FIELDS = {"stock", "quantity", "inventory", "sku", "product_name"}
    CUSTOMER_FIELDS = {"customer_name", "customer", "client", "party"}
    DATE_FIELDS = {"invoice_date", "date", "incurred_date", "due_date"}

    def score(self, mapping, profiling=None, document_type=None) -> dict:
        # Statement-style files are NOT measured on revenue/expense/customer/
        # date coverage. A balance sheet's readiness is about whether we can
        # see assets, liabilities, cash, receivables, inventory and loans;
        # a P&L's is about revenue/cost/expense lines. Delegate accordingly.
        if document_type == 'balance_sheet':
            return self._balance_sheet_readiness(mapping, profiling)
        if document_type == 'profit_and_loss':
            return self._profit_and_loss_readiness(mapping, profiling)

        revenue = _coverage_from_mapping(mapping, self.REVENUE_FIELDS)
        expense = _coverage_from_mapping(mapping, self.EXPENSE_FIELDS)
        inventory = _coverage_from_mapping(mapping, self.INVENTORY_FIELDS)
        customer = _coverage_from_mapping(mapping, self.CUSTOMER_FIELDS)
        has_dates = _coverage_from_mapping(mapping, self.DATE_FIELDS)

        # Weighted overall readiness.
        weights = {"revenue": 35, "expense": 25, "inventory": 15, "customer": 15, "dates": 10}
        total = (
            revenue * weights["revenue"]
            + expense * weights["expense"]
            + inventory * weights["inventory"]
            + customer * weights["customer"]
            + has_dates * weights["dates"]
        )
        score = round(total)

        # Forecast confidence: needs revenue + a usable date range.
        months = 0
        if profiling and profiling.get("date_range"):
            months = 2  # range present implies at least some spread
        if revenue and has_dates and months >= 2:
            forecast_conf = "Medium"
        elif revenue and has_dates:
            forecast_conf = "Low"
        else:
            forecast_conf = "Not enough data"

        # AI confidence: how complete is the picture.
        present = sum([bool(revenue), bool(expense), bool(inventory), bool(customer), bool(has_dates)])
        ai_conf = "High" if present >= 4 else "Medium" if present >= 2 else "Low"

        return {
            "score": score,
            "areas": [
                {"label": "Revenue data", "pct": round(revenue * 100)},
                {"label": "Expense data", "pct": round(expense * 100)},
                {"label": "Inventory data", "pct": round(inventory * 100)},
                {"label": "Customer data", "pct": round(customer * 100)},
                {"label": "Dates", "pct": round(has_dates * 100)},
            ],
            "forecast_confidence": forecast_conf,
            "ai_confidence": ai_conf,
        }

    # ---- Statement-style readiness (label-based, not revenue-based) ----

    def _label_text(self, profiling):
        """Pull the first-column row labels from profiling so we can detect
        which statement areas are present. Balance-sheet meaning lives in row
        labels (Cash, Sundry Debtors, Loans), not column headers."""
        if not profiling:
            return ""
        parts = []
        for col in (profiling.get("column_detail") or []):
            # column_detail doesn't carry values; fall back to any sample text
            parts.append(str(col.get("name", "")))
        # profiling may also include a raw label dump if provided
        parts.append(str(profiling.get("label_text", "")))
        return " ".join(parts).lower()

    def _balance_sheet_readiness(self, mapping, profiling):
        text = self._label_text(profiling)
        # Also consider mapped line labels if the caller passed them.
        mapped_labels = " ".join(str(v) for v in (mapping or {}).values()).lower()
        blob = text + " " + mapped_labels

        def has(*keys):
            return 100 if any(k in blob for k in keys) else 0

        areas = [
            {"label": "Assets coverage", "pct": has("asset", "cash", "bank", "debtor", "receivable", "stock", "inventory", "machinery", "furniture")},
            {"label": "Liabilities coverage", "pct": has("liabilit", "creditor", "payable", "loan", "borrowing")},
            {"label": "Cash coverage", "pct": has("cash", "bank")},
            {"label": "Receivable coverage", "pct": has("debtor", "receivable")},
            {"label": "Inventory coverage", "pct": has("stock", "inventory")},
            {"label": "Loan coverage", "pct": has("loan", "borrowing", "term loan", "debenture")},
        ]
        score = round(sum(a["pct"] for a in areas) / len(areas)) if areas else 0
        return {
            "score": score,
            "areas": areas,
            "forecast_confidence": "n/a",
            "ai_confidence": "High" if score >= 60 else "Medium" if score >= 30 else "Low",
        }

    def _profit_and_loss_readiness(self, mapping, profiling):
        text = self._label_text(profiling)
        mapped_labels = " ".join(str(v) for v in (mapping or {}).values()).lower()
        blob = text + " " + mapped_labels

        def has(*keys):
            return 100 if any(k in blob for k in keys) else 0

        areas = [
            {"label": "Revenue lines", "pct": has("revenue", "sales", "income", "turnover")},
            {"label": "Cost of goods", "pct": has("cogs", "cost of goods", "cost of sales", "purchases")},
            {"label": "Operating expenses", "pct": has("expense", "salary", "rent", "electricity", "depreciation")},
            {"label": "Profit lines", "pct": has("gross profit", "net profit", "operating profit", "profit before tax")},
        ]
        score = round(sum(a["pct"] for a in areas) / len(areas)) if areas else 0
        return {
            "score": score,
            "areas": areas,
            "forecast_confidence": "n/a",
            "ai_confidence": "High" if score >= 60 else "Medium" if score >= 30 else "Low",
        }
