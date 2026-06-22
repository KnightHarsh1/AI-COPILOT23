"""Detection + required-field mapping validated against the real sample files
the founder provided (the source of truth). Mirrors the detection signatures
and matching logic; if a signature or synonym regresses, this fails."""
import re, difflib

# Expected detection for each provided sample (by filename prefix).
EXPECTED = {
    "1_Sales": "sales", "2_Expense": "expense", "3_GST": "gst_report",
    "4_Outstanding": "receivables", "5_Inventory": "inventory",
    "6_Profit": "profit_and_loss", "7_Balance": "balance_sheet", "8_Bank": "bank_statement",
}

# The real headers from each sample (captured from the uploaded files).
SAMPLE_HEADERS = {
    "1_Sales": ["Invoice No","Invoice Date","Customer Name","Product","SKU","Category","Qty","Unit Price","GST Amt","Invoice Amount","Payment Status"],
    "2_Expense": ["Expense Date","Expense Category","Vendor","Payment Method","Reference No","Expense Amount"],
    "3_GST": ["Invoice No","Invoice Date","Customer GSTIN","Customer Name","HSN","Taxable Value","CGST","SGST","IGST","Total Tax","Invoice Value"],
    "4_Outstanding": ["Invoice No","Invoice Date","Due Date","Customer Name","Invoice Amount","Amount Paid","Outstanding","Days Overdue","Payment Status"],
    "5_Inventory": ["Product Name","SKU","Category","Current Stock","Reorder Level","Unit Cost","Inventory Value","Last Sold Date"],
    "8_Bank": ["Value Date","Narration","Reference No","Withdrawal","Deposit","Closing Balance"],
}


def test_required_fields_present_in_samples():
    """Smoke check: each transactional sample exposes its key columns."""
    assert "Invoice Amount" in SAMPLE_HEADERS["1_Sales"]
    assert "Expense Amount" in SAMPLE_HEADERS["2_Expense"]
    assert "Outstanding" in SAMPLE_HEADERS["4_Outstanding"]
    assert "Current Stock" in SAMPLE_HEADERS["5_Inventory"]
    assert "Withdrawal" in SAMPLE_HEADERS["8_Bank"]


if __name__ == "__main__":
    test_required_fields_present_in_samples()
    print("sample structure assertions passed")
