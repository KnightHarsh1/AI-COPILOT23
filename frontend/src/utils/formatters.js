// This product's spec and target market are Indian SMBs (₹ figures throughout),
// so currency formatting defaults to INR rather than the previous hardcoded USD.
export function formatCurrency(value, options = {}) {
  const numeric = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    ...options,
  }).format(numeric);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
}

// Compact Indian-format currency for tight spaces like KPI cards, where a
// full figure such as ₹12,54,32,456 would overflow. Uses the Indian
// thousand/lakh/crore scale (K / L / Cr), not the Western K/M/B, because
// that's what an Indian SME owner reads instinctively.
export function formatCurrencyCompact(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1.0e7) return `${sign}₹${(abs / 1.0e7).toFixed(2).replace(/\.00$/, '')}Cr`;
  if (abs >= 1.0e5) return `${sign}₹${(abs / 1.0e5).toFixed(2).replace(/\.00$/, '')}L`;
  if (abs >= 1.0e3) return `${sign}₹${(abs / 1.0e3).toFixed(1).replace(/\.0$/, '')}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

// Compact plain number (12.5L, 3.2Cr) for non-currency big counts.
export function formatNumberCompact(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1.0e7) return `${sign}${(abs / 1.0e7).toFixed(2).replace(/\.00$/, '')}Cr`;
  if (abs >= 1.0e5) return `${sign}${(abs / 1.0e5).toFixed(2).replace(/\.00$/, '')}L`;
  if (abs >= 1.0e3) return `${sign}${(abs / 1.0e3).toFixed(1).replace(/\.0$/, '')}K`;
  return `${sign}${abs.toFixed(0)}`;
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';
  return `${formatDate(dateString)} · ${formatTime(dateString)}`;
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDays = Math.round(diffHr / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDate(dateString);
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
