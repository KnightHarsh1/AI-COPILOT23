import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, ShieldCheck, Lock, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import BrandLogo from "../common/BrandLogo";
import AuroraBackground from "../landing/AuroraBackground";
import { HealthRing, KpiTile, AiBriefCard } from "../landing/DashboardPreview";
import { TrendingUp, Wallet } from "lucide-react";

// ════════════════════════════════════════════════════════════════════════
// Unified authentication design system. AuthLayout gives every auth screen the
// same premium split-screen: a branded, product-showing left panel and a clean
// form panel on the right. On mobile the brand panel collapses to a compact
// header so the form stays front-and-centre. All form logic stays in the pages;
// these are presentation-only primitives, so the existing auth/API flow is
// untouched.
// ════════════════════════════════════════════════════════════════════════

const TRUST = [
  { icon: ShieldCheck, label: "Bank-level encryption" },
  { icon: Lock, label: "Private by design" },
  { icon: KeyRound, label: "Role-based access" },
];

function BrandPanel({ tagline }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative hidden overflow-hidden bg-bg-subtle/40 lg:flex lg:flex-col lg:justify-between lg:p-12">
      <AuroraBackground />
      <div className="relative">
        <BrandLogo size="lg" />
        <p className="mt-10 max-w-sm font-display text-3xl font-bold leading-tight tracking-tight text-ink">
          {tagline || "The AI CFO that explains every number in your business."}
        </p>
        <p className="mt-4 max-w-sm text-sm leading-6 text-ink-muted">
          Upload your data and get a health score, forecasts, risks and clear next steps — in seconds.
        </p>
      </div>

      {/* Live product preview */}
      <motion.div
        className="relative mt-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="rounded-[22px] border border-border bg-surface/90 p-5 shadow-[0_24px_60px_-24px_rgb(var(--c-primary)/0.4)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Business Health</p>
              <p className="font-display text-base font-bold text-ink">Strong & improving</p>
            </div>
            <HealthRing score={86} size={84} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <KpiTile icon={TrendingUp} label="Revenue (MTD)" value="₹8.6L" delta="18%" positive />
            <KpiTile icon={Wallet} label="Net profit" value="₹2.1L" delta="12%" positive />
          </div>
          <div className="mt-3"><AiBriefCard compact /></div>
        </div>
      </motion.div>

      <div className="relative mt-10 flex flex-wrap gap-x-6 gap-y-2">
        {TRUST.map((t) => (
          <span key={t.label} className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <t.icon size={14} className="text-risk-low" /> {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AuthLayout({ children, title, subtitle, tagline, footer }) {
  const reduce = useReducedMotion();
  return (
    <main className="min-h-screen bg-bg text-ink antialiased lg:grid lg:grid-cols-2">
      <BrandPanel tagline={tagline} />

      {/* Form panel */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10 sm:px-8">
        {/* Mobile brand header */}
        <div className="mb-8 lg:hidden"><BrandLogo /></div>

        <motion.div
          className="w-full max-w-md"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6">{footer}</div>}
        </motion.div>

        <p className="mt-10 flex items-center gap-1.5 text-xs text-ink-muted lg:hidden">
          <ShieldCheck size={13} className="text-risk-low" /> Bank-level encryption · Private by design
        </p>
      </div>
    </main>
  );
}

// ── AuthInput: label, focus glow, optional password toggle, inline error ──
export function AuthInput({ label, type = "text", value, onChange, error, autoComplete, name, placeholder, hint, ...rest }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-ink">{label}</label>
      <div className="relative mt-1.5">
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`w-full rounded-xl border bg-bg-subtle px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-muted/60 focus:bg-surface focus:ring-2 ${
            error ? "border-risk-high focus:border-risk-high focus:ring-risk-high/20" : "border-border focus:border-primary focus:ring-primary/20"
          } ${isPassword ? "pr-11" : ""}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition hover:text-ink"
            aria-label={show ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className="mt-1.5 flex items-center gap-1 text-sm text-risk-high">
          <AlertCircle size={13} /> {error}
        </p>
      )}
    </div>
  );
}

// ── AuthButton: primary submit with loading spinner ──────────────────────
export function AuthButton({ children, loading, ...rest }) {
  return (
    <button
      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-pill bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_20px_-6px_rgb(var(--c-primary)/0.6)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
      disabled={loading}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}

// ── PasswordStrength: live meter from simple heuristics ──────────────────
export function PasswordStrength({ value }) {
  if (!value) return null;
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  const levels = [
    { label: "Weak", color: "bg-risk-high", text: "text-risk-high" },
    { label: "Fair", color: "bg-gold", text: "text-gold" },
    { label: "Good", color: "bg-gold", text: "text-gold" },
    { label: "Strong", color: "bg-risk-low", text: "text-risk-low" },
  ];
  const idx = Math.max(0, score - 1);
  const lvl = levels[idx];
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition ${i < score ? lvl.color : "bg-border"}`} />
        ))}
      </div>
      <p className={`mt-1 text-xs font-medium ${lvl.text}`}>{lvl.label} password</p>
    </div>
  );
}

// ── Inline form-level error / success banners ────────────────────────────
export function FormError({ children }) {
  if (!children) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 rounded-xl border border-risk-high/30 bg-risk-high/5 px-3.5 py-2.5 text-sm text-risk-high"
    >
      <AlertCircle size={15} className="mt-0.5 shrink-0" /> <span>{children}</span>
    </motion.div>
  );
}

export function FormSuccess({ children }) {
  if (!children) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      className="flex items-start gap-2 rounded-xl border border-risk-low/30 bg-risk-low/5 px-3.5 py-2.5 text-sm text-risk-low"
    >
      <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> <span>{children}</span>
    </motion.div>
  );
}

// ── Checkbox (Remember me / Accept terms) ────────────────────────────────
export function AuthCheckbox({ checked, onChange, children, name }) {
  return (
    <label htmlFor={name} className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-muted">
      <input
        id={name} name={name} type="checkbox" checked={checked} onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-[rgb(var(--c-primary))] focus:ring-primary/30"
      />
      <span>{children}</span>
    </label>
  );
}
