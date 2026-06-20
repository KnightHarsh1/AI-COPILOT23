from app.services.ingestion.canonical_field_dictionary import all_fields_across_types, required_fields_for


def test_required_fields():
    assert set(required_fields_for('sales')) >= {'invoice_date', 'amount', 'category'}
    assert 'product_name' in required_fields_for('inventory')


def test_cross_type_pairs_present():
    pairs = all_fields_across_types()
    types = {t for t, _ in pairs}
    assert {'sales', 'expense', 'inventory', 'customer'} <= types
