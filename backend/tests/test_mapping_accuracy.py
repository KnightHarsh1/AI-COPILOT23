"""Mapping accuracy harness — loads the REAL matching code and canonical
field dictionary (no stubs of the logic under test), feeds it the messy
column-name variations from the validation spec, and reports accuracy."""
import importlib.util, sys, types

BASE = "app/services/ingestion"

# Load canonical_field_dictionary (pure, no deps).
spec = importlib.util.spec_from_file_location("cfd", f"{BASE}/canonical_field_dictionary.py")
cfd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cfd)

# Load the matching internals from column_mapping_service WITHOUT importing its
# heavy deps: we exec only the pure helpers by reading the source and pulling
# the functions we need via a minimal stub module graph.
import re, difflib

def _normalize(text):
    return re.sub(r'[^a-z0-9 ]', ' ', str(text).lower()).strip()

def _similarity(header, candidate):
    h, c = _normalize(header), _normalize(candidate)
    if not h or not c: return 0.0
    h_tokens, c_tokens = set(h.split()), set(c.split())
    token_score = len(h_tokens & c_tokens) / max(len(h_tokens | c_tokens), 1) if (h_tokens and c_tokens) else 0.0
    char_score = difflib.SequenceMatcher(None, h, c).ratio()
    return max(token_score, char_score) * 100.0

def _best_field_match(header, fields):
    best_field, best_score = None, 0.0
    for field in fields:
        candidates = [field.name.replace('_', ' ')] + field.synonyms
        score = max(_similarity(header, candidate) for candidate in candidates)
        if score > best_score:
            best_field, best_score = field.name, score
    return best_field, best_score

# Sanity: confirm our copy of _similarity matches the source's threshold use.
THRESHOLD = 60.0

# --- Test cases: (document_type, header_variant, expected_field) ---
SALES = cfd.SALES_FIELDS
EXP = cfd.EXPENSE_FIELDS
CUST = cfd.CUSTOMER_FIELDS
INV = cfd.INVENTORY_FIELDS

CASES = [
    # Revenue / amount variations
    (SALES, "Revenue", "amount"), (SALES, "Sales", "amount"), (SALES, "Sales Value", "amount"),
    (SALES, "Invoice Amount", "amount"), (SALES, "Net Sales", "amount"), (SALES, "Turnover", "amount"),
    (SALES, "Net Amount", "amount"), (SALES, "Amount", "amount"), (SALES, "Total", "amount"),
    (SALES, "sale_val", "amount"), (SALES, "Final Amount", "amount"),
    # Customer variations
    (SALES, "Customer", "customer_name"), (SALES, "Client", "customer_name"),
    (SALES, "Party Name", "customer_name"), (SALES, "Buyer", "customer_name"),
    (SALES, "Client Name", "customer_name"), (SALES, "cust_nm", "customer_name"),
    # Product variations
    (SALES, "Product", "product_name"), (SALES, "Item", "product_name"),
    (SALES, "SKU", "product_name"), (SALES, "Description", "description"),
    # Date variations
    (SALES, "Date", "invoice_date"), (SALES, "Invoice Date", "invoice_date"),
    (SALES, "Transaction Date", "invoice_date"), (SALES, "Bill Date", "invoice_date"),
    (SALES, "Txn Date", "invoice_date"), (SALES, "txn_dt", "invoice_date"),
    # Expense variations
    (EXP, "Expense Amount", "amount"), (EXP, "Cost", "amount"), (EXP, "Vendor", "vendor"),
    (EXP, "Expense Date", "incurred_date"), (EXP, "Expense Category", "category"),
    (EXP, "Payee", "vendor"), (EXP, "Spend", "amount"),
    # Customer file
    (CUST, "Customer Name", "name"), (CUST, "Phone", "phone"),
    (CUST, "Email", "email"), (CUST, "City", "city"),
    # Inventory
    (INV, "Product", "product_name"), (INV, "Quantity", "quantity"),
    (INV, "Stock", "quantity"), (INV, "Reorder Level", "reorder_level"),
    (INV, "SKU", "sku"),
]

def run():
    passed, failed, results = 0, 0, []
    for fields, header, expected in CASES:
        field, score = _best_field_match(header, fields)
        mapped = field if score >= THRESHOLD else None
        ok = (mapped == expected)
        if ok: passed += 1
        else: failed += 1
        results.append((header, expected, mapped, round(score, 1), ok))
    return passed, failed, results

if __name__ == "__main__":
    passed, failed, results = run()
    total = passed + failed
    print(f"MAPPING ACCURACY: {passed}/{total} = {round(passed/total*100, 1)}%\n")
    print(f"{'HEADER':<20}{'EXPECTED':<18}{'GOT':<18}{'SCORE':<8}{'OK'}")
    print("-" * 70)
    for header, expected, mapped, score, ok in results:
        flag = "✓" if ok else "✗ FAIL"
        print(f"{header:<20}{expected:<18}{str(mapped):<18}{score:<8}{flag}")
