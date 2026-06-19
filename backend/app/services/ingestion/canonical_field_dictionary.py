"""The canonical field vocabulary every column mapping resolves to,
scoped per document type. Used by both ColumnMappingService's heuristic
matcher (synonym lists) and its AI fallback (the field list + descriptions
sent to Gemini) -- one source of truth for both paths so they can never
silently drift apart.

Balance sheet / P&L line items are deliberately NOT listed here as
"fields to map per row" the way sales/expense/customer/inventory are.
For statement documents, column mapping only needs to find two columns
(the label column and the amount column) -- which controlled-vocabulary
line_category a given label belongs to (e.g. "Sundry Debtors" ->
current_assets) is a separate classification step done by
BalanceSheetParser/ProfitAndLossParser, not by ColumnMappingService.
"""

from typing import Dict, List, NamedTuple


class FieldSpec(NamedTuple):
    name: str
    required: bool
    description: str
    synonyms: List[str]


SALES_FIELDS: List[FieldSpec] = [
    FieldSpec('invoice_date', True, 'The date of the sale or invoice',
              ['invoice date', 'sale date', 'bill date', 'date', 'transaction date']),
    FieldSpec('amount', True, 'The sale value in rupees',
              ['amount', 'sale value', 'value', 'total', 'net amount', 'invoice amount', 'sales amount']),
    FieldSpec('category', True, 'The product or sale category',
              ['category', 'product category', 'type', 'item category']),
    FieldSpec('invoice_number', False, 'The invoice or bill number',
              ['invoice number', 'invoice no', 'bill no', 'bill number', 'voucher no']),
    FieldSpec('customer_name', False, "The customer's name",
              ['customer name', 'customer', 'client', 'buyer', 'party name', 'party']),
    FieldSpec('description', False, 'A free-text description of the sale',
              ['description', 'details', 'narration', 'remarks']),
    FieldSpec('due_date', False, 'The date payment is due',
              ['due date', 'payment due', 'due', 'payment due date']),
    FieldSpec('payment_status', False, 'Whether the invoice is paid, unpaid, or partial',
              ['payment status', 'status', 'paid status', 'payment']),
    FieldSpec('amount_paid', False, 'How much has been paid so far',
              ['amount paid', 'paid amount', 'received', 'amount received']),
]

EXPENSE_FIELDS: List[FieldSpec] = [
    FieldSpec('incurred_date', True, 'The date the expense was incurred',
              ['incurred date', 'expense date', 'date', 'transaction date', 'payment date']),
    FieldSpec('amount', True, 'The expense amount in rupees',
              ['amount', 'expense amount', 'value', 'total', 'net amount']),
    FieldSpec('vendor', True, 'Who the expense was paid to',
              ['vendor', 'supplier', 'paid to', 'payee', 'party name', 'party']),
    FieldSpec('category', False, 'The expense category',
              ['category', 'expense category', 'type', 'head of account']),
    FieldSpec('notes', False, 'A free-text note about the expense',
              ['notes', 'description', 'details', 'narration', 'remarks']),
]

CUSTOMER_FIELDS: List[FieldSpec] = [
    FieldSpec('name', True, "The customer's name",
              ['name', 'customer name', 'client name', 'party name', 'party']),
    FieldSpec('email', False, "The customer's email address",
              ['email', 'email address', 'e-mail']),
    FieldSpec('phone', False, "The customer's phone number",
              ['phone', 'phone number', 'mobile', 'contact number', 'contact']),
    FieldSpec('address', False, "The customer's address",
              ['address', 'billing address', 'location']),
    FieldSpec('status', False, 'Whether the customer is active or inactive',
              ['status', 'customer status', 'active']),
]

INVENTORY_FIELDS: List[FieldSpec] = [
    FieldSpec('product_name', True, 'The name of the product or item',
              ['product name', 'item name', 'product', 'item', 'description']),
    FieldSpec('sku', False, 'The stock-keeping unit or item code',
              ['sku', 'item code', 'product code', 'stock code']),
    FieldSpec('quantity', False, 'The quantity in stock',
              ['quantity', 'qty', 'stock quantity', 'closing stock', 'stock']),
    FieldSpec('unit_cost', False, 'The cost per unit',
              ['unit cost', 'cost price', 'rate', 'unit price', 'cost']),
    FieldSpec('reorder_level', False, 'The reorder threshold for this item',
              ['reorder level', 'reorder point', 'minimum stock']),
    FieldSpec('location', False, 'Where the item is stored',
              ['location', 'warehouse', 'store', 'godown']),
]

BANK_TRANSACTION_FIELDS: List[FieldSpec] = [
    FieldSpec('transaction_date', True, 'The date of the transaction',
              ['transaction date', 'date', 'value date', 'txn date']),
    FieldSpec('description', True, 'The transaction narration',
              ['description', 'narration', 'particulars', 'details', 'remarks']),
    FieldSpec('debit_amount', False, 'The amount debited (money out)',
              ['debit', 'debit amount', 'withdrawal', 'withdrawal amount', 'dr']),
    FieldSpec('credit_amount', False, 'The amount credited (money in)',
              ['credit', 'credit amount', 'deposit', 'deposit amount', 'cr']),
    FieldSpec('balance_after', False, 'The running balance after this transaction',
              ['balance', 'closing balance', 'available balance', 'running balance']),
]

# Balance sheet / P&L: only two columns ever need mapping. The line-by-line
# category classification happens inside the statement parsers, not here.
STATEMENT_LINE_FIELDS: List[FieldSpec] = [
    FieldSpec('line_label', True, 'The account or line item label',
              ['particulars', 'account', 'account name', 'description', 'head of account']),
    FieldSpec('amount', True, 'The amount for this line item',
              ['amount', 'value', 'balance', 'total']),
]

FIELDS_BY_DOCUMENT_TYPE: Dict[str, List[FieldSpec]] = {
    'sales': SALES_FIELDS,
    'expense': EXPENSE_FIELDS,
    'customer': CUSTOMER_FIELDS,
    'inventory': INVENTORY_FIELDS,
    'bank_statement': BANK_TRANSACTION_FIELDS,
    'balance_sheet': STATEMENT_LINE_FIELDS,
    'profit_and_loss': STATEMENT_LINE_FIELDS,
}


def required_fields_for(document_type: str) -> List[str]:
    return [f.name for f in FIELDS_BY_DOCUMENT_TYPE.get(document_type, []) if f.required]


def all_fields_for(document_type: str) -> List[FieldSpec]:
    return FIELDS_BY_DOCUMENT_TYPE.get(document_type, [])
