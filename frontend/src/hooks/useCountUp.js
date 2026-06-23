import { useEffect, useRef, useState } from "react";

// Animates a number from 0 → target on mount (and whenever target changes).
// Respects prefers-reduced-motion. Pure presentation — never alters the value
// that's passed in; it only controls what's displayed during the animation.
export function useCountUp(target, { duration = 900, enabled = true } = {}) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const numeric = Number(target) || 0;
    if (!enabled || reduce) {
      setValue(numeric);
      return;
    }
    fromRef.current = 0;
    startRef.current = null;

    const tick = (ts) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      // easeOutExpo for an expensive-feeling deceleration.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(fromRef.current + (numeric - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setValue(numeric);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, enabled]);

  return value;
}

export default useCountUp;
