import { useCallback, useState } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import DashboardCard from '../components/common/DashboardCard';
import IngestionWizard from '../components/ingestion/IngestionWizard';
import { ingestionService } from '../services/ingestionService';
import { formatDate } from '../utils/formatters';

function IngestionPage() {
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [notification, setNotification] = useState(null);

  const loadTemplates = useCallback(async () => {
    if (templatesLoaded) return;
    setTemplatesLoading(true);
    try {
      const data = await ingestionService.listMappingTemplates();
      setTemplates(data);
      setTemplatesLoaded(true);
    } catch (_) {
      // Non-fatal; the wizard still works without the template list.
    } finally {
      setTemplatesLoading(false);
    }
  }, [templatesLoaded]);

  const handleWizardComplete = useCallback(() => {
    // Reload template list after a successful import so "remembered mappings"
    // reflects the newly saved template.
    setTemplatesLoaded(false);
    loadTemplates();
    setNotification({ type: 'success', message: 'Import complete. Your KPIs and health score have been refreshed.' });
    setTimeout(() => setNotification(null), 6000);
  }, [loadTemplates]);

  const handleDeleteTemplate = async (templateId) => {
    setDeletingId(templateId);
    try {
      await ingestionService.deleteMappingTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      setNotification({ type: 'success', message: 'Mapping template deleted.' });
    } catch (_) {
      setNotification({ type: 'error', message: 'Could not delete this template.' });
    } finally {
      setDeletingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const DOCUMENT_TYPE_LABELS = {
    sales: 'Sales',
    expense: 'Expenses',
    customer: 'Customers',
    inventory: 'Inventory',
    bank_statement: 'Bank statement',
    balance_sheet: 'Balance sheet',
    profit_and_loss: 'P&L',
    gst_report: 'GST report',
    tally_export: 'Tally export',
  };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />

        <main className="space-y-6">
          {/* Page header */}
          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Universal Import</p>
            <h1 className="font-display mt-3 text-3xl font-bold text-ink">Import business data</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Upload any format — Tally exports, GST reports, bank statements, balance sheets,
              P&amp;L statements, or plain CSV/XLSX. We&rsquo;ll detect the format, suggest column mappings,
              and ask you to confirm before anything is written to your records.
            </p>
          </section>

          {/* Notification banner */}
          {notification && (
            <div
              className={`rounded-xl px-5 py-3 text-sm font-medium ${
                notification.type === 'success'
                  ? 'bg-risk-low/10 text-risk-low'
                  : 'bg-risk-high/10 text-risk-high'
              }`}
            >
              {notification.message}
            </div>
          )}

          {/* Wizard */}
          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <IngestionWizard onComplete={handleWizardComplete} />
          </section>

          {/* Remembered mappings panel */}
          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-ink">Remembered formats</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Confirmed mappings we&rsquo;ll reuse automatically on the next upload in the same format.
                </p>
              </div>
              {!templatesLoaded && (
                <button
                  type="button"
                  onClick={loadTemplates}
                  disabled={templatesLoading}
                  className="rounded-pill bg-bg-subtle px-4 py-2 text-sm font-medium text-ink hover:bg-border disabled:opacity-50"
                >
                  {templatesLoading ? 'Loading…' : 'Load'}
                </button>
              )}
            </div>

            {templatesLoaded && templates.length === 0 && (
              <p className="mt-4 text-sm text-ink-muted">
                No saved formats yet — they appear here after your first confirmed import.
              </p>
            )}

            {templatesLoaded && templates.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-card border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-bg-subtle">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-ink">Format type</th>
                      <th className="px-4 py-3 text-left font-semibold text-ink">Headers detected</th>
                      <th className="px-4 py-3 text-left font-semibold text-ink">Used</th>
                      <th className="px-4 py-3 text-left font-semibold text-ink">Last used</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {templates.map((t) => (
                      <tr key={t.id} className="hover:bg-bg-subtle/50 transition">
                        <td className="px-4 py-3 font-medium text-ink">
                          {DOCUMENT_TYPE_LABELS[t.document_type] || t.document_type}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {Array.isArray(t.sample_source_headers)
                            ? t.sample_source_headers.slice(0, 4).join(', ') +
                              (t.sample_source_headers.length > 4 ? '…' : '')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">{t.times_used}×</td>
                        <td className="px-4 py-3 text-ink-muted">
                          {t.last_used_at ? formatDate(t.last_used_at) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(t.id)}
                            disabled={deletingId === t.id}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-risk-high hover:bg-risk-high/10 disabled:opacity-50 transition"
                          >
                            {deletingId === t.id ? 'Removing…' : 'Forget'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default IngestionPage;
