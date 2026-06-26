import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../common/Button';
import UploadDropzone from '../common/UploadDropzone';
import MappingReviewTable, { confidenceOf, LOW_CONFIDENCE } from './MappingReviewTable';
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
  const [showForceModal, setShowForceModal] = useState(false);
  const [forceReason, setForceReason] = useState('');

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

  // Collect all blocking/non-blocking issues so Force Import can list them.
  const detectIssues = () => {
    const issues = [];
    if (analyzeResult?.duplicate_file_warning) issues.push(analyzeResult.duplicate_file_warning);
    missingRequired.forEach((f) => issues.push(`Missing required field: ${f}`));
    mapping.forEach((s) => {
      const c = confidenceOf(s);
      if (s.suggested_field && c < LOW_CONFIDENCE) issues.push(`${s.source_column} → low confidence mapping (${c}%)`);
      if (!s.suggested_field) issues.push(`${s.source_column} is unmapped`);
    });
    const dq = analyzeResult?.data_quality;
    if (dq?.issues?.length) dq.issues.forEach((i) => issues.push(typeof i === 'string' ? i : (i.message || 'Data quality issue')));
    if (needsStatementDate && !statementDate) issues.push('Statement date not set');
    return issues;
  };
  const issues = detectIssues();
  const hasIssues = issues.length > 0;

  const runImport = async ({ force }) => {
    setShowForceModal(false);
    setStep('confirming');
    try {
      const result = await ingestionService.confirm(analyzeResult.batch_id, {
        mapping: currentMappingDict(),
        save_mapping: true,
        statement_date: statementDate || undefined,
        bank_name: bankName || undefined,
        bank_account_last4: bankLast4 || undefined,
        force: !!force,
        force_reason: force ? (forceReason || 'Proceeded despite warnings') : undefined,
      });
      if (force) result.force_imported = true;
      if (force && (!result.warnings || result.warnings.length === 0)) result.warnings = issues;
      setCommitResult(result);
      setStep('summary');
      onComplete?.();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Import failed. Please try again.');
      setStep('error');
    }
  };

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
    setShowForceModal(false);
    setForceReason('');
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
    const forced = !!r.force_imported;
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

    const tone = forced ? 'border-gold/40 bg-gold/5' : 'border-risk-low/30 bg-risk-low/5';
    return (
      <div className={`space-y-6 rounded-card border p-6 ${tone}`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${forced ? 'bg-gold/20 text-gold' : 'bg-risk-low/20 text-risk-low'}`}>
            {forced ? <AlertTriangle size={20} /> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-semibold text-ink">{forced ? 'Import completed with warnings' : 'Import complete'}</p>
            <p className="mt-1 text-sm text-ink-muted">{r.message || 'Your data was imported successfully.'}</p>
            <span className={`mt-2 inline-block rounded-pill px-2.5 py-0.5 text-xs font-bold ${forced ? 'bg-gold/15 text-gold' : 'bg-risk-low/15 text-risk-low'}`}>
              {forced ? '⚠ Force Imported' : '✓ Imported'}
            </span>
          </div>
        </div>
        {summaryItems.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {summaryItems.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-card">
                <dt className="text-sm text-ink-muted">{label}</dt>
                <dd className="figure-value font-semibold text-ink">{formatNumber(value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {forced && r.warnings?.length > 0 && (
          <div className="rounded-xl border border-gold/30 bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gold">Warnings ({r.warnings.length})</p>
            <ul className="mt-2 space-y-1 text-sm text-ink-muted">
              {r.warnings.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </div>
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
          onFieldCreated={() => {}}
          onSynonymAdded={() => {}}
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowForceModal(true)}
            disabled={step === 'confirming' || analyzeResult?.document_type === 'unknown'}
            title={hasIssues ? `${issues.length} issue(s) detected` : 'No issues detected — Normal Import recommended'}
            className={`inline-flex items-center gap-2 rounded-pill border-2 px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
              hasIssues
                ? 'border-risk-high text-risk-high hover:bg-risk-high/10'
                : 'border-border text-ink-muted hover:bg-bg-subtle hover:text-ink'
            }`}
          >
            <AlertTriangle size={16} /> Force import
          </button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || step === 'confirming'}
            loading={step === 'confirming'}
          >
            Confirm &amp; import
          </Button>
        </div>
      </div>

      {/* Force Import warning modal */}
      {showForceModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForceModal(false)} />
          <div className={`relative w-full max-w-lg rounded-card border bg-surface p-6 shadow-2xl ${hasIssues ? 'border-risk-high/40' : 'border-border'}`}>
            <div className={`flex items-center gap-2 ${hasIssues ? 'text-risk-high' : 'text-ink'}`}>
              <AlertTriangle size={22} />
              <h3 className="font-display text-lg font-bold">{hasIssues ? 'Force Import Warning' : 'No issues detected'}</h3>
            </div>
            <p className="mt-3 text-sm text-ink-muted">
              {hasIssues
                ? 'This file contains issues that prevent normal import.'
                : 'No validation issues were detected. We recommend using Normal Import (Confirm & Import). You can still force the import if you prefer.'}
            </p>

            {hasIssues && (
              <div className="mt-4 rounded-xl border border-border bg-bg-subtle p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Problems found ({issues.length})</p>
                <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto text-sm text-ink">
                  {issues.map((issue, i) => <li key={i}>• {issue}</li>)}
                </ul>
              </div>
            )}

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Reason (stored in audit log)</label>
              <input
                value={forceReason}
                onChange={(e) => setForceReason(e.target.value)}
                placeholder={hasIssues ? 'Why are you importing despite these issues?' : 'Optional note'}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForceModal(false)}
                className="rounded-pill px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-bg-subtle"
              >
                {hasIssues ? 'Revalidate errors' : 'Use Normal Import'}
              </button>
              <button
                type="button"
                onClick={() => runImport({ force: true })}
                className={`rounded-pill px-4 py-2 text-sm font-bold text-white hover:opacity-90 ${hasIssues ? 'bg-risk-high' : 'bg-primary'}`}
              >
                Proceed anyway
              </button>
            </div>
          </div>
        </div>
      )}
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
