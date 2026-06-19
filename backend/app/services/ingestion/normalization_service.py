"""The sole writer to canonical tables (sales, expenses, customers,
inventory_items, financial_statement_lines, bank_transactions). Every
other service in this package only reads or stages -- nothing else is
permitted to call session.add() on a canonical model.

Dedup rules deliberately mirror upload.py's existing logic for sales
and expenses exactly, so a file imported through either path produces
identical results.
"""

from datetime import date as date_type, datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.db.models.bank_transaction import BankTransaction
from app.db.models.customer import Customer
from app.db.models.expense import Expense
from app.db.models.financial_statement import FinancialStatementLine
from app.db.models.ingestion import IngestionBatch, StagingRow
from app.db.models.inventory import InventoryItem
from app.db.models.sale import Sale
from app.schemas.ingestion import IngestionCommitResult
from app.services.ingestion.validation_service import coerce_amount, coerce_date

# Keyword rules for classifying a statement line's label into the
# controlled line_category vocabulary. Checked in order -- first match
# wins -- so more specific terms should come before more generic ones.
_BALANCE_SHEET_RULES = [
    ('inventory_assets', ['stock in hand', 'closing stock', 'inventory']),
    ('current_assets', ['sundry debtor', 'receivable', 'cash', 'bank balance', 'current asset']),
    ('fixed_assets', ['fixed asset', 'machinery', 'building', 'furniture', 'vehicle', 'land', 'plant']),
    ('current_liabilities', ['sundry creditor', 'payable', 'outstanding expense', 'current liabilit', 'provision']),
    ('long_term_liabilities', ['long term loan', 'term loan', 'borrowing', 'debenture', 'long-term']),
    ('equity', ['share capital', 'reserve', 'surplus', 'capital account', 'equity']),
]
_PROFIT_AND_LOSS_RULES = [
    ('revenue', ['sales', 'revenue', 'income from operations', 'gross revenue']),
    ('cogs', ['cost of goods sold', 'cost of sales', 'purchases', 'opening stock', 'closing stock']),
    ('other_income', ['other income', 'interest received', 'dividend received']),
    ('operating_expenses', ['salary', 'wages', 'rent', 'electricity', 'expense', 'depreciation', 'administrative']),
    ('other_expenses', ['interest paid', 'finance cost', 'other expense']),
]


def classify_line_category(label: str, statement_type: str) -> str:
    text = (label or '').lower()
    rules = _BALANCE_SHEET_RULES if statement_type == 'balance_sheet' else _PROFIT_AND_LOSS_RULES

    for category, keywords in rules:
        if any(kw in text for kw in keywords):
            return category

    return 'other_income' if statement_type == 'profit_and_loss' else 'current_assets'


