/**
 * LANNENT — ExpertSignup
 * Converted from front-end/pages/expert-signup.html.
 *
 * Application form for becoming an Expert Reviewer. Every field validates
 * live (on typing — debounced — on blur and on change), the submit button
 * only enables once the whole form is valid, and documents can be dropped
 * onto the upload zones. On submit the files are uploaded, the application
 * is saved and a success dialog is shown.
 */
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import AuthBranding from '../components/AuthBranding';
import PasswordInput from '../components/PasswordInput';
import PageStyle from '../components/PageStyle';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ExpertSignup.css?raw';

// ─── Select options ────────────────────────────────────────────────────────────
const COUNTRY_OPTIONS = [
  ['in', 'India'], ['us', 'United States'], ['uk', 'United Kingdom'], ['ca', 'Canada'], ['au', 'Australia'],
  ['de', 'Germany'], ['fr', 'France'], ['sg', 'Singapore'], ['other', 'Other'],
];
const EXPERTISE_OPTIONS = [
  ['frontend', 'Frontend Development'], ['backend', 'Backend Development'], ['fullstack', 'Full-Stack Development'],
  ['mobile', 'Mobile Development'], ['devops', 'DevOps & Infrastructure'], ['security', 'Security & Auditing'],
  ['data', 'Data Engineering'], ['ml', 'Machine Learning'],
];
const YEARS_OPTIONS = [['1-3', '1–3 years'], ['3-5', '3–5 years'], ['5-8', '5–8 years'], ['8-12', '8–12 years'], ['12+', '12+ years']];

