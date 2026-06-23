import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

// Floating AI CFO assistant — a fixed bottom-right button with a soft pulse and
// glow. Clicking it routes to the existing AI CFO chat page (no AI/backend
// changes). Hidden on the chat page itself to avoid redundancy.
function FloatingAssistant() {
  const navigate = useNavigate();
  const onChat = typeof window !== "undefined" && window.location.pathname.includes("/app/chat");
  if (onChat) return null;

  return (
    <motion.button
      type="button"
      onClick={() => navigate("/app/chat")}
      aria-label="Ask the AI CFO"
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.4 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-pill border border-primary/30 bg-primary px-4 py-3 text-white shadow-lg pulse-ring"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
        <Bot size={18} strokeWidth={2} />
      </span>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 group-hover:max-w-[140px] group-hover:opacity-100">
        Ask AI CFO
      </span>
      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-primary bg-risk-low" />
    </motion.button>
  );
}

export default FloatingAssistant;
