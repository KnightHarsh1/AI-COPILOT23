import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LifeBuoy, Bot, BookOpen, Mail, MessageCircleQuestion } from "lucide-react";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";

// Help Center — support landing page. Routes to the AI CFO for questions and
// surfaces common topics. Static content for now (no backend dependency).
const TOPICS = [
  { q: "How is my Business Health Score calculated?", a: "It blends revenue growth, profitability, inventory health, customer risk, and liquidity into a 0–100 score. Open any score and click it to see the full breakdown." },
  { q: "Where does my data come from?", a: "From the files you import in the Data Center — sales, expenses, bank statements, and more. Every KPI shows its source via the “Explain this number” info icon." },
  { q: "How do I import data?", a: "Go to Data Center → Upload Center, drop your file, and follow the import wizard. You’ll see an impact report after each import." },
  { q: "How do I change my plan?", a: "Open Settings → Subscription Plan to view and upgrade your plan." },
  { q: "How do WhatsApp alerts work?", a: "Enable them in Settings → WhatsApp Alerts. You’ll get critical alerts and your weekly summary on WhatsApp." },
];

function HelpCenterPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />
        <main className="space-y-6 pb-12">
          <motion.section
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="neon-card neon-ring relative overflow-hidden rounded-card p-7"
          >
            <div className="relative z-10 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary"><LifeBuoy size={28} /></span>
              <div>
                <h1 className="font-display text-3xl font-bold text-ink">Help Center</h1>
                <p className="mt-1 text-ink-muted">Answers, guides, and support for Business Copilot.</p>
              </div>
            </div>
          </motion.section>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Bot, title: "Ask the AI CFO", desc: "Get instant answers about your business.", action: () => navigate("/app/chat") },
              { icon: BookOpen, title: "Getting started", desc: "Import data and read your dashboard.", action: () => navigate("/app/data-center") },
              { icon: Mail, title: "Contact support", desc: "Email us at support@businesscopilot.app", action: () => { window.location.href = "mailto:support@businesscopilot.app"; } },
            ].map((c) => (
              <motion.button
                key={c.title} type="button" onClick={c.action} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="glow-hover rounded-card border border-border bg-surface p-5 text-left shadow-card"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><c.icon size={20} /></span>
                <h3 className="mt-3 font-display text-base font-semibold text-ink">{c.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{c.desc}</p>
              </motion.button>
            ))}
          </div>

          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
              <MessageCircleQuestion size={18} className="text-primary" /> Frequently asked
            </h2>
            <div className="space-y-3">
              {TOPICS.map((t, i) => (
                <details key={i} className="group rounded-xl border border-border bg-bg-subtle p-4">
                  <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">{t.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.a}</p>
                </details>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default HelpCenterPage;