class NormalizationService:
    def __init__(self, session: Session):
        self.session = session

    def commit_batch(
        self,
        batch: IngestionBatch,
        statement_date: Optional[date_type] = None,
        bank_name: Optional[str] = None,
        bank_account_last4: Optional[str] = None,
    ) -> IngestionCommitResult:
        result = IngestionCommitResult()

        valid_rows = (
            self.session.query(StagingRow)
            .filter(StagingRow.batch_id == batch.id, StagingRow.validation_status != 'error')
            .all()
        )
        error_row_count = (
            self.session.query(StagingRow)
            .filter(StagingRow.batch_id == batch.id, StagingRow.validation_status == 'error')
            .count()
        )

        handlers = {
            'sales': self._commit_sales,
            'expense': self._commit_expenses,
            'customer': self._commit_customers,
            'inventory': self._commit_inventory,
            'balance_sheet': lambda rows, res: self._commit_statement_lines(
                rows, res, batch, statement_date or datetime.now(timezone.utc).date()
            ),
            'profit_and_loss': lambda rows, res: self._commit_statement_lines(
                rows, res, batch, statement_date or datetime.now(timezone.utc).date()
            ),
            'bank_statement': lambda rows, res: self._commit_bank_transactions(
                rows, res, batch, bank_name, bank_account_last4
            ),
        }

        handler = handlers.get(batch.document_type)
        if handler is None:
            batch.status = 'failed'
            batch.error_message = f"No normalization handler for document type '{batch.document_type}'."
            self.session.commit()
            result.message = batch.error_message
            return result

        handler(valid_rows, result)

        result.rows_skipped_invalid = error_row_count
        if statement_date is None and batch.document_type in ('balance_sheet', 'profit_and_loss'):
            result.message = (
                f"{result.message} No statement date was provided, so today's date was used -- "
                "edit this in Reports if that's not correct."
            )

        batch.status = 'committed'
        batch.committed_at = datetime.now(timezone.utc)
        self.session.commit()

        return result

    # -- Sales -----------------------------------------------------------

    def _commit_sales(self, rows: List[StagingRow], result: IngestionCommitResult) -> None:
        for row in rows:
            data = row.mapped_data or {}
            invoice_date = coerce_date(data.get('invoice_date'))
            amount = coerce_amount(data.get('amount'))
            category = (data.get('category') or '').strip() or None

            if invoice_date is None or amount is None:
                result.rows_skipped_invalid += 1
                continue

            existing = (
                self.session.query(Sale)
                .filter(
                    Sale.company_id == row.batch.company_id,
                    Sale.invoice_date == invoice_date,
                    Sale.amount == amount,
                    Sale.category == category,
                )
                .first()
            )
            if existing:
                result.duplicates_skipped += 1
                continue

            # Collections fields (additive). Only set when the upload
            # actually provided them; otherwise leave the safe defaults
            # ('unknown' status) so the Collections widget can be honest
            # about coverage.
            due_date = coerce_date(data.get('due_date'))
            amount_paid = coerce_amount(data.get('amount_paid'))
            raw_status = (data.get('payment_status') or '').strip().lower()

            payment_status = 'unknown'
            is_credit_sale = False
            paid = 0
            if raw_status in ('paid', 'unpaid', 'partial'):
                payment_status = raw_status
            elif amount_paid is not None:
                if amount_paid >= amount:
                    payment_status = 'paid'
                elif amount_paid > 0:
                    payment_status = 'partial'
                else:
                    payment_status = 'unpaid'

            if payment_status == 'paid':
                paid = amount
            elif amount_paid is not None:
                paid = amount_paid

            if due_date is not None and payment_status in ('unpaid', 'partial', 'unknown'):
                is_credit_sale = True

            self.session.add(Sale(
                company_id=row.batch.company_id,
                invoice_date=invoice_date,
                amount=amount,
                category=category,
                description=data.get('description'),
                invoice_number=data.get('invoice_number'),
                source_file_id=row.batch.file_id,
                due_date=due_date,
                payment_status=payment_status,
                amount_paid=paid,
                is_credit_sale=is_credit_sale,
            ))
            result.sales_added += 1

    # -- Expenses --------------------------------------------------------

    def _commit_expenses(self, rows: List[StagingRow], result: IngestionCommitResult) -> None:
        for row in rows:
            data = row.mapped_data or {}
            incurred_date = coerce_date(data.get('incurred_date'))
            amount = coerce_amount(data.get('amount'))
            vendor = (data.get('vendor') or '').strip()

            if incurred_date is None or amount is None or not vendor:
                result.rows_skipped_invalid += 1
                continue

            existing = (
                self.session.query(Expense)
                .filter(
                    Expense.company_id == row.batch.company_id,
                    Expense.vendor == vendor,
                    Expense.amount == amount,
                    Expense.incurred_date == incurred_date,
                )
                .first()
            )
            if existing:
                result.duplicates_skipped += 1
                continue

            self.session.add(Expense(
                company_id=row.batch.company_id,
                vendor=vendor,
                amount=amount,
                category=(data.get('category') or '').strip() or None,
                incurred_date=incurred_date,
                notes=data.get('notes'),
                source_file_id=row.batch.file_id,
            ))
            result.expenses_added += 1

    # -- Customers ---------------------------------------------------------

    def _commit_customers(self, rows: List[StagingRow], result: IngestionCommitResult) -> None:
        for row in rows:
            data = row.mapped_data or {}
            name = (data.get('name') or '').strip()

            if not name:
                result.rows_skipped_invalid += 1
                continue

            existing = (
                self.session.query(Customer)
                .filter(
                    Customer.company_id == row.batch.company_id,
                    Customer.name.ilike(name),
                )
                .first()
            )
            if existing:
                # Treat a re-upload as an update, not a duplicate skip --
                # contact details legitimately change over time.
                existing.email = data.get('email') or existing.email
                existing.phone = data.get('phone') or existing.phone
                existing.address = data.get('address') or existing.address
                result.duplicates_skipped += 1
                continue

            self.session.add(Customer(
                company_id=row.batch.company_id,
                name=name,
                email=data.get('email'),
                phone=data.get('phone'),
                address=data.get('address'),
                status=(data.get('status') or 'active').strip().lower(),
            ))
            result.customers_added += 1

    # -- Inventory -----------------------------------------------------------

    def _commit_inventory(self, rows: List[StagingRow], result: IngestionCommitResult) -> None:
        for row in rows:
            data = row.mapped_data or {}
            product_name = (data.get('product_name') or '').strip()
            sku = (data.get('sku') or '').strip() or None

            if not product_name:
                result.rows_skipped_invalid += 1
                continue

            query = self.session.query(InventoryItem).filter(InventoryItem.company_id == row.batch.company_id)
            existing = (
                query.filter(InventoryItem.sku == sku).first()
                if sku else query.filter(InventoryItem.product_name.ilike(product_name)).first()
            )

            quantity = coerce_amount(data.get('quantity'))
            unit_cost = coerce_amount(data.get('unit_cost'))
            reorder_level = coerce_amount(data.get('reorder_level'))

            if existing:
                # A re-uploaded inventory report is a stock-level refresh,
                # not a duplicate to skip -- quantities are point-in-time.
                if quantity is not None:
                    existing.quantity = int(quantity)
                if unit_cost is not None:
                    existing.unit_cost = unit_cost
                if reorder_level is not None:
                    existing.reorder_level = int(reorder_level)
                existing.location = data.get('location') or existing.location
                result.duplicates_skipped += 1
                continue

            self.session.add(InventoryItem(
                company_id=row.batch.company_id,
                product_name=product_name,
                sku=sku,
                quantity=int(quantity) if quantity is not None else 0,
                unit_cost=unit_cost if unit_cost is not None else 0,
                reorder_level=int(reorder_level) if reorder_level is not None else 0,
                location=data.get('location'),
            ))
            result.inventory_added += 1

    # -- Financial statement lines ----------------------------------------

    def _commit_statement_lines(
        self,
        rows: List[StagingRow],
        result: IngestionCommitResult,
        batch: IngestionBatch,
        statement_date: date_type,
    ) -> None:
        for row in rows:
            data = row.mapped_data or {}
            label = (data.get('line_label') or '').strip()
            amount = coerce_amount(data.get('amount'))

            if not label or amount is None:
                result.rows_skipped_invalid += 1
                continue

            category = classify_line_category(label, batch.document_type)

            existing = (
                self.session.query(FinancialStatementLine)
                .filter(
                    FinancialStatementLine.company_id == batch.company_id,
                    FinancialStatementLine.statement_type == batch.document_type,
                    FinancialStatementLine.statement_date == statement_date,
                    FinancialStatementLine.line_category == category,
                    FinancialStatementLine.line_label == label,
                )
                .first()
            )

            if existing:
                # A re-uploaded statement for the same period updates the
                # figure rather than duplicating the line -- the correct
                # semantics for a restated or corrected statement.
                existing.amount = amount
                result.duplicates_skipped += 1
                continue

            self.session.add(FinancialStatementLine(
                company_id=batch.company_id,
                source_file_id=batch.file_id,
                statement_type=batch.document_type,
                statement_date=statement_date,
                line_category=category,
                line_label=label,
                amount=amount,
            ))
            result.statement_lines_added += 1

    # -- Bank transactions ---------------------------------------------------

    def _commit_bank_transactions(
        self,
        rows: List[StagingRow],
        result: IngestionCommitResult,
        batch: IngestionBatch,
        bank_name: Optional[str],
        bank_account_last4: Optional[str],
    ) -> None:
        for row in rows:
            data = row.mapped_data or {}
            transaction_date = coerce_date(data.get('transaction_date'))
            description = data.get('description')
            debit_amount = coerce_amount(data.get('debit_amount'))
            credit_amount = coerce_amount(data.get('credit_amount'))

            if transaction_date is None or (debit_amount is None and credit_amount is None):
                result.rows_skipped_invalid += 1
                continue

            existing = (
                self.session.query(BankTransaction)
                .filter(
                    BankTransaction.company_id == batch.company_id,
                    BankTransaction.transaction_date == transaction_date,
                    BankTransaction.debit_amount == debit_amount,
                    BankTransaction.credit_amount == credit_amount,
                    BankTransaction.description == description,
                )
                .first()
            )
            if existing:
                result.duplicates_skipped += 1
                continue

            self.session.add(BankTransaction(
                company_id=batch.company_id,
                source_file_id=batch.file_id,
                bank_name=bank_name,
                account_number_masked=(bank_account_last4 or '')[-4:] or None,
                transaction_date=transaction_date,
                description=description,
                debit_amount=debit_amount,
                credit_amount=credit_amount,
                balance_after=coerce_amount(data.get('balance_after')),
            ))
            result.bank_transactions_added += 1
