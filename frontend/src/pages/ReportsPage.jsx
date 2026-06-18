import { useEffect, useState } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import ReportService from '../services/reportService';
import PDFService from '../services/pdfService';

const reportTypes = [
  { label: 'Revenue Report', value: 'revenue' },
  { label: 'Profit Report', value: 'profit' },
  { label: 'Customer Report', value: 'customer' },
  { label: 'Inventory Report', value: 'inventory' },
  { label: 'Business Health Report', value: 'health' },
];

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [selectedType, setSelectedType] = useState('revenue');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [feedback, setFeedback] = useState(null);

  const loadReports = async () => {
    try {
      const data = await ReportService.getReports();
      setReports(data);
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to load reports.' });
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setFeedback({ type: 'error', message: 'Please select a start date and end date.' });
      return;
    }

    setIsGenerating(true);
    setFeedback(null);
    try {
      await ReportService.generateReport(selectedType, startDate || null, endDate || null);
      await loadReports();
      setFeedback({ type: 'success', message: 'Report generated.' });
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to generate report.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    setFeedback(null);
    try {
      await PDFService.generatePDF();
      setFeedback({ type: 'success', message: 'PDF downloaded successfully.' });
    } catch (error) {
      setFeedback({ type: 'error', message: 'PDF generation failed.' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />

        <main className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-ink">Reports</h1>
              <p className="mt-2 text-sm text-ink-muted">Generate and review business reports built from KPI, health score, and alert insights.</p>
            </div>
          </div>

          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
                className="rounded-pill border border-border bg-bg px-4 py-2 text-sm text-ink shadow-card"
              >
                {reportTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-pill border border-border bg-bg px-4 py-2 text-sm text-ink"
              />

              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-pill border border-border bg-bg px-4 py-2 text-sm text-ink"
              />

              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-hover disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate report'}
              </button>

              <button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPdf}
                className="rounded-pill bg-risk-low px-5 py-2 text-sm font-semibold text-white shadow-card hover:opacity-90 disabled:opacity-50"
              >
                {isGeneratingPdf ? 'Generating...' : 'Generate PDF'}
              </button>
            </div>

            {feedback && (
              <p className={`mt-4 text-sm font-medium ${feedback.type === 'error' ? 'text-risk-high' : 'text-risk-low'}`}>
                {feedback.message}
              </p>
            )}
          </section>

          <section className="grid gap-6">
            {reports.length === 0 ? (
              <div className="rounded-card border border-border bg-surface p-6 shadow-card text-ink-muted">
                No reports are available yet. Generate a report to get started.
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="rounded-card border border-border bg-surface p-6 shadow-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-ink-muted">{report.report_type.replace('_', ' ')}</p>
                      <h2 className="font-display mt-2 text-2xl font-semibold text-ink">{report.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-ink-muted">{report.payload?.summary}</p>
                    </div>
                    <div className="space-y-2 text-right">
                      <span className="inline-flex rounded-pill bg-bg-subtle px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-ink-muted">
                        {report.status}
                      </span>
                      <p className="text-sm text-ink-muted">{new Date(report.generated_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {report.payload && (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-card border border-border bg-bg-subtle p-4">
                        <h3 className="text-sm font-semibold text-ink">Metrics</h3>
                        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                          {Object.entries(report.payload.metrics).map(([key, value]) => (
                            <li key={key} className="flex justify-between gap-4">
                              <span>{key.replace(/_/g, ' ')}</span>
                              <span className="figure font-semibold text-ink">{String(value)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-card border border-border bg-bg-subtle p-4">
                        <h3 className="text-sm font-semibold text-ink">Risks</h3>
                        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                          {report.payload.risks.map((risk, index) => (
                            <li key={index} className="list-disc pl-4">{risk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {report.payload && (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-card border border-border bg-bg-subtle p-4">
                        <h3 className="text-sm font-semibold text-ink">Trends</h3>
                        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                          {report.payload.trends.map((trend, index) => (
                            <li key={index} className="list-disc pl-4">{trend}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-card border border-border bg-bg-subtle p-4">
                        <h3 className="text-sm font-semibold text-ink">Recommendations</h3>
                        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                          {report.payload.recommendations.map((recommendation, index) => (
                            <li key={index} className="list-disc pl-4">{recommendation}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default ReportsPage;
