import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateEmail } from '../utils/validators';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await forgotPassword(email);
      setMessage('If this email exists, a password reset link has been sent.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-card border border-border bg-surface p-8 shadow-card">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Forgot Password</h1>
      <p className="mb-4 text-sm text-ink-muted">
        Enter your email address and we&apos;ll send instructions to reset your password.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:bg-surface"
            placeholder="you@example.com"
          />
          {error && <p className="mt-2 text-sm text-risk-high">{error}</p>}
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full justify-center rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      {message && <p className="mt-4 rounded-xl border border-risk-low/30 bg-risk-low/10 px-4 py-3 text-sm text-risk-low">{message}</p>}
    </div>
  );
}
