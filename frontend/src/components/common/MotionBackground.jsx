// Motion background — subtle, professional depth. Two softly-floating gradient
// orbs behind the app content. Fixed, non-interactive, very low opacity so it
// reads as premium texture, never as a flashy effect. Respects reduced motion
// via the CSS helpers (.orb-a/.orb-b animations disable automatically).
function MotionBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="orb-a absolute -left-32 -top-24 h-96 w-96 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(var(--c-primary)), transparent 70%)" }}
      />
      <div
        className="orb-b absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full opacity-[0.06] blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(var(--c-gold)), transparent 70%)" }}
      />
    </div>
  );
}

export default MotionBackground;
