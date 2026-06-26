import { motion, useReducedMotion } from "framer-motion";

// AuroraBackground — the signature premium backdrop shared by the landing hero
// and the auth split-screen: soft gradient "aurora" blobs, a faint grid, and a
// few slow-floating particles. Purely decorative (aria-hidden), GPU-cheap, and
// fully static under prefers-reduced-motion. One component → identical brand
// atmosphere on the landing page and the sign-in screen.
function AuroraBackground({ className = "", dense = false, grid = true }) {
  const reduce = useReducedMotion();
  const particles = dense ? 14 : 8;

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* Aurora gradient blobs */}
      <motion.div
        className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full opacity-50 blur-[100px]"
        style={{ background: "radial-gradient(circle at center, rgb(var(--c-primary) / 0.55), transparent 70%)" }}
        animate={reduce ? undefined : { x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-24 top-10 h-[24rem] w-[24rem] rounded-full opacity-40 blur-[100px]"
        style={{ background: "radial-gradient(circle at center, rgb(var(--c-gold) / 0.4), transparent 70%)" }}
        animate={reduce ? undefined : { x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-8rem] left-1/3 h-[26rem] w-[26rem] rounded-full opacity-30 blur-[110px]"
        style={{ background: "radial-gradient(circle at center, rgb(var(--c-risk-low) / 0.35), transparent 70%)" }}
        animate={reduce ? undefined : { x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Faint grid */}
      {grid && (
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgb(var(--c-ink) / 0.06) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-ink) / 0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      )}

      {/* Floating particles */}
      {!reduce &&
        Array.from({ length: particles }).map((_, i) => {
          const left = (i * 37) % 100;
          const top = (i * 53) % 100;
          const dur = 8 + (i % 5) * 2;
          return (
            <motion.span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-primary/40"
              style={{ left: `${left}%`, top: `${top}%` }}
              animate={{ y: [0, -24, 0], opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
            />
          );
        })}
    </div>
  );
}

export default AuroraBackground;
