import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, ArrowUp } from "lucide-react";

// AiCfoChat — a self-contained, scripted conversation that demonstrates the AI
// CFO: a business question, a typing indicator, then a structured answer with an
// "Explain this KPI" affordance. Replays on scroll into view. Illustrative copy
// only — no backend call.

const MESSAGES = [
  { from: "user", text: "Why did my profit drop last month?" },
  {
    from: "ai",
    text: "Net profit fell 9% mainly because COGS rose faster than revenue.",
    detail: [
      "Revenue: +4% (₹8.6L)",
      "COGS: +11% — supplier price increase on 3 SKUs",
      "Fix: renegotiate top-spend supplier; protects ~₹70K/mo",
    ],
  },
];

function Bubble({ children, from }) {
  const isUser = from === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
          isUser
            ? "rounded-br-md bg-primary text-white"
            : "rounded-bl-md border border-border bg-surface text-ink"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function AiCfoChat() {
  const reduce = useReducedMotion();
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-[24px] border border-border bg-bg-subtle/50 shadow-card">
      <div className="flex items-center gap-2 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-hover text-white">
          <Sparkles size={14} />
        </span>
        <span className="text-sm font-semibold text-ink">AI CFO</span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-risk-low" /> Online
        </span>
      </div>

      <div className="space-y-3 p-4">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <Bubble from="user">{MESSAGES[0].text}</Bubble>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: reduce ? 0 : 0.8 }}
        >
          <Bubble from="ai">
            <p className="font-medium">{MESSAGES[1].text}</p>
            <ul className="mt-2 space-y-1 border-t border-border pt-2 text-[13px] text-ink-muted">
              {MESSAGES[1].detail.map((d, i) => (
                <li key={i} className="flex gap-1.5"><span className="text-primary">•</span>{d}</li>
              ))}
            </ul>
            <button className="mt-2 inline-flex items-center gap-1 rounded-pill bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Sparkles size={11} /> Explain this KPI
            </button>
          </Bubble>
        </motion.div>
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-surface/80 px-3 py-3 backdrop-blur">
        <div className="flex-1 rounded-pill border border-border bg-bg-subtle px-4 py-2 text-sm text-ink-muted">
          Ask anything about your business…
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
          <ArrowUp size={16} />
        </span>
      </div>
    </div>
  );
}

export default AiCfoChat;
