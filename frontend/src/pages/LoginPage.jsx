import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { validateEmail, validatePassword } from "../utils/validators";
import { AuthLayout, AuthInput, AuthButton, FormError, AuthCheckbox } from "../components/auth/AuthLayout";

// LoginPage — premium re-skin over the EXISTING auth logic. The login() call,
// validators, error handling and navigation are unchanged; only the UI is new.
function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
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
    setFormError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate("/app/dashboard");
    } catch (error) {
      setFormError(error.response?.data?.detail || "Invalid login credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Business Copilot workspace."
      tagline="Welcome back to the AI CFO that runs the numbers for you."
      footer={
        <p className="text-center text-sm text-ink-muted">
          New to Business Copilot?{" "}
          <Link to="/register" className="font-semibold text-primary hover:text-primary-hover">Create an account</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthInput
          label="Email" name="email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)} error={errors.email}
          autoComplete="email" placeholder="you@company.com"
        />
        <AuthInput
          label="Password" name="password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} error={errors.password}
          autoComplete="current-password" placeholder="••••••••"
        />

        <div className="flex items-center justify-between">
          <AuthCheckbox name="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)}>
            Remember me
          </AuthCheckbox>
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-hover">
            Forgot password?
          </Link>
        </div>

        <FormError>{formError}</FormError>

        <AuthButton type="submit" loading={isSubmitting}>
          {isSubmitting ? "Signing in…" : <>Sign in <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></>}
        </AuthButton>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
