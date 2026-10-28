/**
 * LANNENT — ForgotPassword
 *
 * Step one of a password reset: the user gives their email and the server
 * mails a one-time link to /reset-password. The confirmation is worded the
 * same whether or not the email has an account — the server answers both
 * identically, so the page must not guess either.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import AuthBranding from '../components/AuthBranding';
import FieldError from '../components/FieldError';
import { useValidation } from '../context/ValidationContext';
import useFieldErrors from '../hooks/useFieldErrors';
import usePageTitle from '../hooks/usePageTitle';
import { postPublic } from '../utils/publicApi';

export default function ForgotPassword() {
  const Validate = useValidation();
  usePageTitle('Forgot Password — Lannent');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const [minutes, setMinutes] = useState(30);
  const { errors, showError, clearError, validateForm, errorStyle } = useFieldErrors();

  async function handleSubmit(e) {
    e.preventDefault();
    const value = email.trim();
    const { valid } = validateForm([{ fieldId: 'forgotEmail', value, checks: [Validate.email] }]);
    if (!valid) return;
    setSubmitting(true);
    try {
      const result = await postPublic('/auth/forgot-password', { email: value });
      if (result && result.expiresInMinutes) setMinutes(result.expiresInMinutes);
      setSentTo(value);
    } catch (err) {
      showError('forgotEmail', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthBranding />
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-brand">
            <Icon name="shield-check" style={{ width: 20, height: 20 }} />
            {' '}
            <span className="auth-card-brand-name">Lannent</span>
          </div>

          {sentTo ? (
            <>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
                <Icon name="mail" style={{ width: 26, height: 26, color: 'white' }} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 20, marginBottom: 8 }}>Check your email</h2>
              <p style={{ fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: 8 }}>
                If an account exists for <strong style={{ color: 'var(--foreground)', overflowWrap: 'anywhere' }}>{sentTo}</strong>, we've sent it a link to choose a new password.
              </p>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: 28 }}>
                {`The link works once and expires in ${minutes} minutes. Check your spam folder if it hasn't arrived in a few minutes.`}
              </p>
              <Link to="/login" className="btn-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Back to Sign In</Link>
              <p className="auth-footer-text">
                Didn't get it?{' '}
                <a href="#" onClick={e => { e.preventDefault(); setSentTo(null); }}>Try again</a>
              </p>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 24, marginBottom: 4 }}>Forgot your password?</h2>
              <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 32 }}>Enter the email you sign in with and we'll send you a reset link.</p>
              <form id="forgotForm" onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgotEmail">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    id="forgotEmail"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError('forgotEmail'); }}
                    style={errorStyle('forgotEmail')}
                  />
                  <FieldError id="forgotEmail" message={errors.forgotEmail} />
                </div>
                <button type="submit" className="btn-submit" style={{ marginTop: 4 }} disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <p className="auth-footer-text">
                Remembered it? <Link to="/login">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
