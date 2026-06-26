import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { validateEmail, validatePassword, validateName } from "../utils/validators";
import { AuthLayout, AuthInput, AuthButton, FormError, PasswordStrength, AuthCheckbox } from "../components/auth/AuthLayout";

// RegisterPage — premium re-skin over the EXISTING registration logic. The
// register() payload (first_name/last_name/email/password/company_name),
// validators, navigation and error handling are unchanged; only the UI is new.
function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
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
    setFormError("");
    setIsSubmitting(true);

    try {
      const [first_name, ...rest] = name.trim().split(" ");
      const last_name = rest.length ? rest.join(" ") : undefined;
      await register({
        first_name,
        last_name,
        email,
        password,
        company_name: companyName.trim() || undefined,
      });
      navigate("/app/dashboard");
    } catch (error) {
      setFormError(error.response?.data?.detail || "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your AI-powered Virtual CFO in minutes — free."
      tagline="Give your business the CFO it deserves. Start free in minutes."
      footer={
        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:text-primary-hover">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthInput
          label="Full name" name="name" value={name}
          onChange={(e) => setName(e.target.value)} error={errors.name}
          autoComplete="name" placeholder="Priya Sharma"
        />
        <AuthInput
          label="Business name" name="company" value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          autoComplete="organization" placeholder="Sharma Healthcare"
          hint="Optional — you can set this later in Settings"
        />
        <AuthInput
          label="Email" name="email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)} error={errors.email}
          autoComplete="email" placeholder="you@company.com"
        />
        <div>
          <AuthInput
            label="Password" name="password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} error={errors.password}
            autoComplete="new-password" placeholder="Create a strong password"
          />
          <PasswordStrength value={password} />
        </div>

        <AuthCheckbox name="terms" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}>
          I agree to the <span className="font-medium text-primary">Terms</span> and <span className="font-medium text-primary">Privacy Policy</span>
        </AuthCheckbox>

        <FormError>{formError}</FormError>

        <AuthButton type="submit" loading={isSubmitting} disabled={isSubmitting || !accepted}>
          {isSubmitting ? "Creating account…" : <>Create account <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></>}
        </AuthButton>
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
