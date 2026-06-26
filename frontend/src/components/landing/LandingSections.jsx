import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Upload, BrainCircuit, LayoutDashboard, Target, FileSpreadsheet, Receipt, Database,
  TrendingUp, Wallet, PiggyBank, Coins, Boxes, ShieldCheck, LineChart, HeartPulse, Users,
  Check, X, Plus, Minus, Sparkles, ArrowRight, Quote, Star, Lock, RefreshCw,
} from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "./Reveal";
import AiCfoChat from "./AiCfoChat";

const EASE = [0.22, 1, 0.36, 1];

// ── Shared section heading ────────────────────────────────────────────────
export function SectionHeading({ eyebrow, title, subtitle, center = true }) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && (
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary backdrop-blur">
          <Sparkles size={12} /> {eyebrow}
        </span>
      )}
      <h2 className="font-display mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-lg leading-7 text-ink-muted">{subtitle}</p>}
    </div>
  );
}

// ── Trusted by ────────────────────────────────────────────────────────────
const INDUSTRIES = ["SMEs", "Retail", "Manufacturing", "Healthcare", "Services", "CA Firms"];
export function TrustedBy() {
  return (
    <section className="border-y border-border bg-bg-subtle/40">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
          Built for the businesses that power the economy
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {INDUSTRIES.map((name) => (
            <span key={name} className="font-display text-lg font-bold text-ink/40 transition hover:text-ink/70">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Problem ───────────────────────────────────────────────────────────────
const PROBLEMS = [
  { icon: FileSpreadsheet, title: "Data trapped in spreadsheets", body: "Your numbers live in Excel, Tally and bank statements — never in one place, never explained." },
  { icon: RefreshCw, title: "You find out too late", body: "A cash crunch, a slipping customer, an overdue filing — discovered after it already cost you." },
  { icon: BrainCircuit, title: "Dashboards, not decisions", body: "Charts tell you what happened. They don't tell you what to do next, or why it matters." },
];
export function ProblemSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
      <Reveal>
        <SectionHeading
          eyebrow="The problem"
          title="Running a business shouldn't mean flying blind"
          subtitle="Most SMEs don't lack data — they lack a CFO to make sense of it. That's expensive to hire and hard to find."
        />
      </Reveal>
      <StaggerGroup className="mt-14 grid gap-6 md:grid-cols-3">
        {PROBLEMS.map((p) => (
          <StaggerItem key={p.title}>
            <div className="group h-full rounded-card border border-border bg-surface p-7 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-risk-high/10 text-risk-high">
                <p.icon size={22} />
              </span>
              <h3 className="font-display mt-5 text-lg font-bold text-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{p.body}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────
const STEPS = [
  { icon: Upload, n: "01", title: "Upload your data", body: "Drop in Excel, CSV, GST returns, Tally exports or bank statements. AI auto-maps every column." },
  { icon: BrainCircuit, n: "02", title: "AI analyses everything", body: "In seconds, Business Copilot computes 18 intelligence modules across your entire business." },
  { icon: LayoutDashboard, n: "03", title: "Get business intelligence", body: "A health score, risks, opportunities and a daily brief — every number explained and traceable." },
  { icon: Target, n: "04", title: "Make better decisions", body: "Act on clear recommendations with rupee-impact estimates. Ask the AI CFO anything, anytime." },
];
export function HowItWorks() {
  return (
    <section id="how" className="border-y border-border bg-bg-subtle/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <SectionHeading eyebrow="How it works" title="From raw files to a Virtual CFO in four steps" subtitle="No setup projects. No consultants. Upload and understand your business in minutes." />
        </Reveal>
        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
          <StaggerGroup className="grid gap-8 lg:grid-cols-4">
            {STEPS.map((s) => (
              <StaggerItem key={s.n}>
                <div className="relative text-center lg:text-left">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-primary shadow-card lg:mx-0">
                    <s.icon size={24} />
                  </div>
                  <span className="font-display mt-4 block text-xs font-bold tracking-widest text-primary">{s.n}</span>
                  <h3 className="font-display mt-1 text-lg font-bold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{s.body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </div>
    </section>
  );
}

// ── Features grid ─────────────────────────────────────────────────────────
const FEATURES = [
  { icon: HeartPulse, title: "Business Health Score", body: "One number that captures your company's financial health, updated with every upload." },
  { icon: TrendingUp, title: "Revenue & Profit Analysis", body: "See what's driving growth and where margin is leaking — with break-even and contribution." },
  { icon: Wallet, title: "Cash Flow & Liquidity", body: "Runway, burn and a 90-day cash forecast so a crunch never takes you by surprise." },
  { icon: Coins, title: "Working Capital", body: "DSO, DIO and the full cash conversion cycle — know exactly where cash is trapped." },
  { icon: Users, title: "Customer Intelligence", body: "RFM segments, churn risk and concentration — protect the revenue that matters most." },
  { icon: Boxes, title: "Inventory Intelligence", body: "Turnover, dead stock and ABC analysis to free capital sitting on your shelves." },
  { icon: PiggyBank, title: "Collections Intelligence", body: "Aging, recovery probability and DSO to get paid faster and cut bad debt." },
  { icon: Receipt, title: "GST & Compliance", body: "ITC, net liability, GSTR-1 vs 2B reconciliation and deadline alerts with penalty exposure." },
  { icon: LineChart, title: "Forecasting", body: "Statistical revenue, expense and profit forecasts with best, expected and worst cases." },
];
export function FeaturesGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
      <Reveal>
        <SectionHeading eyebrow="Everything in one place" title="A complete finance team, powered by AI" subtitle="Eighteen intelligence modules working together — each one explainable, traceable and built for Indian SMEs." />
      </Reveal>
      <StaggerGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <StaggerItem key={f.title}>
            <div className="group relative h-full overflow-hidden rounded-card border border-border bg-surface p-6 shadow-card transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-card-hover">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 opacity-0 transition group-hover:opacity-100" />
              <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-110">
                <f.icon size={20} />
              </span>
              <h3 className="font-display relative mt-4 text-base font-bold text-ink">{f.title}</h3>
              <p className="relative mt-2 text-sm leading-6 text-ink-muted">{f.body}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

// ── AI CFO section ────────────────────────────────────────────────────────
const AI_POINTS = [
  { icon: Sparkles, title: "Ask anything, in plain English", body: "“Why did profit drop?” “Which customers are at risk?” Get answers, not queries." },
  { icon: Target, title: "Recommendations with rupee impact", body: "Every insight comes with a suggested action and an estimated effect on your bottom line." },
  { icon: BrainCircuit, title: "Explain every KPI", body: "Tap any number to see the formula, the source data and the confidence behind it." },
];
export function AiCfoSection() {
  return (
    <section id="ai" className="relative overflow-hidden border-y border-border bg-bg-subtle/40 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2">
        <Reveal>
          <SectionHeading center={false} eyebrow="Meet your AI CFO" title="The first analyst who actually explains the answer" subtitle="Business Copilot doesn't just show numbers — it interprets them, defends them, and tells you what to do next." />
          <div className="mt-8 space-y-5">
            {AI_POINTS.map((p) => (
              <div key={p.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <p.icon size={18} />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">{p.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <AiCfoChat />
        </Reveal>
      </div>
    </section>
  );
}

// ── Comparison ────────────────────────────────────────────────────────────
const COMPARE = [
  ["Time to insight", "Days or weeks", "Seconds"],
  ["Cost", "₹50k–2L / month for a CFO", "A fraction of one salary"],
  ["Explains every number", false, true],
  ["Forecasts & scenarios", "Manual, if at all", "Built-in & automatic"],
  ["GST reconciliation", "Spreadsheets", "Automated GSTR-1 vs 2B"],
  ["Available 24/7", false, true],
  ["Works with your files", "Re-keying needed", "Excel, Tally, GST, CSV"],
];
export function ComparisonSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
      <Reveal>
        <SectionHeading eyebrow="The difference" title="Traditional finance vs Business Copilot" />
      </Reveal>
      <Reveal delay={0.1}>
        <div className="mt-12 overflow-hidden rounded-card border border-border bg-surface shadow-card">
          <div className="grid grid-cols-3 border-b border-border bg-bg-subtle/60">
            <div className="px-5 py-4 text-sm font-semibold text-ink-muted">Capability</div>
            <div className="px-5 py-4 text-center text-sm font-semibold text-ink-muted">Traditional</div>
            <div className="flex items-center justify-center gap-1.5 bg-primary/5 px-5 py-4 text-center text-sm font-bold text-primary">
              <Sparkles size={14} /> Business Copilot
            </div>
          </div>
          {COMPARE.map(([label, trad, bc], i) => (
            <div key={label} className={`grid grid-cols-3 items-center ${i % 2 ? "bg-bg-subtle/30" : ""}`}>
              <div className="px-5 py-4 text-sm font-medium text-ink">{label}</div>
              <div className="px-5 py-4 text-center text-sm text-ink-muted">
                {trad === false ? <X size={16} className="mx-auto text-risk-high/60" /> : trad}
              </div>
              <div className="bg-primary/[0.03] px-5 py-4 text-center text-sm font-semibold text-ink">
                {bc === true ? <Check size={18} className="mx-auto text-risk-low" /> : bc}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────
const PLANS = [
  { name: "Starter", tagline: "For solo founders getting started", monthly: 0, yearly: 0, cta: "Start free", highlight: false,
    features: ["1 business", "Excel & CSV uploads", "Business Health Score", "Core revenue & cash insights", "AI CFO chat (limited)"] },
  { name: "Growth", tagline: "For growing SMEs that want it all", monthly: 2499, yearly: 1999, cta: "Start free trial", highlight: true,
    features: ["Everything in Starter", "All 18 intelligence modules", "GST, Tally & bank imports", "Forecasting & scenarios", "Unlimited AI CFO chat", "Explain every KPI + drilldown"] },
  { name: "Enterprise", tagline: "For CA firms & multi-entity groups", monthly: null, yearly: null, cta: "Talk to sales", highlight: false,
    features: ["Everything in Growth", "Multiple businesses", "Role-based access", "Priority support & onboarding", "Custom reports & exports"] },
];
export function PricingSection() {
  const [yearly, setYearly] = useState(true);
  return (
    <section id="pricing" className="border-y border-border bg-bg-subtle/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <SectionHeading eyebrow="Pricing" title="Simple pricing that pays for itself" subtitle="Less than the cost of a single finance hire — with a free plan to start today." />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!yearly ? "text-ink" : "text-ink-muted"}`}>Monthly</span>
            <button
              onClick={() => setYearly((v) => !v)}
              className="relative h-7 w-12 rounded-full bg-primary/20 transition"
              role="switch" aria-checked={yearly} aria-label="Toggle yearly pricing"
            >
              <motion.span layout className={`absolute top-1 h-5 w-5 rounded-full bg-primary shadow ${yearly ? "left-6" : "left-1"}`} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
            </button>
            <span className={`text-sm font-medium ${yearly ? "text-ink" : "text-ink-muted"}`}>
              Yearly <span className="ml-1 rounded-pill bg-risk-low/10 px-2 py-0.5 text-xs font-semibold text-risk-low">Save 20%</span>
            </span>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => {
            const price = yearly ? plan.yearly : plan.monthly;
            return (
              <Reveal key={plan.name} delay={i * 0.08}>
                <div className={`relative flex h-full flex-col rounded-card border p-7 shadow-card transition ${
                  plan.highlight ? "border-primary bg-surface shadow-[0_20px_50px_-20px_rgb(var(--c-primary)/0.4)] lg:-translate-y-3" : "border-border bg-surface"
                }`}>
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-primary px-3 py-1 text-xs font-bold text-white shadow">
                      Best value
                    </span>
                  )}
                  <h3 className="font-display text-lg font-bold text-ink">{plan.name}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{plan.tagline}</p>
                  <div className="mt-5 flex items-end gap-1">
                    {price === null ? (
                      <span className="font-display text-3xl font-bold text-ink">Custom</span>
                    ) : price === 0 ? (
                      <span className="font-display text-4xl font-bold text-ink">Free</span>
                    ) : (
                      <>
                        <span className="font-display text-4xl font-bold text-ink">₹{price.toLocaleString("en-IN")}</span>
                        <span className="mb-1.5 text-sm text-ink-muted">/mo</span>
                      </>
                    )}
                  </div>
                  {yearly && price > 0 && <p className="mt-1 text-xs text-ink-muted">billed annually</p>}

                  <Link
                    to={plan.name === "Enterprise" ? "/register" : "/register"}
                    className={`mt-6 block rounded-pill px-5 py-2.5 text-center text-sm font-semibold transition ${
                      plan.highlight ? "bg-primary text-white hover:bg-primary-hover" : "border border-border text-ink hover:bg-bg-subtle"
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  <ul className="mt-6 space-y-3 border-t border-border pt-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                        <Check size={16} className="mt-0.5 shrink-0 text-risk-low" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { quote: "It caught a cash crunch three weeks before it would have hit. That alert alone paid for the year.", name: "Rahul Mehta", role: "Founder, Mehta Textiles" },
  { quote: "Finally I understand my own numbers. The AI explains every figure like a patient CFO would.", name: "Priya Sharma", role: "Director, Sharma Healthcare" },
  { quote: "We replaced three spreadsheets and a part-time analyst. Reconciliation that took days now takes minutes.", name: "Anand Iyer", role: "Partner, Iyer & Associates (CA)" },
];
export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
      <Reveal>
        <SectionHeading eyebrow="Loved by operators" title="Built for the people who run the business" />
      </Reveal>
      <StaggerGroup className="mt-14 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <StaggerItem key={t.name}>
            <figure className="flex h-full flex-col rounded-card border border-border bg-surface p-7 shadow-card">
              <Quote size={24} className="text-primary/30" />
              <div className="mt-2 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} className="fill-gold text-gold" />)}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-7 text-ink">“{t.quote}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                  {t.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{t.name}</p>
                  <p className="text-xs text-ink-muted">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "What data can I upload?", a: "Excel, CSV, GST returns, Tally exports and bank statements. AI automatically detects the file type and maps every column — you just confirm." },
  { q: "Is my financial data secure?", a: "Yes. Your data is encrypted in transit and at rest, access is role-based, and your information is never shared. Security is built in by design." },
  { q: "Do I need an accountant to use it?", a: "No. Business Copilot is built so any business owner can understand their finances. Every KPI is explained in plain language with its source data." },
  { q: "How accurate are the forecasts?", a: "Forecasts use statistical models on your own history and always show a confidence level plus best, expected and worst-case scenarios — never a single false-precision number." },
  { q: "Can I try it for free?", a: "Absolutely. The Starter plan is free forever, and Growth comes with a free trial. No credit card required to begin." },
  { q: "Does it work for my industry?", a: "Yes — retail, manufacturing, healthcare, services and CA firms all use it. The intelligence adapts to whatever data you upload." },
];
export function FaqSection() {
  const [open, setOpen] = useState(0);
  const reduce = useReducedMotion();
  return (
    <section id="faq" className="border-t border-border bg-bg-subtle/40 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        </Reveal>
        <div className="mt-12 space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.04}>
                <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-display text-base font-semibold text-ink">{f.q}</span>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${isOpen ? "bg-primary text-white" : "bg-bg-subtle text-ink-muted"}`}>
                      {isOpen ? <Minus size={15} /> : <Plus size={15} />}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                      >
                        <p className="px-5 pb-5 text-sm leading-7 text-ink-muted">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────
export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-primary to-primary-hover px-8 py-16 text-center shadow-[0_30px_80px_-24px_rgb(var(--c-primary)/0.6)] sm:px-16">
          <div aria-hidden className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Meet the CFO your business deserves
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-7 text-white/80">
              Upload your first file and get a complete picture of your business in minutes. Free to start.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-pill bg-white px-7 py-3.5 text-sm font-bold text-primary shadow-lg transition hover:shadow-xl">
                Start free <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </Link>
              <Link to="/login" className="rounded-pill border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
                Sign in
              </Link>
            </div>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-white/70">
              <Lock size={12} /> Bank-level encryption · No credit card required
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────
export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-bg-subtle/40">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <p className="text-sm text-ink-muted">© {new Date().getFullYear()} Business Copilot. AI-powered Virtual CFO for SMEs.</p>
          <div className="flex items-center gap-6 text-sm text-ink-muted">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
            <Link to="/login" className="hover:text-ink">Sign in</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
