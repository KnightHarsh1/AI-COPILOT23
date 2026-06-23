import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Building2, CreditCard, Settings as SettingsIcon, HelpCircle, LogOut, ChevronDown } from "lucide-react";

const AVATAR_COLORS = {
  indigo: "#4338ca", emerald: "#059669", amber: "#d97706",
  rose: "#e11d48", sky: "#0284c7", violet: "#7c3aed",
};

// Professional avatar dropdown for the navbar. Shows the user's photo/colour/
// initials and opens a menu with profile, business, subscription, settings,
// help, and logout. Routing only — no auth/backend changes.
function AvatarMenu({ user, onLogout }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const initials = user?.first_name
    ? `${user.first_name[0]}${user.last_name ? user.last_name[0] : ""}`.toUpperCase()
    : "BC";
  const displayName = user?.first_name || user?.email?.split("@")[0] || "Account";

  const go = (path) => { setOpen(false); navigate(path); };

  const items = [
    { label: "My Profile", icon: User, action: () => go("/app/settings?section=profile") },
    { label: "Business Profile", icon: Building2, action: () => go("/app/settings?section=business") },
    { label: "Subscription Plan", icon: CreditCard, action: () => go("/app/settings?section=subscription") },
    { label: "Settings", icon: SettingsIcon, action: () => go("/app/settings") },
    { label: "Help Center", icon: HelpCircle, action: () => go("/app/chat") },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-pill border border-border bg-surface py-1 pl-1 pr-2.5 transition hover:border-primary/40"
      >
        <span
          className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-bg-subtle text-xs font-semibold text-ink"
          style={user?.avatar_preset && !user?.avatar_url ? { backgroundColor: AVATAR_COLORS[user.avatar_preset] || undefined, color: "#fff" } : undefined}
        >
          {user?.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
        </span>
        <span className="hidden max-w-[120px] truncate text-sm font-semibold text-ink sm:block">{displayName}</span>
        <ChevronDown size={15} className={`text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-bold text-ink">{displayName}</p>
              {user?.email && <p className="truncate text-xs text-ink-muted">{user.email}</p>}
            </div>
            <div className="p-1.5">
              {items.map((it) => (
                <button
                  key={it.label}
                  type="button"
                  onClick={it.action}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-muted transition hover:bg-bg-subtle hover:text-ink"
                >
                  <it.icon size={16} /> {it.label}
                </button>
              ))}
            </div>
            <div className="border-t border-border p-1.5">
              <button
                type="button"
                onClick={() => { setOpen(false); onLogout(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-risk-high transition hover:bg-risk-high/10"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AvatarMenu;
