import { motion } from "framer-motion";

// Animated robot mascot for the greeting hero. Pure SVG + Framer Motion — it
// bobs, its antenna light pulses, eyes blink, and one arm waves. Decorative
// only; no data, no logic. Colours follow the active theme via CSS variables so
// it matches whatever accent is selected.
function GreetingRobot({ size = 96 }) {
  const primary = "rgb(var(--c-primary))";
  const primaryHover = "rgb(var(--c-primary-hover))";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.25 }}
      style={{ width: size, height: size }}
      className="relative shrink-0 select-none"
    >
      {/* Gentle floating bob for the whole robot */}
      <motion.svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Glow halo */}
        <defs>
          <radialGradient id="robo-glow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={primary} stopOpacity="0.35" />
            <stop offset="100%" stopColor={primary} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="robo-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryHover} />
            <stop offset="100%" stopColor={primary} />
          </linearGradient>
        </defs>
        <circle cx="60" cy="58" r="52" fill="url(#robo-glow)" />

        {/* Antenna */}
        <line x1="60" y1="20" x2="60" y2="34" stroke={primaryHover} strokeWidth="3" strokeLinecap="round" />
        <motion.circle
          cx="60" cy="17" r="5" fill={primaryHover}
          animate={{ opacity: [1, 0.4, 1], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Head */}
        <rect x="34" y="34" width="52" height="42" rx="14" fill="url(#robo-body)" />
        {/* Face screen */}
        <rect x="40" y="41" width="40" height="28" rx="9" fill="#0b1020" opacity="0.92" />

        {/* Eyes — blink by scaling Y */}
        <motion.g
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1], ease: "easeInOut" }}
          style={{ transformOrigin: "60px 55px" }}
        >
          <circle cx="51" cy="55" r="4.5" fill="#7DF0FF" />
          <circle cx="69" cy="55" r="4.5" fill="#7DF0FF" />
        </motion.g>
        {/* Smile */}
        <path d="M52 63 Q60 68 68 63" stroke="#7DF0FF" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Body */}
        <rect x="42" y="78" width="36" height="26" rx="9" fill="url(#robo-body)" />
        <circle cx="60" cy="90" r="4" fill="#0b1020" opacity="0.85" />

        {/* Left arm (static, resting) */}
        <rect x="30" y="80" width="9" height="20" rx="4.5" fill={primary} />

        {/* Right arm — waving hello */}
        <motion.g
          style={{ transformOrigin: "84px 82px" }}
          animate={{ rotate: [0, -22, 6, -22, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
        >
          <rect x="81" y="74" width="9" height="22" rx="4.5" fill={primary} />
          <circle cx="85.5" cy="72" r="5" fill={primaryHover} />
        </motion.g>
      </motion.svg>
    </motion.div>
  );
}

export default GreetingRobot;
