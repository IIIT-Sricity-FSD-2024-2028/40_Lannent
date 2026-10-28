/**
 * LANNENT — ResetPassword
 *
 * Step two: the page the emailed link opens, /reset-password#token=…
 * The token travels in the #fragment, which browsers never send to a server,
 * and is removed from the address bar as soon as it has been read. The link
 * is checked before the form is shown, so an expired one says so up front.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import AuthBranding from '../components/AuthBranding';
import PasswordInput from '../components/PasswordInput';
import { useValidation } from '../context/ValidationContext';
import useFieldErrors from '../hooks/useFieldErrors';
import usePageTitle from '../hooks/usePageTitle';
import { postPublic } from '../utils/publicApi';

/** The token from #token=… (or ?token=… from an older link). */
function readToken() {
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
  return fromHash || new URLSearchParams(window.location.search).get('token') || '';
}

export default function ResetPassword() {
  const Validate = useValidation();
  usePageTitle('Reset Password — Lannent');
  const [token] = useState(readToken);
  // checking → valid | invalid → done
  const [stage, setStage] = useState(token ? 'checking' : 'invalid');
  const [invalidReason, setInvalidReason] = useState('This reset link is incomplete. Open the link from your email again, or request a new one.');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { errors, showError, clearError, validateForm, errorStyle } = useFieldErrors();

  useEffect(() => {
    // Keep the token out of the address bar and the browser history.
    if (window.location.hash || window.location.search) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
    if (!token) return;
    let live = true;
    postPublic('/auth/reset-password/check', { token })
      .then(() => { if (live) setStage('valid'); })
      .catch(err => { if (live) { setInvalidReason(err.message); setStage('invalid'); } });
    return () => { live = false; };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    const { valid } = validateForm([
      { fieldId: 'resetPassword', value: pw, checks: [Validate.password] },
      { fieldId: 'resetConfirm', value: confirm, checks: [v => Validate.passwordMatch(pw, v)] },
    ]);
    if (!valid) return;
    setSubmitting(true);
    try {
      await postPublic('/auth/reset-password', { token, password: pw });
      // Every session was signed out by the reset, this browser's included.
      try { localStorage.removeItem('lannent_session'); localStorage.removeItem('lannent_token'); } catch (err) { /* storage unavailable */ }
      setStage('done');
    } catch (err) {
      if (/invalid or has expired/i.test(err.message)) {
        setInvalidReason(err.message);
        setStage('invalid');
      } else {
        showError('resetPassword', err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const strength = Validate.passwordStrength(pw);
  const barClass = strength.level === 1 ? 'active-weak' : strength.level === 2 ? 'active-medium' : 'active-strong';

  const badge = (name, background) => (
    <div style={{ width: 56, height: 56, borderRadius: '50%', background, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
      <Icon name={name} style={{ width: 26, height: 26, color: 'white' }} />
    </div>
  );
  const title = text => <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 20, marginBottom: 8 }}>{text}</h2>;
  const sub = { fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: 28 };

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

          {stage === 'checking' && (
            <p role="status" style={{ fontSize: 14, color: 'var(--muted-foreground)', marginTop: 32 }}>Checking your reset link…</p>
          )}

          {stage === 'invalid' && (
            <>
              {badge('link-2-off', 'linear-gradient(135deg,#f97316,#ea580c)')}
              {title('This link can’t be used')}
              <p style={sub}>{invalidReason}</p>
              <Link to="/forgot-password" className="btn-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Request a New Link</Link>
              <p className="auth-footer-text"><Link to="/login">Back to sign in</Link></p>
            </>
          )}

          {stage === 'done' && (
            <>
              {badge('check', 'linear-gradient(135deg,#10b981,#059669)')}
              {title('Password changed')}
              <p style={sub}>Your new password is set, and every device that was signed in has been signed out. Sign in with your new password.</p>
              <Link to="/login" className="btn-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Sign In</Link>
            </>
          )}

          {stage === 'valid' && (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 24, marginBottom: 4 }}>Choose a new password</h2>
              <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 32 }}>At least 8 characters, with upper and lower case letters, a number and a symbol (!@#$%^&*).</p>
              <form id="resetForm" onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="resetPassword">New password</label>
                  <PasswordInput
                    id="resetPassword"
                    toggleId="toggleResetPassword"
                    autoComplete="new-password"
                    autoFocus
                    value={pw}
                    onChange={e => { setPw(e.target.value); clearError('resetPassword'); }}
                    error={errors.resetPassword}
                    style={errorStyle('resetPassword')}
                  />
                  <div className="pw-strength" style={pw.length === 0 ? { display: 'none' } : undefined}>
                    <div className="pw-strength-bars">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={'pw-strength-bar' + (i <= strength.level ? ' ' + barClass : '')}></div>
                      ))}
                    </div>
                    <span className={'pw-strength-label ' + strength.label.toLowerCase()}>{strength.label}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="resetConfirm">Confirm new password</label>
                  <PasswordInput
                    id="resetConfirm"
                    toggleId="toggleResetConfirm"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); clearError('resetConfirm'); }}
                    error={errors.resetConfirm}
                    style={errorStyle('resetConfirm')}
                  />
                </div>
                <button type="submit" className="btn-submit" style={{ marginTop: 4 }} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Set New Password'}
                </button>
              </form>
              <p className="auth-footer-text"><Link to="/login">Back to sign in</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
