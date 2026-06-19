const CONFIDENCE_BADGE = {
  memory: { label: 'Remembered', className: 'bg-risk-low/10 text-risk-low' },
  heuristic: { label: 'Auto-matched', className: 'bg-primary/10 text-primary' },
  ai: { label: 'AI suggestion', className: 'bg-risk-medium/10 text-risk-medium' },
  unmapped: { label: 'Needs mapping', className: 'bg-risk-high/10 text-risk-high' },
};

const FIELD_LABELS = {
  // Sales
  invoice_date: 'Invoice date',
  amount: 'Amount',
  category: 'Category',
  invoice_number: 'Invoice number',
  customer_name: 'Customer name',
  description: 'Description',
  // Expense
  incurred_date: 'Incurred date',
  vendor: 'Vendor',
  notes: 'Notes',
  // Customer
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  status: 'Status',
  // Inventory
  product_name: 'Product name',
  sku: 'SKU',
  quantity: 'Quantity',
  unit_cost: 'Unit cost',
  reorder_level: 'Reorder level',
  location: 'Location',
  // Bank
  transaction_date: 'Transaction date',
  debit_amount: 'Debit amount',
  credit_amount: 'Credit amount',
  balance_after: 'Balance after',
  // Statement lines
  line_label: 'Line label',
};

const FIELDS_BY_TYPE = {
  sales: ['invoice_date', 'amount', 'category', 'invoice_number', 'customer_name', 'description'],
  expense: ['incurred_date', 'amount', 'vendor', 'category', 'notes'],
  customer: ['name', 'email', 'phone', 'address', 'status'],
  inventory: ['product_name', 'sku', 'quantity', 'unit_cost', 'reorder_level', 'location'],
  bank_statement: ['transaction_date', 'description', 'debit_amount', 'credit_amount', 'balance_after'],
  balance_sheet: ['line_label', 'amount'],
  profit_and_loss: ['line_label', 'amount'],
};

function MappingReviewTable({ suggestedMapping, documentType, onMappingChange }) {
  const availableFields = FIELDS_BY_TYPE[documentType] || [];

  const handleFieldChange = (sourceColumn, newField) => {
    const updated = suggestedMapping.map((suggestion) =>
      suggestion.source_column === sourceColumn
        ? { ...suggestion, suggested_field: newField || null, source: 'heuristic' }
        : suggestion
    );
    onMappingChange(updated);
  };

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full text-sm">
        <thead className="bg-bg-subtle">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-ink">Source column</th>
            <th className="px-4 py-3 text-left font-semibold text-ink">Sample values</th>
            <th className="px-4 py-3 text-left font-semibold text-ink">Maps to</th>
            <th className="px-4 py-3 text-left font-semibold text-ink">How</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {suggestedMapping.map((suggestion) => {
            const badge = CONFIDENCE_BADGE[suggestion.source] || CONFIDENCE_BADGE.unmapped;
            return (
              <tr key={suggestion.source_column} className="hover:bg-bg-subtle/50 transition">
                <td className="px-4 py-3 font-medium text-ink">
                  {suggestion.source_column}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {suggestion.sample_values?.slice(0, 2).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={suggestion.suggested_field || ''}
                    onChange={(e) => handleFieldChange(suggestion.source_column, e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— skip this column —</option>
                    {availableFields.map((field) => (
                      <option key={field} value={field}>
                        {FIELD_LABELS[field] || field}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default MappingReviewTable;
