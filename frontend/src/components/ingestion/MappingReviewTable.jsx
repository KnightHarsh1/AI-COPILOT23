import { useState } from 'react';
import { Check, Pencil, Plus, BookPlus, AlertTriangle } from 'lucide-react';
import { ingestionService } from '../../services/ingestionService';

const FIELD_LABELS = {
  invoice_date: 'Invoice date', amount: 'Amount', category: 'Category',
  invoice_number: 'Invoice number', customer_name: 'Customer name', description: 'Description',
  due_date: 'Due date', payment_status: 'Payment status', amount_paid: 'Amount paid',
  incurred_date: 'Incurred date', vendor: 'Vendor', notes: 'Notes',
  name: 'Name', email: 'Email', phone: 'Phone', address: 'Address', status: 'Status',
  product_name: 'Product name', sku: 'SKU', quantity: 'Quantity', unit_cost: 'Unit cost',
  reorder_level: 'Reorder level', location: 'Location', unit_price: 'Unit price',
  transaction_date: 'Transaction date', debit_amount: 'Debit amount', credit_amount: 'Credit amount',
  balance_after: 'Balance after', line_label: 'Line label',
};

const FIELDS_BY_TYPE = {
  sales: ['invoice_date', 'amount', 'category', 'invoice_number', 'customer_name', 'description', 'due_date', 'payment_status', 'amount_paid', 'product_name', 'quantity', 'unit_price'],
  expense: ['incurred_date', 'amount', 'vendor', 'category', 'notes'],
  customer: ['name', 'email', 'phone', 'address', 'status'],
  inventory: ['product_name', 'sku', 'quantity', 'unit_cost', 'reorder_level', 'location'],
  bank_statement: ['transaction_date', 'description', 'debit_amount', 'credit_amount', 'balance_after'],
  balance_sheet: ['line_label', 'amount'],
  profit_and_loss: ['line_label', 'amount'],
};

const FIELD_CATEGORIES = ['Sales', 'Customer', 'Inventory', 'Expense', 'Bank', 'Finance', 'Other'];

// Confidence (0-100) for a suggestion. Memory/explicit confidence wins; else
// derived from source so every row shows a score.
function confidenceOf(s) {
  if (typeof s.confidence === 'number' && s.confidence > 0) return Math.round(s.confidence);
  if (s.source === 'memory') return 99;
  if (s.source === 'heuristic') return 85;
  if (s.source === 'ai') return 70;
  return s.suggested_field ? 60 : 0;
}

function ConfidencePill({ value }) {
  const tone = value >= 80 ? 'bg-risk-low/15 text-risk-low' : value >= 50 ? 'bg-gold/15 text-gold' : 'bg-risk-high/15 text-risk-high';
  return <span className={`figure-value rounded-pill px-2 py-0.5 text-xs font-bold ${tone}`}>{value}%</span>;
}

const LOW_CONFIDENCE = 60;

