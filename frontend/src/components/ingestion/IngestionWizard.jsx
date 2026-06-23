import { useState } from 'react';
import Button from '../common/Button';
import UploadDropzone from '../common/UploadDropzone';
import MappingReviewTable from './MappingReviewTable';
import { ProfilingPanel, AIUnderstandingPanel, ReadinessPanel } from './ImportInsightsPanels';
import ImportImpactReport from './ImportImpactReport';
import { ingestionService } from '../../services/ingestionService';
import { formatNumber, formatConfidencePct } from '../../utils/formatters';

const ACCEPTED_TYPES = ['.csv', '.xlsx', '.xls', '.xml', '.pdf', '.png', '.jpg', '.jpeg'];

const DOCUMENT_TYPE_LABELS = {
  sales: 'Sales data',
  expense: 'Expense data',
  customer: 'Customer list',
  inventory: 'Inventory report',
  bank_statement: 'Bank statement',
  balance_sheet: 'Balance sheet',
  profit_and_loss: 'Profit & Loss',
  gst_report: 'GST report',
  tally_export: 'Tally export',
  unknown: 'Unrecognized format',
};

// Steps: drop → analyzing → review → confirming → summary | error
function IngestionWizard({ onComplete }) {
  const [step, setStep] = useState('drop');
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [mapping, setMapping] = useState([]);
  const [statementDate, setStatementDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankLast4, setBankLast4] = useState('');
  const [commitResult, setCommitResult] = useState(null);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const needsStatementDate = ['balance_sheet', 'profit_and_loss'].includes(
    analyzeResult?.document_type
  );
  const needsBankDetails = analyzeResult?.document_type === 'bank_statement';

  const handleFilesSelected = async (files) => {
    const file = files[0];
    if (!file) return;
    setError(null);
    setStep('analyzing');
    setUploadProgress(0);

    try {
      const result = await ingestionService.analyze(file, (e) => {
        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 90));
      });
      setUploadProgress(100);
      setAnalyzeResult(result);
      setMapping(result.suggested_mapping || []);
      setStep('review');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not analyze this file. Check the format and try again.');
      setStep('error');
    }
  };

  const handleMappingChange = async (updated) => {
    setMapping(updated);
    if (!analyzeResult?.batch_id) return;
    const mappingDict = Object.fromEntries(
      updated.map((s) => [s.source_column, s.suggested_field || null])
    );
    try {
      const res = await ingestionService.updateMapping(analyzeResult.batch_id, mappingDict);
      setAnalyzeResult((prev) => prev ? {
        ...prev,
        required_fields_missing: res.required_fields_missing ?? prev.required_fields_missing,
        data_quality: res.data_quality ?? prev.data_quality,
      } : prev);
    } catch (_) {
      // Preview update failures are non-fatal; the user can still confirm.
    }
  };

  const currentMappingDict = () =>
    Object.fromEntries(mapping.map((s) => [s.source_column, s.suggested_field || null]));

  const missingRequired = analyzeResult?.required_fields_missing || [];
  const canConfirm =
    missingRequired.length === 0 &&
    (!needsStatementDate || statementDate) &&
    analyzeResult?.document_type !== 'unknown';

  const handleConfirm = async () => {
    setStep('confirming');
    try {
      const result = await ingestionService.confirm(analyzeResult.batch_id, {
        mapping: currentMappingDict(),
        save_mapping: true,
        statement_date: statementDate || undefined,
        bank_name: bankName || undefined,
        bank_account_last4: bankLast4 || undefined,
      });
      setCommitResult(result);
      setStep('summary');
      onComplete?.();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Import failed. Please try again.');
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('drop');
    setAnalyzeResult(null);
    setMapping([]);
    setCommitResult(null);
    setError(null);
    setStatementDate('');
    setBankName('');
    setBankLast4('');
    setUploadProgress(0);
  };

  if (step === 'drop') {
    return (
      <div className="space-y-4">
        <UploadDropzone
          onFilesSelected={handleFilesSelected}
          acceptedTypes={ACCEPTED_TYPES}
          multiple={false}
          helperText="CSV, Excel, Tally XML, PDF (bank statements/invoices), or a photo. We'll detect the format and walk you through mapping before anything is imported. Max 10 MB."
        />
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 rounded-card border border-border bg-surface p-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <div className="text-center">
          <p className="font-semibold text-ink">Analyzing your file…</p>
          <p className="mt-1 text-sm text-ink-muted">Detecting format and suggesting column mappings.</p>
        </div>
        {uploadProgress > 0 && (
          <div className="w-full max-w-xs">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="space-y-4 rounded-card border border-risk-high/30 bg-risk-high/5 p-6">
        <p className="font-semibold text-risk-high">Import failed</p>
        <p className="text-sm text-ink-muted">{error}</p>
        <Button variant="secondary" onClick={handleReset}>Try another file</Button>
      </div>
    );
  }

  if (step === 'summary') {
    const r = commitResult || {};
    const summaryItems = [
      { label: 'Sales added', value: r.sales_added },
      { label: 'Expenses added', value: r.expenses_added },
      { label: 'Customers added', value: r.customers_added },
      { label: 'Inventory updated', value: r.inventory_added },
      { label: 'Statement lines added', value: r.statement_lines_added },
      { label: 'Bank transactions added', value: r.bank_transactions_added },
      { label: 'Duplicates skipped', value: r.duplicates_skipped },
      { label: 'Rows skipped (invalid)', value: r.rows_skipped_invalid },
    ].filter((item) => item.value > 0);

    return (
      <div className="space-y-6 rounded-card border border-risk-low/30 bg-risk-low/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-risk-low/20 text-risk-low">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-ink">Import complete</p>
            <p className="mt-1 text-sm text-ink-muted">{r.message || 'Your data was imported successfully.'}</p>
          </div>
        </div>
        {summaryItems.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {summaryItems.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-card">
                <dt className="text-sm text-ink-muted">{label}</dt>
                <dd className="figure font-semibold text-ink">{formatNumber(value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {commitResult?.is_duplicate && (
          <p className="text-sm text-ink-muted">
            This file&rsquo;s records were already imported — any duplicates were skipped automatically.
          </p>
        )}
        <ImportImpactReport impact={commitResult?.impact_report} />
        <div className="flex gap-3">
          <Button onClick={handleReset}>Import another file</Button>
        </div>
      </div>
    );
  }

  // review | confirming
  const typeLabel = DOCUMENT_TYPE_LABELS[analyzeResult?.document_type] || analyzeResult?.document_type;
  const confidence = formatConfidencePct(analyzeResult?.detection_confidence);
  const autoMappedCount = mapping.filter((s) => s.suggested_field).length;
  const isMemoryHit = mapping.length > 0 && mapping[0]?.source === 'memory';

  return (
    <div className="space-y-6">
      {/* Detection banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg-subtle p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">AI detected</p>
          <p className="mt-1 font-semibold text-ink">{typeLabel}</p>
          {analyzeResult?.sheet_name && (
            <p className="mt-0.5 text-sm text-ink-muted">Sheet: {analyzeResult.sheet_name}</p>
          )}
        </div>
        <span
          className={`self-start rounded-pill px-3 py-1 text-xs font-semibold sm:self-center ${
            confidence >= 80
              ? 'bg-risk-low/10 text-risk-low'
              : confidence >= 60
              ? 'bg-risk-medium/10 text-risk-medium'
              : 'bg-risk-high/10 text-risk-high'
          }`}
        >
          {confidence}% confidence
        </span>
      </div>

      {/* Auto-mapped success note — reassures the user the AI did the work */}
      {autoMappedCount > 0 && autoMappedCount >= mapping.length - 1 && (
        <div className="flex items-center gap-2 rounded-xl border border-risk-low/20 bg-risk-low/5 px-5 py-3 text-sm text-risk-low">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Columns mapped automatically — just review and confirm. Adjust any row if needed.</span>
        </div>
      )}

      {/* Memory-hit shortcut note */}
      {isMemoryHit && analyzeResult?.matched_template_id && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm text-primary">
          We recognized this layout from a previous import — mapping has been applied automatically.
        </div>
      )}

      {/* Duplicate file warning */}
      {analyzeResult?.duplicate_file_warning && (
        <div className="rounded-xl border border-risk-medium/20 bg-risk-medium/5 px-5 py-3 text-sm text-risk-medium">
          {analyzeResult.duplicate_file_warning}
        </div>
      )}

      {/* AI file understanding + data profile (live from /analyze) */}
      <AIUnderstandingPanel
        documentType={analyzeResult?.document_type}
        confidence={analyzeResult?.detection_confidence}
        mapping={mapping}
      />
      <ProfilingPanel profiling={analyzeResult?.profiling} />

      {/* Mapping table */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold text-ink">Column mapping</h2>
          <p className="text-sm text-ink-muted">
            {mapping.filter((s) => s.suggested_field).length} / {mapping.length} mapped
          </p>
        </div>
        <MappingReviewTable
          suggestedMapping={mapping}
          documentType={analyzeResult?.document_type}
          onMappingChange={handleMappingChange}
        />
      </div>

      {/* Data quality score */}
      {analyzeResult?.data_quality && <DataQualityPanel quality={analyzeResult.data_quality} />}

      {/* Business analysis readiness (live) */}
      <ReadinessPanel readiness={analyzeResult?.business_readiness} />

      {/* Missing required fields warning */}
      {missingRequired.length > 0 && (
        <div className="rounded-xl border border-risk-high/30 bg-risk-high/5 px-5 py-3 text-sm text-risk-high">
          Required fields not yet mapped: {missingRequired.join(', ')}. Please assign them above before confirming.
        </div>
      )}

      {/* Statement date / bank detail inputs for types that need them */}
      {needsStatementDate && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-ink">
            Statement date <span className="text-risk-high">*</span>
          </label>
          <input
            type="date"
            value={statementDate}
            onChange={(e) => setStatementDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-ink-muted">The as-of or period-end date for this statement.</p>
        </div>
      )}

      {needsBankDetails && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink">Bank name (optional)</label>
            <input
              type="text"
              placeholder="e.g. HDFC Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink">Last 4 digits of account (optional)</label>
            <input
              type="text"
              placeholder="e.g. 4321"
              maxLength={4}
              value={bankLast4}
              onChange={(e) => setBankLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={handleReset} disabled={step === 'confirming'}>
          ← Use a different file
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm || step === 'confirming'}
          loading={step === 'confirming'}
        >
          Confirm &amp; import
        </Button>
      </div>
    </div>
  );
}

function DataQualityPanel({ quality }) {
  const score = quality.score ?? 0;
  const color = score >= 90 ? "text-risk-low" : score >= 50 ? "text-risk-medium" : "text-risk-high";
  const barColor = score >= 90 ? "bg-risk-low" : score >= 50 ? "bg-risk-medium" : "bg-risk-high";

  return (
    <div className="rounded-xl border border-border bg-bg-subtle p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Data quality</h3>
        <span className={`figure text-sm font-bold ${color}`}>
          {score}/100 · {quality.grade}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${score}%` }} />
      </div>
      {quality.total_rows != null && (
        <p className="mt-2 text-xs text-ink-muted">
          {quality.valid_rows} clean · {quality.warning_rows} warnings · {quality.error_rows} errors
          {" "}of {quality.total_rows} rows
        </p>
      )}
      {Array.isArray(quality.suggestions) && quality.suggestions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {quality.suggestions.map((s, i) => (
            <li key={i} className="flex gap-2 text-xs text-ink-muted">
              <span className="text-primary">→</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default IngestionWizard;
