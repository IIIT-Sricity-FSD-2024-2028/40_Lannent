/**
 * LANNENT — Signup
 * Converted from front-end/pages/signup.html.
 *
 * Creates a Client or Gig Worker account, signs the user in and opens their
 * dashboard. Includes live feedback: password strength bar, password
 * requirement checklist and green/red field states.
 */
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import AuthBranding from '../components/AuthBranding';
import PasswordInput from '../components/PasswordInput';
import FieldError from '../components/FieldError';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useFieldErrors from '../hooks/useFieldErrors';
import usePageTitle from '../hooks/usePageTitle';

// Password rules shown in the live checklist under the password field.
const PASSWORD_REQUIREMENTS = [
  { id: 'reqLen', text: 'At least 8 characters', test: v => v.length >= 8 },
  { id: 'reqUpper', text: 'One uppercase letter', test: v => /[A-Z]/.test(v) },
  { id: 'reqLower', text: 'One lowercase letter', test: v => /[a-z]/.test(v) },
  { id: 'reqNum', text: 'One number', test: v => /\d/.test(v) },
  { id: 'reqSpecial', text: 'One special character (!@#$%^&*)', test: v => /[!@#$%^&*]/.test(v) },
];

// Avatar colour given to a new account, per role.
const ROLE_COLORS = { client: 'linear-gradient(135deg,#6366f1,#4f46e5)', worker: 'linear-gradient(135deg,#10b981,#059669)' };

/** Green "input-success" / red "input-error" class for a field ('' = neutral). */
function stateClass(state) {
  return state ? ' input-' + state : '';
}

export default function Signup() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Sign Up — Lannent');
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  // Required: the phone signs in as well as the email.
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 'success' | 'error' | '' for each field (drives the green/red border classes)
  const [fieldState, setFieldState] = useState({});
  // Role picker error: the message is cleared when a role is picked; the red
  // outline stays, exactly as in the original page.
  const [roleError, setRoleError] = useState('');
  const [roleOutline, setRoleOutline] = useState(false);
  const { errors, showError, clearError, validateForm, errorStyle } = useFieldErrors();

  // If already logged in, redirect
  if (Auth.isLoggedIn()) {
    return <Navigate to={Auth.getDashboardUrl(Auth.getCurrentUser().role)} replace />;
  }

  const setState = (id, state) => setFieldState(prev => ({ ...prev, [id]: state }));

  function selectRole(role) {
    setSelectedRole(role);
    setRoleError('');
  }

  // ── Real-time validation while typing ──
  function onNameChange(value) {
    setName(value);
    clearError('signupName');
    const val = value.trim();
    setState('signupName', val.length > 0 && !Validate.fullName(val) && val.length >= 3 ? 'success' : '');
  }

  function onEmailChange(value) {
    setEmail(value);
    clearError('signupEmail');
    const val = value.trim();
    setState('signupEmail', val.length > 0 && !Validate.email(val) ? 'success' : '');
  }

  const PHONE_COUNTRIES = Validate.getPhoneCountries();
  const phoneRule = Validate.getPhoneValidationRule(countryCode);
  const phoneCheck = v => Validate.required(v, 'Phone number') || Validate.validatePhoneNumber(v, countryCode);

  function onPhoneChange(value, code = countryCode) {
    const digits = value.replace(/\D/g, '');
    setPhone(digits);
    clearError('signupPhone');
    setState('signupPhone', digits && !Validate.validatePhoneNumber(digits, code) ? 'success' : '');
  }

  function onPasswordChange(value) {
    setPw(value);
    clearError('signupPw');
    setState('signupPw', '');
  }

  function onConfirmChange(value) {
    setConfirm(value);
    clearError('signupConfirm');
    if (value.length === 0) setState('signupConfirm', '');
    else setState('signupConfirm', pw && value === pw ? 'success' : 'error');
  }

  // ── Signup form submission ──
  function handleSubmit(e) {
    e.preventDefault();
    const nameVal = name.trim();
    const emailVal = email.trim();

    const { valid, errors: formErrors } = validateForm([
      { fieldId: 'signupName', value: nameVal, checks: [Validate.fullName] },
      { fieldId: 'signupEmail', value: emailVal, checks: [Validate.email] },
      { fieldId: 'signupPhone', value: phone.trim(), checks: [phoneCheck] },
      { fieldId: 'signupPw', value: pw, checks: [Validate.password] },
      { fieldId: 'signupConfirm', value: confirm, checks: [v => Validate.passwordMatch(pw, v)] },
    ]);

    // Clear all visual states, then mark the error fields
    const states = {};
    Object.keys(formErrors).forEach(fid => { states[fid] = 'error'; });
    setFieldState(states);

    // Role check
    if (!selectedRole) {
      setRoleOutline(true);
      setRoleError('Please select a role to continue.');
      if (valid) return;
    }
    if (!valid || !selectedRole) return;

    // Check if email already exists
    if (Store.getUserByEmail(emailVal)) { showError('signupEmail', 'An account with this email already exists.'); return; }

    setSubmitting(true);
    setTimeout(() => {
      const initials = nameVal.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      try {
        Store.createUser({
          name: nameVal, email: emailVal, phone: countryCode + phone.trim(), phoneCountryCode: countryCode,
          password: pw, role: selectedRole, avatar: initials, avatarColor: ROLE_COLORS[selectedRole] || '',
        });
      } catch (e) {
        // e.g. the email is taken. A refused signup used to create a
        // local-only account and then fail to sign in with no explanation.
        showError(/phone/i.test(e.message) ? 'signupPhone' : 'signupEmail', e.message);
        setSubmitting(false);
        return;
      }
      const result = Auth.login(emailVal, pw);
      if (result.success) {
        navigate(Auth.getDashboardUrl(selectedRole));
      } else {
        setSubmitting(false);
      }
    }, 400);
  }

  // Password strength bar (hidden while the field is empty)
  const strength = Validate.passwordStrength(pw);
  const barClass = strength.level === 1 ? 'active-weak' : strength.level === 2 ? 'active-medium' : 'active-strong';

  return (
    <div className="auth-page">
      {/* Background video (fixed height so it doesn't zoom on tall pages) */}
      <AuthBranding
        videoWrapStyle={{ position: 'fixed', inset: 0, zIndex: 0 }}
        leftStyle={{ position: 'sticky', top: 0, height: '100vh' }}
      />

      {/* RIGHT — Signup Form */}
      <div className="auth-right" style={{ position: 'relative', zIndex: 1, alignItems: 'flex-start', paddingTop: 48, paddingBottom: 48 }}>
        <div className="auth-card">
          <div className="auth-card-brand">
            <Icon name="shield-check" style={{ width: 20, height: 20 }} />
            {' '}
            <span className="auth-card-brand-name">Lannent</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 24, marginBottom: 4 }}>Create your account</h2>
          <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 24 }}>Get started with your first project</p>

          <form id="signupForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              {' '}
              <input type="text" className={'form-input' + stateClass(fieldState.signupName)} placeholder="John Doe" id="signupName"
                     value={name} onChange={e => onNameChange(e.target.value)} style={errorStyle('signupName')} />
              <FieldError id="signupName" message={errors.signupName} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              {' '}
              <input type="email" className={'form-input' + stateClass(fieldState.signupEmail)} placeholder="you@example.com" id="signupEmail"
                     value={email} onChange={e => onEmailChange(e.target.value)} style={errorStyle('signupEmail')} />
              <FieldError id="signupEmail" message={errors.signupEmail} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="signupPhone">Phone Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="form-input" aria-label="Country code" value={countryCode} style={{ width: 'auto', flex: 'none', paddingRight: 8 }}
                        onChange={e => { setCountryCode(e.target.value); onPhoneChange(phone, e.target.value); }}>
                  {PHONE_COUNTRIES.map(c => <option key={c.code} value={c.code}>{`${c.flag} ${c.code}`}</option>)}
                </select>
                <input type="tel" inputMode="numeric" className={'form-input' + stateClass(fieldState.signupPhone)} placeholder={phoneRule.placeholder}
                       id="signupPhone" autoComplete="tel-national" maxLength={phoneRule.length}
                       value={phone} onChange={e => onPhoneChange(e.target.value)}
                       style={{ ...(errorStyle('signupPhone') || {}), flex: 1, minWidth: 0 }} />
              </div>
              <FieldError id="signupPhone" message={errors.signupPhone} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <PasswordInput
                id="signupPw"
                toggleId="togglePw"
                className={stateClass(fieldState.signupPw).trim()}
                value={pw}
                onChange={e => onPasswordChange(e.target.value)}
                error={errors.signupPw}
                style={errorStyle('signupPw')}
              />

              {/* Strength bar */}
              <div className="pw-strength" id="pwStrengthWrap" style={pw.length === 0 ? { display: 'none' } : undefined}>
                <div className="pw-strength-bars">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={'pw-strength-bar' + (i <= strength.level ? ' ' + barClass : '')} id={'pwBar' + i}></div>
                  ))}
                </div>
                <span className={'pw-strength-label ' + strength.label.toLowerCase()} id="pwStrengthLabel">{strength.label}</span>
              </div>

              {/* Requirements checklist */}
              <div className="pw-requirements" id="pwRequirements" style={pw.length === 0 ? { display: 'none' } : undefined}>
                {PASSWORD_REQUIREMENTS.map(r => (
                  <div key={r.id} className={'pw-req' + (r.test(pw) ? ' met' : '')} id={r.id}>
                    <span className="pw-req-icon">✓</span>
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <PasswordInput
                id="signupConfirm"
                toggleId="toggleConfirm"
                className={stateClass(fieldState.signupConfirm).trim()}
                value={confirm}
                onChange={e => onConfirmChange(e.target.value)}
                error={errors.signupConfirm}
                style={errorStyle('signupConfirm')}
              />
            </div>

            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">I want to</label>
              <div className="role-grid" id="roleGroup" style={roleOutline ? { outline: '2px solid #ef4444', borderRadius: 12 } : undefined}>
                <button type="button" className={'role-card' + (selectedRole === 'client' ? ' active' : '')} id="roleClient" onClick={() => selectRole('client')}>
                  <div className="role-card-icon">
                    <Icon name="clipboard-list" style={{ width: 20, height: 20 }} />
                  </div>
                  <p className="role-card-title">Client</p>
                  <p className="role-card-desc">Post tasks and hire gig workers</p>
                </button>
                {' '}
                <button type="button" className={'role-card' + (selectedRole === 'worker' ? ' active' : '')} id="roleWorker" onClick={() => selectRole('worker')}>
                  <div className="role-card-icon">
                    <Icon name="wrench" style={{ width: 20, height: 20 }} />
                  </div>
                  <p className="role-card-title">Gig Worker</p>
                  <p className="role-card-desc">Find projects and submit deliverables</p>
                </button>
              </div>
              {roleError && <p id="roleGroup_err" style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{roleError}</p>}
            </div>

            <button type="submit" className="btn-submit" style={{ marginTop: 4 }} disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="auth-footer-text">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