function MappingReviewTable({ suggestedMapping, documentType, onMappingChange, onFieldCreated, onSynonymAdded }) {
  const baseFields = FIELDS_BY_TYPE[documentType] || [];
  const [extraFields, setExtraFields] = useState([]); // [{name,label}]
  const [editing, setEditing] = useState(null);        // source_column being changed
  const [creatingFor, setCreatingFor] = useState(null);
  const [synonymFor, setSynonymFor] = useState(null);
  const [accepted, setAccepted] = useState({});        // source_column -> true
  const [busy, setBusy] = useState(false);

  const availableFields = [...baseFields, ...extraFields.map((f) => f.name)];
  const labelFor = (f) => FIELD_LABELS[f] || extraFields.find((e) => e.name === f)?.label || f;

  const setField = (col, field) => {
    onMappingChange(suggestedMapping.map((s) =>
      s.source_column === col ? { ...s, suggested_field: field || null, source: 'heuristic' } : s
    ));
  };

  const accept = (col) => { setAccepted((p) => ({ ...p, [col]: true })); setEditing(null); };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-subtle">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-ink">Source column</th>
              <th className="px-4 py-3 text-left font-semibold text-ink">Sample</th>
              <th className="px-4 py-3 text-left font-semibold text-ink">Maps to</th>
              <th className="px-4 py-3 text-left font-semibold text-ink">Confidence</th>
              <th className="px-4 py-3 text-right font-semibold text-ink">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {suggestedMapping.map((s) => {
              const col = s.source_column;
              const conf = confidenceOf(s);
              const low = conf < LOW_CONFIDENCE;
              const isAccepted = accepted[col];
              const isEditing = editing === col;
              return (
                <tr key={col} className={`transition ${low ? 'bg-risk-high/5' : 'hover:bg-bg-subtle/50'}`}>
                  <td className="px-4 py-3 font-medium text-ink">
                    <div className="flex items-center gap-1.5">
                      {low && <AlertTriangle size={14} className="text-risk-high" />}
                      {col}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{s.sample_values?.slice(0, 2).join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select
                        autoFocus
                        value={s.suggested_field || ''}
                        onChange={(e) => setField(col, e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">— not mapped —</option>
                        {availableFields.map((f) => <option key={f} value={f}>{labelFor(f)}</option>)}
                      </select>
                    ) : (
                      <span className={`font-medium ${s.suggested_field ? 'text-ink' : 'text-risk-high'}`}>
                        {s.suggested_field ? labelFor(s.suggested_field) : 'Not mapped'}
                        {isAccepted && <span className="ml-2 text-xs font-semibold text-risk-low">✓ Accepted</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3"><ConfidencePill value={conf} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" title="Accept" onClick={() => accept(col)}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${isAccepted ? 'bg-risk-low/15 text-risk-low' : 'text-ink-muted hover:bg-bg-subtle hover:text-risk-low'}`}>
                        <Check size={15} />
                      </button>
                      <button type="button" title="Change mapping" onClick={() => setEditing(isEditing ? null : col)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition hover:bg-bg-subtle hover:text-primary">
                        <Pencil size={14} />
                      </button>
                      <button type="button" title="Create new field" onClick={() => setCreatingFor(col)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition hover:bg-bg-subtle hover:text-primary">
                        <Plus size={15} />
                      </button>
                      <button type="button" title="Add synonym" onClick={() => setSynonymFor(col)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition hover:bg-bg-subtle hover:text-primary">
                        <BookPlus size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {creatingFor && (
        <CreateFieldModal
          sourceColumn={creatingFor}
          documentType={documentType}
          busy={busy}
          onClose={() => setCreatingFor(null)}
          onCreate={async ({ field_name, category, description }) => {
            setBusy(true);
            try {
              const key = field_name.trim().toLowerCase().replace(/\s+/g, '_');
              await ingestionService.createField({ field_name, category, description, document_type: documentType });
              setExtraFields((p) => p.some((f) => f.name === key) ? p : [...p, { name: key, label: field_name.trim() }]);
              setField(creatingFor, key);
              setAccepted((p) => ({ ...p, [creatingFor]: true }));
              onFieldCreated && onFieldCreated(field_name);
            } finally { setBusy(false); setCreatingFor(null); }
          }}
        />
      )}

      {synonymFor && (
        <AddSynonymModal
          sourceColumn={synonymFor}
          fields={availableFields}
          labelFor={labelFor}
          busy={busy}
          onClose={() => setSynonymFor(null)}
          onAdd={async ({ maps_to }) => {
            setBusy(true);
            try {
              await ingestionService.addSynonym({ synonym: synonymFor, maps_to, document_type: documentType });
              setField(synonymFor, maps_to);
              setAccepted((p) => ({ ...p, [synonymFor]: true }));
              onSynonymAdded && onSynonymAdded(synonymFor, maps_to);
            } finally { setBusy(false); setSynonymFor(null); }
          }}
        />
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-2xl">
        <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function CreateFieldModal({ sourceColumn, documentType, busy, onClose, onCreate }) {
  const [name, setName] = useState(sourceColumn);
  const [category, setCategory] = useState(FIELD_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  return (
    <Modal title="Create new field" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Field name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
            {FIELD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this field holds"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <p className="text-xs text-ink-muted">Saved to your Data Dictionary and available in future imports.</p>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-pill px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-bg-subtle">Cancel</button>
          <button type="button" disabled={busy || !name.trim()} onClick={() => onCreate({ field_name: name, category, description })}
            className="rounded-pill bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Create field</button>
        </div>
      </div>
    </Modal>
  );
}

function AddSynonymModal({ sourceColumn, fields, labelFor, busy, onClose, onAdd }) {
  const [mapsTo, setMapsTo] = useState(fields[0] || '');
  return (
    <Modal title="Add synonym" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">Teach Business Copilot that <span className="font-semibold text-ink">&ldquo;{sourceColumn}&rdquo;</span> means:</p>
        <select value={mapsTo} onChange={(e) => setMapsTo(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          {fields.map((f) => <option key={f} value={f}>{labelFor(f)}</option>)}
        </select>
        <p className="text-xs text-ink-muted">Saved permanently. Future uploads with this column will map automatically.</p>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-pill px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-bg-subtle">Cancel</button>
          <button type="button" disabled={busy || !mapsTo} onClick={() => onAdd({ maps_to: mapsTo })}
            className="rounded-pill bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Add synonym</button>
        </div>
      </div>
    </Modal>
  );
}

export default MappingReviewTable;
export { confidenceOf, LOW_CONFIDENCE };
