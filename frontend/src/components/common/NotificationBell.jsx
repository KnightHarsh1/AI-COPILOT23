import { useEffect, useRef, useState } from "react";
import GrowthService from "../../services/growthService";

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  const load = () => {
    GrowthService.getNotifications().then((d) => setItems(d.notifications || [])).catch(() => {});
  };

  useEffect(() => {
    load();
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        className="relative rounded-full p-2 text-ink-muted transition hover:bg-bg-subtle" aria-label="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {items.length > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-risk-high" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-card border border-border bg-surface shadow-card-hover">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-ink">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-muted">Nothing yet. Alerts and updates will appear here.</p>
            ) : (
              items.map((n, i) => (
                <div key={i} className="border-b border-border/50 px-4 py-3 last:border-0">
                  <p className="text-sm font-medium text-ink">{n.title}</p>
                  {n.detail && <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{n.detail}</p>}
                  {n.date && <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-muted">{new Date(n.date).toLocaleString()}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