const PASSWORD_REQUIREMENTS = [
  { id: 'expReqLen', text: 'At least 8 characters', test: v => v.length >= 8 },
  { id: 'expReqUpper', text: 'One uppercase letter', test: v => /[A-Z]/.test(v) },
  { id: 'expReqLower', text: 'One lowercase letter', test: v => /[a-z]/.test(v) },
  { id: 'expReqNum', text: 'One number', test: v => /\d/.test(v) },
  { id: 'expReqSpecial', text: 'One special character (!@#$%^&*)', test: v => /[!@#$%^&*]/.test(v) },
];

const EXPERT_FEATURES = [
  { icon: 'file-check', text: 'Conduct technical audits' },
  { icon: 'scale', text: 'Resolve project disputes' },
  { icon: 'lock', text: 'Earn ₹80–₹150 per review' },
];

// Shared style of the eye buttons on this page.
const TOGGLE_STYLE = { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' };

// Default text of the two upload zones.
const UPLOAD_TEXT = {
  expResume: { main: 'Click or drag & drop your resume', sub: 'PDF only · Max 2MB' },
  expCert: { main: 'Click or drag & drop certifications', sub: 'PDF, JPG, PNG · Max 5MB' },
};

const INITIAL_VALUES = {
  expName: '', expEmail: '', expPassword: '', expConfirmPw: '', expPhoneCountry: '+91', expPhone: '',
  expCountry: '', expExpertise: '', expYears: '', expLinkedin: '', expGithub: '', expMotivation: '',
  expResume: null, expCert: null,   // File objects
};

/* ────────────────────────────────────────────────
   INDIVIDUAL VALIDATORS
   Each takes the form values and returns null (valid) or an error string.
──────────────────────────────────────────────── */
/** Builds the validators. The phone rule comes from the validation context. */
function createFieldValidators(Validate) {
  return {
    /** 1. Full Name: required, min 2, letters/spaces/dots */
    expName(v) {
      const s = v.expName.trim();
      if (!s) return 'Full name is required.';
      if (s.length < 2) return 'Full name must be at least 2 characters.';
      // Any script's letters, plus hyphens and apostrophes — see Validate.fullName.
      if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'’.\-]*$/u.test(s)) return 'Name can contain letters, spaces, hyphens and apostrophes.';
      return null;
    },
    /** 2. Email */
    expEmail(v) {
      const s = v.expEmail.trim();
      if (!s) return 'Email address is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'Please enter a valid email address.';
      return null;
    },
    /** 12. Password: required, 8+ chars, upper+lower+digit+special */
    expPassword(v) {
      const s = v.expPassword;
      if (!s) return 'Password is required.';
      if (s.length < 8) return 'Password must be at least 8 characters.';
      if (!/[A-Z]/.test(s)) return 'Password must contain at least one uppercase letter.';
      if (!/[a-z]/.test(s)) return 'Password must contain at least one lowercase letter.';
      if (!/\d/.test(s)) return 'Password must contain at least one number.';
      if (!/[!@#$%^&*]/.test(s)) return 'Password must contain at least one special character (!@#$%^&*).';
      return null;
    },
    /** 13. Confirm Password: must match */
    expConfirmPw(v) {
      if (!v.expConfirmPw) return 'Please confirm your password.';
      if (v.expConfirmPw !== v.expPassword) return 'Passwords do not match.';
      return null;
    },
    /** 3. Phone (country-aware, required) */
    expPhone(v) {
      const code = v.expPhoneCountry;
      const s = v.expPhone.trim();
      if (!s) return 'Phone number is required.';
      const digits = s.replace(/\D/g, '');
      const rule = Validate.getPhoneValidationRule(code);
      if (digits.length !== rule.length) return `Phone must be exactly ${rule.length} digits for ${rule.name} (${code}).`;
      if (!rule.pattern.test(digits)) return `Invalid phone number for ${rule.name} (${code}).`;
      return null;
    },
    /** 4. Country dropdown */
    expCountry(v) { return v.expCountry ? null : 'Please select your country.'; },
    /** 5. Primary Expertise dropdown */
    expExpertise(v) { return v.expExpertise ? null : 'Please select your primary expertise.'; },
    /** 6. Years of Experience dropdown */
    expYears(v) { return v.expYears ? null : 'Please select your years of experience.'; },
    /** 7. LinkedIn (optional, must be valid URL containing linkedin.com) */
    expLinkedin(v) {
      const s = v.expLinkedin.trim();
      if (!s) return null; // optional
      let u; try { u = new URL(s); } catch { return 'Please enter a valid URL.'; }
      if (!/^https?:$/.test(u.protocol)) return 'Enter a full web address starting with https://';
      if (!u.hostname.toLowerCase().endsWith('linkedin.com')) return 'URL must be a linkedin.com address.';
      return null;
    },
    /** 8. GitHub / Portfolio (optional, must be valid URL) */
    expGithub(v) {
      const s = v.expGithub.trim();
      if (!s) return null; // optional
      let u; try { u = new URL(s); } catch { return 'Please enter a valid URL.'; }
      if (!/^https?:$/.test(u.protocol)) return 'Enter a full web address starting with https://';
      return null;
    },
    /** 9. Resume: required, PDF only, max 2MB */
    expResume(v) {
      const file = v.expResume;
      if (!file) return 'Please upload your resume (PDF).';
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return 'Resume must be a PDF file.';
      if (file.size > 2 * 1024 * 1024) return 'Resume must be under 2MB.';
      return null;
    },
    /** 10. Certifications: optional, PDF/JPG/PNG, max 5MB */
    expCert(v) {
      const file = v.expCert;
      if (!file) return null; // optional
      const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
      const ext = file.name.toLowerCase().split('.').pop();
      if (!allowed.includes(file.type) && !['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) return 'Only PDF, JPG, or PNG files allowed.';
      if (file.size > 5 * 1024 * 1024) return 'Certifications must be under 5MB.';
      return null;
    },
    /** 11. Motivation: required, 30–500 chars */
    expMotivation(v) {
      const s = v.expMotivation.trim();
      if (!s) return 'This field is required.';
      if (s.length < 30) return `Please write at least 30 characters (currently ${s.length}).`;
      if (s.length > 500) return 'Maximum 500 characters allowed.';
      return null;
    },
  };
}

/** Run ALL validators silently (no UI changes) to determine submit button state. */
function isFormValid(fieldValidators, values) {
  return Object.values(fieldValidators).every(fn => fn(values) === null);
}

/** Label of the selected option (what the admin queue displays). */
function optionLabel(options, value) {
  const found = options.find(([v]) => v === value);
  return found ? found[1] : value;
}

export default function ExpertSignup() {
  const Store = useStore();
  const Validate = useValidation();
  const PHONE_COUNTRIES = Validate.getPhoneCountries();
  const fieldValidators = useMemo(() => createFieldValidators(Validate), [Validate]);
  usePageTitle('Apply as Expert Reviewer — Lannent');

  const [values, setValues] = useState(INITIAL_VALUES);
  const valuesRef = useRef(INITIAL_VALUES);          // latest values, for debounced validation
  const timersRef = useRef({});                       // debounce timer per text field
  const resumeInputRef = useRef(null);
  const certInputRef = useRef(null);

  // Per-field UI: { invalid, valid, error } → "input-error" / "input-valid" classes + message
  const [fieldUi, setFieldUi] = useState({});
  // Upload zones: { dragOver, hasFile, hasError }
  const [zones, setZones] = useState({ expResume: {}, expCert: {} });
  const [motivationTouched, setMotivationTouched] = useState(false);
  const [submitEnabled, setSubmitEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  /* ── value helpers ── */
  function setValue(id, value) {
    valuesRef.current = { ...valuesRef.current, [id]: value };
    setValues(valuesRef.current);
  }

  /* ────────────────────────────────────────────────
     ERROR HELPERS (per-field, below-field messages)
  ──────────────────────────────────────────────── */
  const updateUi = (id, patch) => setFieldUi(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const showFieldError = (id, msg) => updateUi(id, { valid: false, invalid: true, error: msg });
  const clearFieldError = (id) => updateUi(id, { invalid: false, error: '' });
  const markFieldValid = (id) => updateUi(id, { invalid: false, valid: true, error: '' });
  const clearFieldClasses = (id) => updateUi(id, { invalid: false, valid: false });

  /** Run a single field's validator and update UI. Returns true if valid. */
  function runFieldValidation(id) {
    const err = fieldValidators[id](valuesRef.current);
    if (err) { showFieldError(id, err); return false; }
    markFieldValid(id);
    return true;
  }

  /** Enable / disable submit button based on form validity. */
  function updateSubmitState() {
    setSubmitEnabled(isFormValid(fieldValidators, valuesRef.current));
  }

  const setZone = (id, patch) => setZones(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  /* ────────────────────────────────────────────────
     EVENT WIRING: input / change / blur
  ──────────────────────────────────────────────── */
  // Text fields — validate on input (debounced 350ms) and on blur
  function onTextInput(id, value) {
    setValue(id, value);
    clearTimeout(timersRef.current[id]);
    clearFieldError(id);
    timersRef.current[id] = setTimeout(() => { runFieldValidation(id); updateSubmitState(); }, 350);
  }

  function onTextBlur(id) {
    clearTimeout(timersRef.current[id]);
    runFieldValidation(id);
    updateSubmitState();
  }

  /* ── Real-time password strength indicator ── */
  function onPasswordInput(value) {
    setValue('expPassword', value);
    clearFieldError('expPassword');
    clearFieldClasses('expPassword');
    // Also re-check confirm match if confirm has value
    if (value.length > 0 && valuesRef.current.expConfirmPw) runFieldValidation('expConfirmPw');
    updateSubmitState();
    onTextInput('expPassword', value);
  }

  /* ── Real-time confirm password ── */
  function onConfirmInput(value) {
    setValue('expConfirmPw', value);
    clearFieldError('expConfirmPw');
    clearFieldClasses('expConfirmPw');
    if (value.length > 0) {
      const pw = valuesRef.current.expPassword;
      if (pw && value === pw) updateUi('expConfirmPw', { valid: true });
      else updateUi('expConfirmPw', { invalid: true });
    }
    updateSubmitState();
    onTextInput('expConfirmPw', value);
  }

  /* ── Phone: digits only ── */
  function onPhoneInput(value) {
    onTextInput('expPhone', value.replace(/\D/g, ''));
  }

  function onPhoneKeyPress(e) {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  }

  function onPhonePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    setValue('expPhone', text.replace(/\D/g, '').substring(0, phoneRule.length || 15));
  }

  // Dropdowns — validate on change
  function onSelectChange(id, value) {
    setValue(id, value);
    if (id === 'expPhoneCountry') {
      // Re-validate the number against the new country's rules
      if (valuesRef.current.expPhone.trim()) runFieldValidation('expPhone');
    } else {
      runFieldValidation(id);
    }
    updateSubmitState();
  }

  /* ────────────────────────────────────────────────
     FILE UPLOADS (click or drag & drop)
  ──────────────────────────────────────────────── */
  function onFileChange(id, files) {
    const file = files && files[0] ? files[0] : null;
    setValue(id, file);
    setZone(id, file ? { hasFile: true, hasError: false } : { hasFile: false });

    const err = fieldValidators[id](valuesRef.current);
    if (err) {
      showFieldError(id, err);
      setZone(id, { hasError: true, hasFile: false });
    } else {
      clearFieldError(id);
      setZone(id, { hasError: false });
    }
    updateSubmitState();
  }

  // Drag events for an upload zone
  function dragHandlers(id, inputRef) {
    const over = e => { e.preventDefault(); e.stopPropagation(); setZone(id, { dragOver: true }); };
    const leave = e => { e.preventDefault(); e.stopPropagation(); setZone(id, { dragOver: false }); };
    return {
      onDragEnter: over,
      onDragOver: over,
      onDragLeave: leave,
      onDrop: e => {
        leave(e);
        const dt = e.dataTransfer;
        if (dt.files && dt.files.length > 0) {
          inputRef.current.files = dt.files;
          onFileChange(id, dt.files);
        }
      },
    };
  }

  /* ────────────────────────────────────────────────
     FORM SUBMIT
  ──────────────────────────────────────────────── */
  function handleSubmit(e) {
    e.preventDefault();
    const v = valuesRef.current;

    // Run ALL validations with UI
    let firstErrorId = null;
    const requiredFields = ['expName', 'expEmail', 'expPassword', 'expConfirmPw', 'expPhone', 'expCountry', 'expExpertise', 'expYears', 'expResume', 'expMotivation'];
    const optionalFields = ['expLinkedin', 'expGithub', 'expCert'];
    [...requiredFields, ...optionalFields].forEach(id => {
      const valid = runFieldValidation(id);
      if (!valid && !firstErrorId) firstErrorId = id;
      // Update upload zone error state for file fields
      if ((id === 'expResume' || id === 'expCert') && !valid) setZone(id, { hasError: true });
    });

    if (firstErrorId) {
      // Scroll to first error
      const grp = document.getElementById('grp-' + firstErrorId) || document.getElementById(firstErrorId);
      if (grp) grp.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // A duplicate email (an account, or an application already under review)
    // is refused by the server when the application is sent.
    const email = v.expEmail.trim();

    // ── Loading state ──
    setSubmitting(true);
    setSubmitEnabled(false);

    const appData = {
      name: v.expName.trim(),
      email,
      password: v.expPassword,
      phone: v.expPhone.trim(),
      phoneCountry: v.expPhoneCountry,
      // Send the option LABELS. The raw values are codes ("in", "frontend"),
      // and the admin queue displays these fields verbatim — a reviewer was
      // seeing "in / frontend" instead of "India / Frontend Development".
      country: optionLabel(COUNTRY_OPTIONS, v.expCountry),
      expertise: optionLabel(EXPERTISE_OPTIONS, v.expExpertise),
      experience: optionLabel(YEARS_OPTIONS, v.expYears),
      linkedin: v.expLinkedin.trim(),
      github: v.expGithub.trim(),
      motivation: v.expMotivation.trim(),
      // Names are kept alongside the references so an older application, or
      // one whose upload failed, still shows the reviewer what was offered.
      resumeName: v.expResume?.name || null,
      certificateName: v.expCert?.name || null,
      resumeFile: null,
      certificateFile: null,
    };

    // The applicant has no account yet, so these go through the public
    // application upload; the stored files are readable by staff only.
    // A failed upload stops the submission: an application filed without the
    // résumé the applicant attached would be judged on less than they sent.
    const uploads = [];
    if (v.expResume) {
      uploads.push(Store.uploadFile(v.expResume, { purpose: 'expert-application' })
        .then(ref => { appData.resumeFile = ref; })
        .catch(err => { throw new Error('Your résumé could not be uploaded: ' + err.message); }));
    }
    if (v.expCert) {
      uploads.push(Store.uploadFile(v.expCert, { purpose: 'expert-application' })
        .then(ref => { appData.certificateFile = ref; })
        .catch(err => { throw new Error('Your certificate could not be uploaded: ' + err.message); }));
    }

    Promise.all(uploads).catch(err => {
      setSubmitting(false);
      setSubmitEnabled(true);
      Validate.toast(err.message, 'error');
      return 'failed';
    }).then(outcome => {
      if (outcome === 'failed') return;
      const result = Store.saveExpertApplication(appData);
      setSubmitting(false);
      if (!result.success) {
        // Only an email problem belongs under the email field.
        if (/email/i.test(result.error || '')) showFieldError('expEmail', result.error);
        else Validate.toast(result.error, 'error');
        setSubmitEnabled(true);
        return;
      }
      setShowSuccess(true);
    });
  }

  /* ── Derived display values ── */
  const phoneRule = Validate.getPhoneValidationRule(values.expPhoneCountry);
  const pw = values.expPassword;
  const strength = Validate.passwordStrength(pw);
  const barClass = strength.level === 1 ? 'active-weak' : strength.level === 2 ? 'active-medium' : 'active-strong';

  // Motivation character counter (neutral until the first keystroke)
  const motivLen = values.expMotivation.length;
  let counterClass = 'char-counter', counterMin = 'Min 30 characters', barStyle = { width: '0%', background: 'var(--border)' };
  if (motivationTouched) {
    barStyle = { width: Math.min(100, (motivLen / 500) * 100) + '%' };
    if (motivLen < 30) { counterClass = 'char-counter danger'; barStyle.background = '#ef4444'; counterMin = `${30 - motivLen} more needed`; }
    else if (motivLen > 450) { counterClass = 'char-counter warning'; barStyle.background = '#f59e0b'; counterMin = `${500 - motivLen} remaining`; }
    else { barStyle.background = '#10b981'; counterMin = '✓ Meets minimum'; }
  }

  /** "form-input" plus the field's error/valid state class. */
  const inputClass = (id, base = 'form-input') =>
    base + (fieldUi[id]?.invalid ? ' input-error' : '') + (fieldUi[id]?.valid ? ' input-valid' : '');

  /** The message box under a field (hidden when there is no error). */
  const errorBox = (id) => {
    const msg = fieldUi[id]?.error;
    return (
      <div id={id + '_error'} className="field-error-msg" style={{ display: msg ? 'flex' : 'none' }}>
        {msg && (
          <>
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {msg}
          </>
        )}
      </div>
    );
  };

  /** Main + sub text of an upload zone (file name and size once chosen). */
  const uploadText = (id) => {
    const file = values[id];
    if (!file) return UPLOAD_TEXT[id];
    return {
      main: (
        <span className="upload-file-name">
          <Icon name="file-check" style={{ width: 14, height: 14 }} />{' ' + file.name}
        </span>
      ),
      sub: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    };
  };

  const zoneClass = (id) => 'upload-zone'
    + (zones[id].dragOver ? ' drag-over' : '')
    + (zones[id].hasFile ? ' has-file' : '')
    + (zones[id].hasError ? ' has-error' : '');

  // Props shared by every debounced text field
  const textProps = (id) => ({
    id,
    value: values[id],
    onChange: e => onTextInput(id, e.target.value),
    onBlur: () => onTextBlur(id),
  });

  return (
    <>
      <PageStyle css={pageCss} />
      <div className="auth-page">
        {/* Background video (fixed) + LEFT — Branding (sticky) */}
        <AuthBranding
          title={<>Join our network of <span className="serif">expert</span> reviewers.</>}
          subtitle="Help maintain quality standards across the platform by conducting technical audits and resolving disputes. Earn competitive fees while building your reputation."
          features={EXPERT_FEATURES}
        />

        {/* RIGHT — Application Form (scrollable) */}
        <div className="auth-right" style={{ alignItems: 'flex-start', paddingTop: 48, paddingBottom: 48, overflowY: 'auto', maxHeight: '100vh' }}>
          <div className="auth-card-signup">
            <div className="auth-card-brand">
              <Icon name="shield-check" style={{ width: 20, height: 20 }} />
              {' '}
              <span className="auth-card-brand-name">Lannent</span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 24, marginBottom: 4 }}>Apply as Expert Reviewer</h2>
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 28 }}>Join our network of technical experts who verify project deliverables.</p>

            <form id="expertSignupForm" noValidate onSubmit={handleSubmit}>
              {/* ═══ BASIC INFORMATION ═══ */}
              <div className="section-title">
                <Icon name="user" /> Basic Information
              </div>

              {/* Full Name */}
              <div className="form-group" id="grp-expName">
                <label className="form-label" htmlFor="expName">
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                  {' '}
                  <span className="label-tooltip">
                    <Icon name="help-circle" />
                    {' '}
                    <span className="tooltip-text">Letters, spaces, and prefixes like "Dr." allowed</span>
                  </span>
                </label>
                {' '}
                <input type="text" className={inputClass('expName')} placeholder="Dr. Jane Smith" aria-required="true" autoComplete="name" {...textProps('expName')} />
                {errorBox('expName')}
              </div>

              {/* Email & Phone Row */}
              <div className="form-group" id="grp-expEmail">
                <label className="form-label" htmlFor="expEmail">
                  Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="input-icon-wrap">
                  <span className="input-icon">
                    <Icon name="mail" style={{ width: 16, height: 16 }} />
                  </span>
                  {' '}
                  <input type="email" className={inputClass('expEmail')} placeholder="jane@example.com" aria-required="true" autoComplete="email" {...textProps('expEmail')} />
                </div>
                {errorBox('expEmail')}
              </div>

              {/* Password */}
              <div className="form-group" id="grp-expPassword">
                <label className="form-label" htmlFor="expPassword">
                  Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <PasswordInput
                  id="expPassword"
                  toggleId="toggleExpPw"
                  toggleStyle={TOGGLE_STYLE}
                  className={inputClass('expPassword', '').trim()}
                  value={pw}
                  onChange={e => onPasswordInput(e.target.value)}
                  onBlur={() => onTextBlur('expPassword')}
                  aria-required="true"
                  autoComplete="new-password"
                />
                <div className="pw-strength" id="expPwStrengthWrap" style={pw.length === 0 ? { display: 'none' } : undefined}>
                  <div className="pw-strength-bars">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={'pw-strength-bar' + (i <= strength.level ? ' ' + barClass : '')} id={'expPwBar' + i}></div>
                    ))}
                  </div>
                  <span className={'pw-strength-label' + (strength.label ? ' ' + strength.label.toLowerCase() : '')} id="expPwStrengthLabel">{strength.label}</span>
                </div>
                <div className="pw-requirements" id="expPwRequirements" style={pw.length === 0 ? { display: 'none' } : undefined}>
                  {PASSWORD_REQUIREMENTS.map(r => (
                    <div key={r.id} className={'pw-req' + (r.test(pw) ? ' met' : '')} id={r.id}>
                      <span className="pw-req-icon">✓</span>
                      <span>{r.text}</span>
                    </div>
                  ))}
                </div>
                {errorBox('expPassword')}
              </div>

              {/* Confirm Password */}
              <div className="form-group" id="grp-expConfirmPw">
                <label className="form-label" htmlFor="expConfirmPw">
                  Confirm Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <PasswordInput
                  id="expConfirmPw"
                  toggleId="toggleExpConfirm"
                  toggleStyle={TOGGLE_STYLE}
                  className={inputClass('expConfirmPw', '').trim()}
                  value={values.expConfirmPw}
                  onChange={e => onConfirmInput(e.target.value)}
                  onBlur={() => onTextBlur('expConfirmPw')}
                  aria-required="true"
                  autoComplete="new-password"
                />
                {errorBox('expConfirmPw')}
              </div>

              {/* Phone with Country Code */}
              <div className="form-group" id="grp-expPhone">
                <label className="form-label" htmlFor="expPhone">
                  Phone Number <span style={{ color: '#ef4444' }}>*</span>
                  {' '}
                  <span className="label-tooltip">
                    <Icon name="help-circle" />
                    {' '}
                    <span className="tooltip-text">Digits only, validated per country</span>
                  </span>
                </label>
                <div className="exp-phone-group">
                  <select className="exp-phone-country" id="expPhoneCountry" aria-label="Country code"
                          value={values.expPhoneCountry} onChange={e => onSelectChange('expPhoneCountry', e.target.value)}>
                    {PHONE_COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{`${c.flag} ${c.name} (${c.code})`}</option>
                    ))}
                  </select>
                  <div className="exp-phone-input-wrap">
                    <span className="input-icon">
                      <Icon name="phone" style={{ width: 16, height: 16 }} />
                    </span>
                    {' '}
                    <input type="tel" className={inputClass('expPhone')} aria-required="true" autoComplete="tel"
                           maxLength={phoneRule.length} placeholder={phoneRule.placeholder}
                           {...textProps('expPhone')}
                           onChange={e => onPhoneInput(e.target.value)}
                           onKeyPress={onPhoneKeyPress}
                           onPaste={onPhonePaste} />
                  </div>
                </div>
                <div className="exp-phone-hint" id="expPhoneHint">
                  <Icon name="info" />{` Enter ${phoneRule.length}-digit number`}
                </div>
                {errorBox('expPhone')}
              </div>

              {/* Country */}
              <div className="form-group" id="grp-expCountry">
                <label className="form-label" htmlFor="expCountry">
                  Country <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {' '}
                <select className={inputClass('expCountry')} id="expCountry" aria-required="true"
                        value={values.expCountry} onChange={e => onSelectChange('expCountry', e.target.value)}>
                  <option value="">Select your country</option>
                  {COUNTRY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {errorBox('expCountry')}
              </div>

              {/* ═══ PROFESSIONAL DETAILS ═══ */}
              <div className="section-title" style={{ marginTop: 8 }}>
                <Icon name="briefcase" /> Professional Details
              </div>

              {/* Primary Expertise */}
              <div className="form-group" id="grp-expExpertise">
                <label className="form-label" htmlFor="expExpertise">
                  Primary Expertise <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {' '}
                <select className={inputClass('expExpertise')} id="expExpertise" aria-required="true"
                        value={values.expExpertise} onChange={e => onSelectChange('expExpertise', e.target.value)}>
                  <option value="">Select your primary expertise</option>
                  {EXPERTISE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {errorBox('expExpertise')}
              </div>

              {/* Years of Experience */}
              <div className="form-group" id="grp-expYears">
                <label className="form-label" htmlFor="expYears">
                  Years of Experience <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {' '}
                <select className={inputClass('expYears')} id="expYears" aria-required="true"
                        value={values.expYears} onChange={e => onSelectChange('expYears', e.target.value)}>
                  <option value="">Select years of experience</option>
                  {YEARS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {errorBox('expYears')}
              </div>

              {/* LinkedIn Profile */}
              <div className="form-group" id="grp-expLinkedin">
                <label className="form-label" htmlFor="expLinkedin">
                  LinkedIn Profile <span style={{ color: 'var(--muted-foreground)', fontWeight: 400, fontSize: 12 }}> (Optional)</span>
                  {' '}
                  <span className="label-tooltip">
                    <Icon name="help-circle" />
                    {' '}
                    <span className="tooltip-text">Must contain "linkedin.com"</span>
                  </span>
                </label>
                <div className="input-icon-wrap">
                  <span className="input-icon">
                    <Icon name="linkedin" style={{ width: 16, height: 16 }} />
                  </span>
                  {' '}
                  <input type="url" className={inputClass('expLinkedin')} placeholder="https://linkedin.com/in/janesmith" autoComplete="url" {...textProps('expLinkedin')} />
                </div>
                {errorBox('expLinkedin')}
              </div>

              {/* GitHub / Portfolio URL */}
              <div className="form-group" id="grp-expGithub">
                <label className="form-label" htmlFor="expGithub">
                  GitHub / Portfolio URL <span style={{ color: 'var(--muted-foreground)', fontWeight: 400, fontSize: 12 }}> (Optional)</span>
                </label>
                <div className="input-icon-wrap">
                  <span className="input-icon">
                    <Icon name="github" style={{ width: 16, height: 16 }} />
                  </span>
                  {' '}
                  <input type="url" className={inputClass('expGithub')} placeholder="https://github.com/janesmith" autoComplete="url" {...textProps('expGithub')} />
                </div>
                {errorBox('expGithub')}
              </div>

              {/* ═══ VERIFICATION DOCUMENTS ═══ */}
              <div className="section-title" style={{ marginTop: 8 }}>
                <Icon name="file-text" /> Verification Documents
              </div>

              {/* Resume Upload (PDF, max 2MB) */}
              <div className="form-group" id="grp-expResume">
                <label className="form-label">
                  Upload Resume <span style={{ color: '#ef4444' }}>*</span>
                  {' '}
                  <span className="label-tooltip">
                    <Icon name="help-circle" />
                    {' '}
                    <span className="tooltip-text">PDF only, max 2MB</span>
                  </span>
                </label>
                {' '}
                <label className={zoneClass('expResume')} id="resumeZone" htmlFor="expResume" tabIndex="0" role="button" aria-label="Upload resume PDF"
                       {...dragHandlers('expResume', resumeInputRef)}>
                  <input type="file" accept=".pdf" id="expResume" aria-required="true" ref={resumeInputRef}
                         onChange={e => onFileChange('expResume', e.target.files)} />
                  <div className="upload-icon">
                    <Icon name="upload" style={{ width: 24, height: 24 }} />
                  </div>
                  <div className="upload-main" id="resumeMainText">{uploadText('expResume').main}</div>
                  <div className="upload-sub" id="resumeSubText">{uploadText('expResume').sub}</div>
                </label>
                {errorBox('expResume')}
              </div>

              {/* Certifications Upload (Optional, PDF/JPG/PNG, max 5MB) */}
              <div className="form-group" id="grp-expCert">
                <label className="form-label">
                  Upload Certifications <span style={{ color: 'var(--muted-foreground)', fontWeight: 400, fontSize: 12 }}> (Optional)</span>
                  {' '}
                  <span className="label-tooltip">
                    <Icon name="help-circle" />
                    {' '}
                    <span className="tooltip-text">PDF, JPG, or PNG · Max 5MB</span>
                  </span>
                </label>
                {' '}
                <label className={zoneClass('expCert')} id="certZone" htmlFor="expCert" tabIndex="0" role="button" aria-label="Upload certifications"
                       {...dragHandlers('expCert', certInputRef)}>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" id="expCert" ref={certInputRef}
                         onChange={e => onFileChange('expCert', e.target.files)} />
                  <div className="upload-icon">
                    <Icon name="upload" style={{ width: 24, height: 24 }} />
                  </div>
                  <div className="upload-main" id="certMainText">{uploadText('expCert').main}</div>
                  <div className="upload-sub" id="certSubText">{uploadText('expCert').sub}</div>
                </label>
                {errorBox('expCert')}
              </div>

              {/* ═══ MOTIVATION ═══ */}
              <div className="form-group" style={{ marginTop: 8 }} id="grp-expMotivation">
                <label className="form-label" htmlFor="expMotivation">
                  Why do you want to become an expert reviewer? <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {' '}
                <textarea
                  className={inputClass('expMotivation', 'form-textarea')}
                  rows="5"
                  aria-required="true"
                  placeholder="Share your motivation and how your expertise can help maintain quality standards..."
                  maxLength="500"
                  {...textProps('expMotivation')}
                  onChange={e => { setMotivationTouched(true); onTextInput('expMotivation', e.target.value); }}
                />
                <div className={counterClass} id="motivCharCounter">
                  <span id="motivCharText">{`${motivLen}/500 characters`}</span>
                  {' '}
                  <span id="motivCharMin">{counterMin}</span>
                </div>
                <div className="char-bar">
                  <div className="char-bar-fill" id="motivCharBar" style={barStyle}></div>
                </div>
                {errorBox('expMotivation')}
              </div>

              {/* Submit Button */}
              <button type="submit" className={'btn-submit' + (submitting ? ' loading' : '')} id="expSubmitBtn" disabled={!submitEnabled || submitting} style={{ marginTop: 8 }}>
                <span id="submitBtnText">
                  {submitting ? <><div className="btn-spinner"></div> Submitting...</> : 'Submit Application'}
                </span>
              </button>
            </form>

            <p className="auth-footer-text" style={{ marginTop: 24 }}>
              Already have an account? <Link to="/expert-login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>

      {/* ═══ SUCCESS MODAL ═══ */}
      <div id="successModal" style={{ display: showSuccess ? 'flex' : 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
        <div style={{ background: 'white', borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 420, margin: '0 16px', boxShadow: '0 32px 80px rgba(0,0,0,0.15)', animation: 'fadeUp 0.4s ease' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 12px 32px rgba(16,185,129,0.3)' }}>
            <Icon name="check" style={{ width: 32, height: 32, color: 'white' }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Application Submitted!</h2>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Thank you for applying! We'll review your application within 48 hours and reach out via email.
          </p>
          <Link
            to="/"
            style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 32, background: 'linear-gradient(to bottom,hsl(0,0%,16%),hsl(0,0%,10%))', color: 'white', fontWeight: 500, textDecoration: 'none', fontSize: 14, transition: 'transform 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
