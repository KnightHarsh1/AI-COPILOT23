import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword } from '../utils/validators';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setErrors({});
    setFormError('');
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate('/app/dashboard');
    } catch (error) {
      setFormError(error.response?.data?.detail || 'Invalid login credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-card border border-border bg-surface p-10 shadow-card">
        <h1 className="font-display text-2xl font-semibold text-ink">Sign in</h1>
        <p className="mt-2 text-sm text-ink-muted">Use your company credentials to access Business Copilot.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-ink">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:bg-surface"
            />
            {errors.email && <p className="mt-2 text-sm text-risk-high">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:bg-surface"
            />
            {errors.password && <p className="mt-2 text-sm text-risk-high">{errors.password}</p>}
          </div>

          {formError && <p className="text-sm text-risk-high">{formError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-ink-muted">
          <Link to="/forgot-password" className="text-primary hover:text-primary-hover">
            Forgot password?
          </Link>
          <Link to="/register" className="text-primary hover:text-primary-hover">
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
