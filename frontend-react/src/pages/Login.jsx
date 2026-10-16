/**
 * LANNENT — Login
 * Converted from front-end/pages/login.html.
 *
 * Email + password sign-in. On success the user goes to their role's
 * dashboard. `/login?demo=<role>` pre-fills a demo account (the landing page
 * links here that way).
 */
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import AuthBranding from '../components/AuthBranding';
import PasswordInput from '../components/PasswordInput';
import FieldError from '../components/FieldError';
import { useAuth } from '../context/AuthContext';
import { useValidation } from '../context/ValidationContext';
import useFieldErrors from '../hooks/useFieldErrors';
import usePageTitle from '../hooks/usePageTitle';

// Shared look of the <code> chips in the demo credentials box.
const codeStyle = { background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 };

/** One "Role: email / password" line of the demo credentials box. */
function DemoLine({ label, email, password }) {
  return (
    <span style={{ display: 'block' }}>
      {label + ': '}<code style={codeStyle}>{email}</code> / <code style={codeStyle}>{password}</code>
    </span>
  );
}

export default function Login() {
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Login — Lannent');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { errors, showError, clearError, validateForm, errorStyle } = useFieldErrors();

  // If already logged in, redirect
  if (Auth.isLoggedIn()) {
    return <Navigate to={Auth.getDashboardUrl(Auth.getCurrentUser().role)} replace />;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const emailVal = email.trim();

    const { valid } = validateForm([
      { fieldId: 'loginEmail', value: emailVal, checks: [Validate.email] },
      { fieldId: 'loginPassword', value: password, checks: [v => Validate.required(v, 'Password')] },
    ]);
    if (!valid) return;

    setSubmitting(true);
    setTimeout(() => {
      const result = Auth.login(emailVal, password);
      if (!result.success) {
        showError('loginEmail', result.error);
        setSubmitting(false);
        return;
      }
      navigate(Auth.getDashboardUrl(result.user.role));
    }, 400);
  }

  return (
    <div className="auth-page">
      <AuthBranding />

      {/* RIGHT — Login Form */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-brand">
            <Icon name="shield-check" style={{ width: 20, height: 20 }} />
            {' '}
            <span className="auth-card-brand-name">Lannent</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 24, marginBottom: 4 }}>Welcome back</h2>
          <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 32 }}>Sign in to your account to continue</p>

          <form id="loginForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              {' '}
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                id="loginEmail"
                value={email}
                onChange={e => { setEmail(e.target.value); clearError('loginEmail'); }}
                style={errorStyle('loginEmail')}
              />
              <FieldError id="loginEmail" message={errors.loginEmail} />
            </div>
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              </div>
              <PasswordInput
                id="loginPassword"
                toggleId="togglePassword"
                value={password}
                onChange={e => { setPassword(e.target.value); clearError('loginPassword'); }}
                error={errors.loginPassword}
                style={errorStyle('loginPassword')}
              />
            </div>
            <button type="submit" className="btn-submit" style={{ marginTop: 4 }} disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer-text">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>

          {/* Demo credentials */}
          <div style={{ marginTop: 20, padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
            <strong style={{ color: '#334155', display: 'block', marginBottom: 4 }}>🔑 Demo Credentials</strong>
            <DemoLine label="Client" email="client@gmail.com" password="Password@123" />
            <DemoLine label="Worker" email="worker@gmail.com" password="Password@123" />
            <DemoLine label="Expert" email="expert@gmail.com" password="Password@123" />
            <DemoLine label="Super Admin" email="super@gmail.com" password="Superadmin@123" />
            <DemoLine label="Revenue Admin" email="admin@gmail.com" password="Admin@123" />
            <DemoLine label="Intake Admin" email="intake@gmail.com" password="Intake@123" />
            <DemoLine label="Compliance Admin" email="compliance@gmail.com" password="Compliance@123" />
          </div>
        </div>
      </div>
    </div>
  );
}
