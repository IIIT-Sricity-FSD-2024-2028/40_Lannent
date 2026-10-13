/**
 * LANNENT — ExpertLogin
 * Converted from front-end/pages/expert-login.html.
 *
 * Sign-in page for Expert Reviewers. Before signing in it checks the email's
 * reviewer application: pending or rejected applicants are told so instead.
 * Accounts that are not experts are turned away (and signed out).
 */
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import AuthBranding from '../components/AuthBranding';
import PasswordInput from '../components/PasswordInput';
import FieldError from '../components/FieldError';
import PageStyle from '../components/PageStyle';
import { GoogleIcon } from '../components/SocialIcons';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useFieldErrors from '../hooks/useFieldErrors';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ExpertLogin.css?raw';

const EXPERT_FEATURES = [
  { icon: 'file-check', text: 'Technical audit dashboard' },
  { icon: 'scale', text: 'Dispute resolution panel' },
  { icon: 'lock', text: 'Secure expert verification' },
];

export default function ExpertLogin() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Expert Reviewer Login — GigBoard');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { errors, showError, clearError, validateForm, errorStyle } = useFieldErrors();

  if (Auth.isLoggedIn()) {
    return <Navigate to={Auth.getDashboardUrl(Auth.getCurrentUser().role)} replace />;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const emailVal = email.trim();

    const { valid } = validateForm([
      { fieldId: 'expertEmail', value: emailVal, checks: [Validate.email] },
      { fieldId: 'expertPw', value: pw, checks: [v => Validate.required(v, 'Password')] },
    ]);
    if (!valid) return;

    setSubmitting(true);
    setTimeout(() => {
      // ── Check expert application status FIRST ──
      const app = Store.getExpertApplicationStatus(emailVal);
      if (app.exists) {
        if (app.status === 'pending') {
          showError('expertEmail', 'Your application is under review. You will be notified once approved.');
          setSubmitting(false);
          return;
        }
        if (app.status === 'rejected') {
          showError('expertEmail', 'Your application was rejected. Please contact support for more information.');
          setSubmitting(false);
          return;
        }
        // status === 'approved' → proceed to auth
      }

      const result = Auth.login(emailVal, pw);
      if (!result.success) {
        showError('expertEmail', result.error);
        setSubmitting(false);
        return;
      }
      // Ensure only experts can login through this page
      if (result.user.role !== 'expert') {
        showError('expertEmail', 'This login page is only for Expert Reviewers. Please use the appropriate login page.');
        Auth.logout();
        setSubmitting(false);
        return;
      }
      navigate(Auth.getDashboardUrl(result.user.role));
    }, 400);
  }

  function handleGoogleLogin() {
    Validate.toast('Social login is not available in demo mode.', 'info');
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <div className="auth-page">
        <AuthBranding
          title={<>Ensure quality with <span className="serif">expert</span> reviews.</>}
          subtitle="Access the audit dashboard to review technical deliverables, resolve disputes, and maintain quality standards across the platform."
          features={EXPERT_FEATURES}
        />

        {/* RIGHT — Login Form */}
        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-card-brand">
              <Icon name="shield-check" style={{ width: 20, height: 20 }} />
              {' '}
              <span className="auth-card-brand-name">GigBoard</span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 24, marginBottom: 4 }}>Expert Reviewer Login</h2>
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 32 }}>Access the audit dashboard to review deliverables and resolve disputes.</p>

            <form id="expertLoginForm" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                {' '}
                <input type="email" className="form-input" placeholder="expert@example.com" id="expertEmail"
                       value={email} onChange={e => { setEmail(e.target.value); clearError('expertEmail'); }}
                       style={errorStyle('expertEmail')} />
                <FieldError id="expertEmail" message={errors.expertEmail} />
              </div>

              <div className="form-group">
                <div className="form-label-row">
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  {' '}
                  <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
                </div>
                <PasswordInput
                  id="expertPw"
                  toggleId="toggleExpertPw"
                  value={pw}
                  onChange={e => { setPw(e.target.value); clearError('expertPw'); }}
                  error={errors.expertPw}
                  style={errorStyle('expertPw')}
                />
              </div>

              <div className="remember-row">
                <input type="checkbox" id="rememberMe" />
                {' '}
                <label htmlFor="rememberMe">Remember me</label>
              </div>

              <button type="submit" className="btn-submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Login'}</button>
            </form>

            <div className="divider">
              <div className="divider-line"></div>
              <span className="divider-text">or continue with</span>
              <div className="divider-line"></div>
            </div>

            <button className="btn-google" onClick={handleGoogleLogin}>
              <GoogleIcon /> Login with Google
            </button>

            <p className="auth-footer-text" style={{ marginTop: 32 }}>
              Want to join our network? <Link to="/expert-signup">Apply as Expert Reviewer</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
