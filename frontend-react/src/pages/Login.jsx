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

export default function Login() {
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Login — Lannent');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Sign in with the email, or with the phone number saved in profile settings.
  const [method, setMethod] = useState('email');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const { errors, showError, clearError, clearAllErrors, validateForm, errorStyle } = useFieldErrors();

  // If already logged in, redirect
  if (Auth.isLoggedIn()) {
    return <Navigate to={Auth.getDashboardUrl(Auth.getCurrentUser().role)} replace />;
  }

  const PHONE_COUNTRIES = Validate.getPhoneCountries();
  const phoneRule = Validate.getPhoneValidationRule(countryCode);
  const idField = method === 'email' ? 'loginEmail' : 'loginPhone';

  function switchMethod(next) {
    setMethod(next);
    clearAllErrors('loginForm');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const emailVal = email.trim();
    const digits = phone.trim();
    const identifierCheck = method === 'email'
      ? { fieldId: 'loginEmail', value: emailVal, checks: [Validate.email] }
      : { fieldId: 'loginPhone', value: digits, checks: [v => Validate.required(v, 'Phone number'), v => Validate.validatePhoneNumber(v, countryCode)] };

    const { valid } = validateForm([
      identifierCheck,
      { fieldId: 'loginPassword', value: password, checks: [v => Validate.required(v, 'Password')] },
    ]);
    if (!valid) return;

    setSubmitting(true);
    setTimeout(() => {
      const result = Auth.login(method === 'email' ? emailVal : countryCode + digits, password);
      if (!result.success) {
        showError(idField, result.error);
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
            {/* Email or phone — one control, two ways to say who you are. */}
            <div role="tablist" aria-label="Sign in with" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--secondary)', marginBottom: 20 }}>
              {[['email', 'mail', 'Email'], ['phone', 'phone', 'Phone']].map(([key, icon, label]) => (
                <button key={key} type="button" role="tab" aria-selected={method === key} onClick={() => switchMethod(key)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 500,
                                 background: method === key ? 'var(--card, #fff)' : 'transparent', color: method === key ? 'var(--foreground)' : 'var(--muted-foreground)',
                                 boxShadow: method === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  <Icon name={icon} style={{ width: 15, height: 15 }} />
                  {label}
                </button>
              ))}
            </div>

            {method === 'email' ? (
              <div className="form-group">
                <label className="form-label" htmlFor="loginEmail">Email</label>
                {' '}
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  id="loginEmail"
                  autoComplete="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearError('loginEmail'); }}
                  style={errorStyle('loginEmail')}
                />
                <FieldError id="loginEmail" message={errors.loginEmail} />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="loginPhone">Phone number</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="form-input" aria-label="Country code" value={countryCode} style={{ width: 'auto', flex: 'none', paddingRight: 8 }}
                          onChange={e => { setCountryCode(e.target.value); clearError('loginPhone'); }}>
                    {PHONE_COUNTRIES.map(c => <option key={c.code} value={c.code}>{`${c.flag} ${c.code}`}</option>)}
                  </select>
                  <input
                    type="tel"
                    inputMode="numeric"
                    className="form-input"
                    placeholder={phoneRule.placeholder}
                    id="loginPhone"
                    autoComplete="tel-national"
                    maxLength={phoneRule.length}
                    value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); clearError('loginPhone'); }}
                    style={{ ...(errorStyle('loginPhone') || {}), flex: 1, minWidth: 0 }}
                  />
                </div>
                <FieldError id="loginPhone" message={errors.loginPhone} />
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 6 }}>Use the number saved in your profile settings.</p>
              </div>
            )}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Forgot password?</Link>
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
        </div>
      </div>
    </div>
  );
}
