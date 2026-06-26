import { Sun, Moon } from "lucide-react";
import { useAppearance } from "../../context/AppearanceContext";

// ThemeToggle — compact 2-mode segmented control for the navbar (beside the
// bell). Light → Aurora Mist, Dark → Cosmic Nexus, applied instantly via
// setMode (which also persists appearance_mode + selected_theme). Styled with
// theme tokens so it stays visible and high-contrast in every theme: the track
// uses the surface/border tokens, the active segment fills with --primary and
// uses white text, and inactive segments use the muted ink token. There is no
// System/Auto/Custom here by design — only Light and Dark.
function ThemeToggle() {
  const { appearance, setMode } = useAppearance();
  // Treat anything that isn't explicitly "light" as dark for this toggle's
  // active state (custom themes still resolve to one of the two visually).
  const isLight = appearance.appearanceMode === "light";

  const base =
    "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-primary))]";
  const activeCls = "bg-primary text-white shadow-sm";
  const inactiveCls = "text-ink-muted hover:text-ink";

  return (
    <div
      role="radiogroup"
      aria-label="Color mode"
      className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5"
    >
      <button
        type="button"
        role="radio"
        aria-checked={isLight}
        aria-label="Light mode"
        title="Light mode (Aurora Mist)"
        onClick={() => setMode("light")}
        className={`${base} ${isLight ? activeCls : inactiveCls}`}
      >
        <Sun size={14} strokeWidth={2.5} />
        <span className="hidden sm:inline">Light</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={!isLight}
        aria-label="Dark mode"
        title="Dark mode (Cosmic Nexus)"
        onClick={() => setMode("dark")}
        className={`${base} ${!isLight ? activeCls : inactiveCls}`}
      >
        <Moon size={14} strokeWidth={2.5} />
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  );
}

export default ThemeToggle;
