import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword, validateName } from '../utils/validators';

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (nameError || emailError || passwordError) {
      setErrors({ name: nameError, email: emailError, password: passwordError });
      return;
    }

    setErrors({});
    setFormError('');
    setIsSubmitting(true);

    try {
      const [first_name, ...rest] = name.trim().split(' ');
      const last_name = rest.length ? rest.join(' ') : undefined;
      await register({
        first_name,
        last_name,
        email,
        password,
        company_name: companyName.trim() || undefined,
      });
      navigate('/app/dashboard');
    } catch (error) {
      setFormError(error.response?.data?.detail || 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-card border border-border bg-surface p-10 shadow-card">
        <h1 className="font-display text-2xl font-semibold text-ink">Create an account</h1>
        <p className="mt-2 text-sm text-ink-muted">Register your company and start tracking business KPIs.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-ink">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:bg-surface"
            />
            {errors.name && <p className="mt-2 text-sm text-risk-high">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Company name</label>
            <input
              type="text"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Optional — you can set this later in Settings"
              className="mt-2 w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:bg-surface"
            />
          </div>

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
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-primary-hover">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
