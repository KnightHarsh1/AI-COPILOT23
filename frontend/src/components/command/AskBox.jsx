import { useState } from "react";
import GrowthService from "../../services/growthService";

const SUGGESTIONS = [
  "Who owes me the most money?",
  "What is my profit this period?",
  "Which products are dead stock?",
  "How many months of runway do I have?",
];

function AskBox() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async (question) => {
    const query = question || q;
    if (!query.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await GrowthService.ask(query);
      setAnswer(res.answer);
    } catch (_) {
      setAnswer("Couldn't answer that right now. Try uploading more data or rephrasing.");
    }
    setLoading(false);
  };

  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">AI</span>
        <p className="text-sm font-semibold text-ink">Ask your business anything</p>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="e.g. Who owes me the most money?"
          className="flex-1 rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
        />
        <button type="button" onClick={() => run()} disabled={loading}
          className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60">
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>
      {!answer && !loading && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => { setQ(s); run(s); }}
              className="rounded-pill border border-border px-3 py-1 text-xs text-ink-muted transition hover:bg-bg-subtle">
              {s}
            </button>
          ))}
        </div>
      )}
      {answer && (
        <div className="mt-3 whitespace-pre-wrap rounded-lg bg-bg-subtle px-4 py-3 text-sm leading-6 text-ink">
          {answer}
        </div>
      )}
    </section>
  );
}

export default AskBox;
