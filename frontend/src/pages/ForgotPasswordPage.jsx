import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, MailCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { validateEmail } from "../utils/validators";
import { AuthLayout, AuthInput, AuthButton, FormError, FormSuccess } from "../components/auth/AuthLayout";

// ForgotPasswordPage — premium re-skin over the EXISTING reset logic. The
// forgotPassword() call, validation, success message and redirect timing are
// unchanged; only the UI is new.
export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await forgotPassword(email);
      setMessage("If this email exists, a password reset link has been sent.");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to request password reset.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you reset instructions."
      tagline="No worries — we'll help you back into your workspace."
      footer={
        <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      }
    >
      {message ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center rounded-card border border-border bg-bg-subtle/50 px-6 py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-risk-low/10 text-risk-low">
              <MailCheck size={28} />
            </span>
            <p className="font-display mt-4 text-lg font-bold text-ink">Check your inbox</p>
            <p className="mt-1.5 text-sm text-ink-muted">{message}</p>
            <p className="mt-4 text-xs text-ink-muted">Redirecting you to sign in…</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <AuthInput
            label="Email" name="email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} error={error}
            autoComplete="email" placeholder="you@company.com"
          />
          <AuthButton type="submit" loading={isSubmitting}>
            {isSubmitting ? "Sending…" : <>Send reset link <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></>}
          </AuthButton>
        </form>
      )}
    </AuthLayout>
  );
}
