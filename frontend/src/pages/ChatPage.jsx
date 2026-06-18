import { useEffect, useRef, useState } from "react";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import Button from "../components/common/Button";
import ChatService from "../services/chatService";

const SUGGESTED_QUESTIONS = [
  "Why is profit down?",
  "Which products should I discontinue?",
  "Which customers are most profitable?",
  "What should I do next month?",
  "How can I improve cash flow?",
];

function ChatPage() {
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, loading]);

  const ask = async (question) => {
    const text = question.trim();
    if (!text || loading) return;

    setMessage("");
    setError("");
    setThread((current) => [...current, { role: "user", content: text }]);
    setLoading(true);

    try {
      const response = await ChatService.sendMessage(text);
      setThread((current) => [...current, { role: "assistant", content: response.answer }]);
    } catch (err) {
      setError(err.response?.data?.detail || "The Virtual CFO couldn't answer that just now. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    ask(message);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask(message);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />

        <main className="space-y-6">
          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Virtual CFO</p>
            <h1 className="font-display mt-3 text-3xl font-bold text-ink">Ask your business anything</h1>
            <p className="mt-2 text-ink-muted">
              Answers are grounded in your last 30 days of revenue, expenses, alerts, and recommendations.
            </p>
          </section>

          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => ask(question)}
                  disabled={loading}
                  className="rounded-pill border border-border bg-bg-subtle px-3.5 py-1.5 text-sm font-medium text-ink-muted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {question}
                </button>
              ))}
            </div>

            <div className="mt-5 max-h-[480px] space-y-4 overflow-y-auto rounded-xl bg-bg-subtle p-4">
              {thread.length === 0 && !loading && (
                <p className="text-sm text-ink-muted">
                  Ask a question above, or tap a suggestion to get started.
                </p>
              )}

              {thread.map((entry, index) => (
                <div key={index} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-6 ${
                      entry.role === "user"
                        ? "bg-primary text-white"
                        : "bg-surface text-ink shadow-card"
                    }`}
                  >
                    {entry.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-xl bg-surface px-4 py-3 text-sm text-ink-muted shadow-card">
                    Thinking…
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {error && <p className="mt-3 text-sm font-medium text-risk-high">{error}</p>}

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <textarea
                className="w-full flex-1 rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
                rows="2"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Why is my profit margin low?"
              />
              <Button type="submit" loading={loading} className="sm:w-auto">
                Ask Virtual CFO
              </Button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

export default ChatPage;
