import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Play, Sparkles, ShieldCheck, Zap, Lock } from "lucide-react";
import LandingNav from "../components/landing/LandingNav";
import AuroraBackground from "../components/landing/AuroraBackground";
import HeroDashboardMock from "../components/landing/HeroDashboardMock";
import { Reveal } from "../components/landing/Reveal";
import {
  TrustedBy, ProblemSection, HowItWorks, FeaturesGrid, AiCfoSection,
  ComparisonSection, PricingSection, Testimonials, FaqSection, FinalCta, LandingFooter,
} from "../components/landing/LandingSections";

// LandingPage — the public marketing experience. Composed entirely from
// reusable landing components that share the app's design tokens, so the page
// feels like one cohesive premium product. Auth CTAs route to the existing
// /register and /login flows (unchanged).

const HERO_STATS = [
  { value: "18", label: "Intelligence modules" },
  { value: "<15s", label: "To first insight" },
  { value: "100%", label: "KPIs explained" },
];

function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <AuroraBackground dense />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface/70 px-4 py-1.5 text-xs font-semibold text-ink-muted backdrop-blur"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles size={11} /></span>
            AI-powered Virtual CFO for SMEs
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="font-display mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
          >
            Your business,{" "}
            <span className="relative whitespace-nowrap">
              <span className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">finally explained</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-xl text-lg leading-7 text-ink-muted lg:mx-0"
          >
            Upload your Excel, Tally, GST or bank data. Business Copilot turns it into a health score, forecasts, risks and clear next steps — like a CFO who never sleeps.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start"
          >
            <Link
              to="/register"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-pill bg-primary px-7 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgb(var(--c-primary)/0.6)] transition hover:bg-primary-hover sm:w-auto"
            >
              Start free <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how"
              className="inline-flex w-full items-center justify-center gap-2 rounded-pill border border-border bg-surface/60 px-7 py-3.5 text-sm font-semibold text-ink backdrop-blur transition hover:bg-bg-subtle sm:w-auto"
            >
              <Play size={14} className="text-primary" /> Watch demo
            </a>
          </motion.div>

          {/* Trust line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-muted lg:justify-start"
          >
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-risk-low" /> Bank-level security</span>
            <span className="flex items-center gap-1.5"><Zap size={14} className="text-primary" /> Insights in seconds</span>
            <span className="flex items-center gap-1.5"><Lock size={14} className="text-ink-muted" /> No card required</span>
          </motion.div>

          {/* Hero stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.36 }}
            className="mt-10 grid max-w-md grid-cols-3 gap-4 lg:mx-0"
          >
            {HERO_STATS.map((s) => (
              <div key={s.label} className="text-center lg:text-left">
                <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs leading-tight text-ink-muted">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Product mock */}
        <div className="relative">
          <HeroDashboardMock />
        </div>
      </div>
    </section>
  );
}

function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-bg text-ink antialiased">
      <LandingNav />
      <Hero />
      <TrustedBy />
      <ProblemSection />
      <HowItWorks />
      <FeaturesGrid />
      <AiCfoSection />
      <ComparisonSection />
      <PricingSection />
      <Testimonials />
      <FaqSection />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}

export default LandingPage;
