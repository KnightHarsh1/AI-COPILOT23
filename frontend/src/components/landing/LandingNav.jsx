import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import BrandLogo from "../common/BrandLogo";

// LandingNav — sticky, scroll-aware navigation that turns to frosted glass after
// scroll. Anchor links to page sections + auth CTAs. Mobile menu included.
const LINKS = [
  { label: "Product", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "AI CFO", href: "#ai" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-border bg-bg/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        <BrandLogo />

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-pill px-3.5 py-2 text-sm font-medium text-ink-muted transition hover:bg-bg-subtle hover:text-ink">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login" className="rounded-pill px-4 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink">
            Sign in
          </Link>
          <Link
            to="/register"
            className="group relative overflow-hidden rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgb(var(--c-primary)/0.6)] transition hover:bg-primary-hover"
          >
            Start free
          </Link>
        </div>

        <button onClick={() => setOpen((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-lg text-ink md:hidden" aria-label="Toggle menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border bg-bg/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-1 px-5 py-4">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-bg-subtle hover:text-ink">
                  {l.label}
                </a>
              ))}
              <div className="flex gap-2 pt-2">
                <Link to="/login" className="flex-1 rounded-pill border border-border px-4 py-2.5 text-center text-sm font-semibold text-ink">Sign in</Link>
                <Link to="/register" className="flex-1 rounded-pill bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white">Start free</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default LandingNav;
