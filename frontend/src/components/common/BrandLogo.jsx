import { Link } from "react-router-dom";

// BrandLogo — the single source of truth for the Business Copilot wordmark used
// across the landing page and authentication screens, so branding stays
// perfectly consistent everywhere. `to` makes it a router link; pass to={null}
// for a static mark.
function BrandLogo({ to = "/", className = "", size = "md", inverted = false }) {
  const dims = size === "lg" ? "h-10 w-10 text-base" : size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  const word = size === "lg" ? "text-xl" : size === "sm" ? "text-base" : "text-lg";
  const inkClass = inverted ? "text-white" : "text-ink";

  const inner = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className={`relative flex ${dims} items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover font-bold text-white shadow-[0_4px_14px_-2px_rgb(var(--c-primary)/0.5)]`}>
        <span className="relative z-10">B</span>
        <span className="absolute inset-0 rounded-xl bg-white/10" />
      </span>
      <span className={`font-display ${word} font-bold tracking-tight ${inkClass}`}>
        Business<span className="text-primary">Copilot</span>
      </span>
    </span>
  );

  if (to === null) return inner;
  return <Link to={to} aria-label="Business Copilot home" className="inline-flex">{inner}</Link>;
}

export default BrandLogo;
