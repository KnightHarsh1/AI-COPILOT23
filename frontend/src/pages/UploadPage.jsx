import { useEffect, useMemo, useState, useCallback } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import DashboardCard from '../components/common/DashboardCard';
import UploadDropzone from '../components/common/UploadDropzone';
import { uploadService } from '../services/uploadService';
import { formatFileSize, formatDate, formatTime, formatRelativeTime, formatNumber } from '../utils/formatters';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const STATUS_STYLES = {
  processed: 'bg-risk-low/10 text-risk-low',
  duplicate: 'bg-risk-medium/10 text-risk-medium',
  failed: 'bg-risk-high/10 text-risk-high',
};

function UploadPage() {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const validFiles = useMemo(() => files.filter((item) => !item.error), [files]);

  const refreshHistoryAndAnalytics = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const [historyData, analyticsData] = await Promise.all([
        uploadService.getHistory(),
        uploadService.getAnalytics(),
      ]);
      setHistory(historyData);
      setAnalytics(analyticsData);
    } catch (error) {
      // History/analytics are supplementary — upload itself still works.
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshHistoryAndAnalytics();
  }, [refreshHistoryAndAnalytics]);

  const handleFilesSelected = (newFiles) => {
    const nextFiles = Array.from(newFiles).map((file) => {
      const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        return { id: generateId(), file, error: 'Unsupported file format.' };
      }
      if (file.size > MAX_FILE_SIZE) {
        return { id: generateId(), file, error: 'File exceeds the 10 MB limit.' };
      }
      return { id: generateId(), file, progress: 0, status: 'ready' };
    });

    setFiles((current) => [...current, ...nextFiles]);
  };

  const handleRemoveFile = (fileId) => {
    setFiles((current) => current.filter((item) => item.id !== fileId));
  };

  const handleUpload = async () => {
    setNotification(null);
    setIsUploading(true);

    for (const fileState of files) {
      if (fileState.error || fileState.status === 'uploaded') continue;

      setFiles((current) =>
        current.map((item) => (item.id === fileState.id ? { ...item, status: 'uploading', progress: 0 } : item))
      );

      try {
        const response = await uploadService.uploadFile(fileState.file, (progressEvent) => {
          const progress = progressEvent.total
            ? Math.min(100, Math.round((progressEvent.loaded * 100) / progressEvent.total))
            : 0;
          setFiles((current) => current.map((item) => (item.id === fileState.id ? { ...item, progress } : item)));
        });

        const result = response.data;

        setFiles((current) =>
          current.map((item) =>
            item.id === fileState.id
              ? { ...item, status: 'uploaded', progress: 100, result }
              : item
          )
        );

        if (result.is_duplicate) {
          setNotification({
            type: 'warning',
            message: `"${result.original_filename}": ${result.message}`,
          });
        } else {
          setNotification({
            type: 'success',
            message: `"${result.original_filename}": Sales added ${result.sales_added} · Expenses added ${result.expenses_added} · Duplicates skipped ${result.duplicates_skipped}.`,
          });
        }
      } catch (error) {
        const message = error.response?.data?.detail || 'Upload failed. Please try again.';

        setFiles((current) =>
          current.map((item) => (item.id === fileState.id ? { ...item, error: message, status: 'failed' } : item))
        );

        setNotification({ type: 'error', message });
      }
    }

    setIsUploading(false);
    refreshHistoryAndAnalytics();
  };

  const handleDeleteFile = async (fileId) => {
    setDeletingId(fileId);
    try {
      await uploadService.deleteFile(fileId);
      setConfirmDeleteId(null);
      await refreshHistoryAndAnalytics();
      setNotification({ type: 'success', message: 'File and its imported records were deleted.' });
    } catch (error) {
      setNotification({ type: 'error', message: error.response?.data?.detail || 'Could not delete this file.' });
    } finally {
      setDeletingId(null);
    }
  };

  const analyticsCards = [
    { title: 'Files Uploaded', value: analytics ? formatNumber(analytics.total_files) : '—' },
    { title: 'Sales Imported', value: analytics ? formatNumber(analytics.total_sales_imported) : '—' },
    { title: 'Expenses Imported', value: analytics ? formatNumber(analytics.total_expenses_imported) : '—' },
    { title: 'Last Upload', value: analytics?.last_upload_at ? formatRelativeTime(analytics.last_upload_at) : 'No uploads yet' },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />

        <main className="space-y-6">
          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">File Upload</p>
            <h1 className="font-display mt-3 text-3xl font-bold text-ink">Upload your business data</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Drop a sales or expense CSV/XLSX file. We&rsquo;ll import it, detect duplicates, and refresh your
              alerts and recommendations automatically.
            </p>
          </section>

          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {analyticsCards.map((card) => (
              <DashboardCard key={card.title} title={card.title} value={card.value} />
            ))}
          </section>

          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <div className="space-y-6">
              <UploadDropzone onFilesSelected={handleFilesSelected} />

              {notification && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm font-medium ${
                    notification.type === 'success'
                      ? 'bg-risk-low/10 text-risk-low'
                      : notification.type === 'warning'
                      ? 'bg-risk-medium/10 text-risk-medium'
                      : 'bg-risk-high/10 text-risk-high'
                  }`}
                >
                  {notification.message}
                </div>
              )}

              {files.length > 0 && (
                <div className="rounded-card border border-border bg-bg-subtle p-5">
                  <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink">Selected files</p>
                      <p className="text-sm text-ink-muted">Review and upload files once validation is complete.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={isUploading || validFiles.length === 0}
                      className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUploading ? 'Uploading…' : 'Start upload'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {files.map((item) => (
                      <div key={item.id} className="rounded-xl bg-surface p-4 shadow-card">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-ink">{item.file.name}</p>
                            <p className="text-sm text-ink-muted">{formatFileSize(item.file.size)}</p>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span
                              className={`rounded-pill px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${
                                item.error
                                  ? 'bg-risk-high/10 text-risk-high'
                                  : item.status === 'uploaded'
                                  ? 'bg-risk-low/10 text-risk-low'
                                  : item.status === 'uploading'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-bg-subtle text-ink-muted'
                              }`}
                            >
                              {item.error ? 'Invalid' : item.status || 'Ready'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(item.id)}
                              className="text-sm font-medium text-ink-muted transition hover:text-ink"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {item.error ? (
                          <p className="mt-3 text-sm text-risk-high">{item.error}</p>
                        ) : (
                          <div className="mt-3 overflow-hidden rounded-pill bg-bg-subtle">
                            <div
                              className="h-2 rounded-pill bg-primary transition-all duration-300"
                              style={{ width: `${item.progress ?? 0}%` }}
                            />
                          </div>
                        )}

                        {item.result && !item.result.is_duplicate && (
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-lg bg-bg-subtle py-2">
                              <p className="figure font-semibold text-ink">{item.result.sales_added}</p>
                              <p className="text-ink-muted">Sales added</p>
                            </div>
                            <div className="rounded-lg bg-bg-subtle py-2">
                              <p className="figure font-semibold text-ink">{item.result.expenses_added}</p>
                              <p className="text-ink-muted">Expenses added</p>
                            </div>
                            <div className="rounded-lg bg-bg-subtle py-2">
                              <p className="figure font-semibold text-ink">{item.result.duplicates_skipped}</p>
                              <p className="text-ink-muted">Duplicates skipped</p>
                            </div>
                          </div>
                        )}

                        {item.result?.is_duplicate && (
                          <p className="mt-3 text-sm font-medium text-risk-medium">
                            ⚠ This file appears to have already been imported.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <h2 className="font-display mb-4 text-xl font-semibold text-ink">Uploaded files history</h2>

            {historyLoading && <p className="text-sm text-ink-muted">Loading upload history…</p>}

            {!historyLoading && history.length === 0 && (
              <p className="text-sm text-ink-muted">No files uploaded yet.</p>
            )}

            {!historyLoading && history.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                      <th className="py-2 pr-4 font-semibold">File name</th>
                      <th className="py-2 pr-4 font-semibold">Type</th>
                      <th className="py-2 pr-4 font-semibold">Upload date</th>
                      <th className="py-2 pr-4 font-semibold">Upload time</th>
                      <th className="py-2 pr-4 font-semibold">Status</th>
                      <th className="py-2 pr-4 font-semibold">Records imported</th>
                      <th className="py-2 pr-0 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record.id} className="border-b border-border last:border-0">
                        <td className="max-w-[220px] truncate py-3 pr-4 font-medium text-ink">{record.original_filename}</td>
                        <td className="py-3 pr-4 text-ink-muted uppercase">
                          {record.original_filename.split('.').pop()}
                        </td>
                        <td className="py-3 pr-4 text-ink-muted">{formatDate(record.created_at)}</td>
                        <td className="py-3 pr-4 text-ink-muted">{formatTime(record.created_at)}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[record.status] || 'bg-bg-subtle text-ink-muted'}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="figure py-3 pr-4 text-ink">{record.records_imported}</td>
                        <td className="py-3 pr-0 text-right">
                          {confirmDeleteId === record.id ? (
                            <span className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDeleteFile(record.id)}
                                disabled={deletingId === record.id}
                                className="rounded-pill bg-risk-high px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                              >
                                {deletingId === record.id ? 'Deleting…' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-pill px-3 py-1 text-xs font-semibold text-ink-muted hover:bg-bg-subtle"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(record.id)}
                              className="rounded-pill px-3 py-1 text-xs font-semibold text-risk-high hover:bg-risk-high/10"
                            >
                              Delete
                            </button>
                          )}
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

export default UploadPage;
