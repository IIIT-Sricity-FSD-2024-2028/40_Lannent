/**
 * LANNENT — ProfileSettings (client Account Settings)
 * Converted from front-end/pages/profile-settings.html.
 *
 * Two tabs: Profile Information (name, email, country-aware phone, location,
 * bio) and Company Details. Both save straight to the Store.
 */
import { useRef, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import FieldError from '../components/FieldError';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useFieldErrors from '../hooks/useFieldErrors';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ProfileSettings.css?raw';
import AvatarColorPicker from '../components/AvatarColorPicker';
import ChangePasswordCard from '../components/ChangePasswordCard';
import { syncSessionFromUser, splitPhone } from '../utils/helpers';

const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce', 'Other'];
const COMPANY_SIZES = ['1–10 employees', '11–50 employees', '50–200 employees', '200–500 employees', '500+ employees'];

/** The red alert-circle used in the phone error line. */
function ErrorIcon() {
  return (
    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/** Text input with a leading icon (".field-wrap"). */
function IconField({ icon, children }) {
  return (
    <div className="field-wrap">
      <Icon name={icon} className="field-icon" />
      {children}
    </div>
  );
}



export default function ProfileSettings() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  const PHONE_COUNTRIES = Validate.getPhoneCountries();
  usePageTitle('Account Settings — Lannent');
  const [session] = useState(() => Auth.getCurrentUser());
  const [user] = useState(() => (session ? Store.getUserById(session.userId) : null));
  const role = session?.role || 'client';

  const profile = user ? {
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    location: user.location || '',
    bio: user.bio || '',
    avatarColor: user.avatarColor || 'linear-gradient(135deg, #6366f1, #4f46e5)',
  } : null;
  const company = (user && user.companyDetails) || {
    name: user?.company || '', industry: 'Technology', website: '', size: COMPANY_SIZES[0], location: user?.location || '',
  };

  const [activeTab, setActiveTab] = useState('profile');
  const [initials, setInitials] = useState(() => (user?.avatar || '?'));
  const [avatarColor, setAvatarColor] = useState(() => profile?.avatarColor);
  const [bioLength, setBioLength] = useState(() => (profile ? profile.bio.length : 0));
  const [countryCode, setCountryCode] = useState(() => splitPhone(user?.phone, user?.phoneCountryCode).code);
  const [phone, setPhone] = useState(() => splitPhone(user?.phone, user?.phoneCountryCode).digits);
  const [saving, setSaving] = useState(false);
  const [phoneSaveError, setPhoneSaveError] = useState('');
  const { errors, clearError, validateForm, errorStyle } = useFieldErrors();
  const formRef = useRef(null);

  if (!user) {
    // Bailing here used to leave a genuinely blank page.
    return (
      <EmptyState role="client" activePath="/profile-settings" pageTitle="Settings"
                  message="Your profile could not be loaded. Check that the API is running, then reload."
                  linkHref="/client-dashboard" linkLabel="Back to Dashboard" />
    );
  }

  // ── Real-time phone validation (empty is OK — the phone is optional) ──
  const rule = Validate.getPhoneValidationRule(countryCode);
  const phoneError = phone.trim() ? (Validate.validatePhoneNumber(phone.trim(), countryCode) || '') : '';
  const shownPhoneError = phoneError || phoneSaveError;
  const phoneClass = !phone.trim() ? '' : shownPhoneError ? ' input-error' : ' input-valid';

  /** Reads a field of the form by id (the original read them with getElementById). */
  const field = id => formRef.current?.querySelector('#' + id);

  // Block non-digit characters in real time
  function onPhoneChange(e) {
    setPhoneSaveError('');
    setPhone(e.target.value.replace(/\D/g, ''));
  }

  // Prevent paste of non-digits
  function onPhonePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    setPhoneSaveError('');
    setPhone(text.replace(/\D/g, '').substring(0, rule.length || 15));
  }

  // Block key presses that aren't digits or control keys
  function onPhoneKeyPress(e) {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  }

  function saveProfileChanges() {
    const name = field('p-fullname')?.value.trim() || '';
    const email = field('p-email')?.value.trim() || '';
    const phoneVal = phone.trim();
    const location = field('p-location')?.value.trim() || '';
    const bio = field('p-bio')?.value.trim() || '';

    const { valid } = validateForm([
      { fieldId: 'p-fullname', value: name, checks: [v => Validate.required(v, 'Full name'), v => Validate.minLength(v, 2, 'Full name')] },
      { fieldId: 'p-email', value: email, checks: [Validate.email] },
    ]);
    if (!valid) return;

    // Validate phone with country-specific rule
    if (phoneVal) {
      const phoneErr = Validate.validatePhoneNumber(phoneVal, countryCode);
      if (phoneErr) { setPhoneSaveError(phoneErr); return; }
    }

    // Combine country code + phone for storage
    const fullPhone = phoneVal ? (countryCode + phoneVal) : '';

    setSaving(true);
    let saved;
    try {
      saved = Store.updateUser(user.id, { name, email, phone: fullPhone, phoneCountryCode: phoneVal ? countryCode : '', location, bio, avatarColor });
    } catch (e) {
      setSaving(false);
      Validate.toast(e.message, 'error');
      return;
    }
    setSaving(false);
    syncSessionFromUser(saved);
    setInitials(saved.avatar);
    Validate.toast('Profile saved.', 'success');
  }

  function saveCompanyChanges() {
    const name = field('c-name')?.value.trim() || '';
    const industry = field('c-industry')?.value || '';
    const website = field('c-website')?.value.trim() || '';
    const size = field('c-size')?.value || '';
    const location = field('c-location')?.value.trim() || '';

    if (website && !/^https?:\/\/\S+\.\S+/i.test(website)) {
      Validate.toast('Enter the website as a full address, e.g. https://example.com', 'error');
      return;
    }
    try {
      Store.updateUser(user.id, { companyDetails: { name, industry, website, size, location } });
    } catch (e) {
      Validate.toast(e.message, 'error');
      return;
    }
    Validate.toast('Company details saved.', 'success');
  }

  const tabClass = tab => (activeTab === tab ? ' active' : '');

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={role} activePath="/profile-settings" pageTitle="Account Settings" pageSubtitle="Manage your account details and company information.">
        <div className="settings-wrap" ref={formRef}>

          {/* ══ Left Tab Nav ══ */}
          <nav className="settings-sidenav" id="settingsSidenav">
            <button className={'snav-btn' + tabClass('profile')} data-tab="profile" onClick={() => setActiveTab('profile')}>
              <Icon name="user" /> Profile Information
            </button>
            <button className={'snav-btn' + tabClass('company')} data-tab="company" onClick={() => setActiveTab('company')}>
              <Icon name="building-2" /> Company Details
            </button>
            <button className={'snav-btn' + tabClass('security')} data-tab="security" onClick={() => setActiveTab('security')}>
              <Icon name="lock" /> Password &amp; Security
            </button>
          </nav>

          {/* ══ Right Content ══ */}
          <div className="settings-panel">

            {/* ── Profile Tab ── */}
            <div className={'tab-content' + tabClass('profile')} id="tab-profile">
              <div className="settings-title">Profile Information</div>
              <div className="settings-sub">Update your personal information and profile photo</div>

              {/* Avatar */}
              <AvatarColorPicker initials={initials} value={avatarColor} onChange={setAvatarColor} />
              <hr className="section-divider" />

              {/* Fields */}
              <div className="form-grid-2">
                <div className="field-group">
                  <label>Full Name</label>
                  <input type="text" className="field-input" defaultValue={profile.name} id="p-fullname"
                         style={errorStyle('p-fullname')} onInput={() => clearError('p-fullname')} />
                  <FieldError id="p-fullname" message={errors['p-fullname']} />
                </div>
                <div className="field-group">
                  <label>Email Address</label>
                  <IconField icon="mail">
                    <input type="email" className="field-input with-icon" defaultValue={profile.email} id="p-email"
                           style={errorStyle('p-email')} onInput={() => clearError('p-email')} />
                    <FieldError id="p-email" message={errors['p-email']} />
                  </IconField>
                </div>
                <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Phone Number</label>
                  <div className="phone-input-group">
                    <select className="phone-country-select" id="p-country-code" value={countryCode} onChange={e => { setPhoneSaveError(''); setCountryCode(e.target.value); }}>
                      {PHONE_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag + ' ' + c.name + ' (' + c.code + ')'}</option>)}
                    </select>
                    <div className="phone-number-wrap">
                      <Icon name="phone" className="field-icon" />
                      <input type="tel" className={'field-input with-icon' + phoneClass} value={phone} id="p-phone"
                             maxLength={rule.length} placeholder={rule.placeholder}
                             onChange={onPhoneChange} onPaste={onPhonePaste} onKeyPress={onPhoneKeyPress} />
                    </div>
                  </div>
                  <div className="phone-hint" id="p-phone-hint">
                    <Icon name="info" />{` Enter ${rule.length}-digit number`}
                  </div>
                  <div id="p-phone-error" className="phone-error-msg" style={{ display: shownPhoneError ? 'flex' : 'none' }}>
                    {shownPhoneError ? <><ErrorIcon />{shownPhoneError}</> : null}
                  </div>
                </div>
                <div className="field-group">
                  <label>Location</label>
                  <IconField icon="map-pin">
                    <input type="text" className="field-input with-icon" defaultValue={profile.location} id="p-location" />
                  </IconField>
                </div>
              </div>
              <div className="field-group" style={{ marginBottom: 4 }}>
                <label>Bio</label>
                <textarea className="field-input" rows="4" id="p-bio" maxLength={500} defaultValue={profile.bio} onInput={e => setBioLength(e.target.value.length)}></textarea>
              </div>
              <div className="char-count" id="bioCharCount">{`${bioLength}/500 characters`}</div>

              <div className="save-row">
                <button className="btn-save" id="p-save-btn" disabled={!!phoneError || saving} onClick={saveProfileChanges}>
                  <Icon name="save" /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* ── Company Tab ── */}
            <div className={'tab-content' + tabClass('company')} id="tab-company">
              <div className="settings-title">Company Details</div>
              <div className="settings-sub">Update your company information and branding</div>


              <div className="form-grid-2">
                <div className="field-group">
                  <label>Company Name</label>
                  <input type="text" className="field-input" defaultValue={company.name} id="c-name" />
                </div>
                <div className="field-group">
                  <label>Industry</label>
                  <select className="field-input" id="c-industry" defaultValue={INDUSTRIES.includes(company.industry) ? company.industry : INDUSTRIES[0]}>
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label>Company Website</label>
                  <IconField icon="globe">
                    <input type="url" className="field-input with-icon" defaultValue={company.website} id="c-website" />
                  </IconField>
                </div>
                <div className="field-group">
                  <label>Company Size</label>
                  {/* The default '50-200 employees' (hyphen) matches no option, so the first is shown — as before */}
                  <select className="field-input" id="c-size" defaultValue={COMPANY_SIZES.includes(company.size) ? company.size : COMPANY_SIZES[0]}>
                    {COMPANY_SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field-group" style={{ gridColumn: '1/-1' }}>
                  <label>Location</label>
                  <IconField icon="map-pin">
                    <input type="text" className="field-input with-icon" defaultValue={company.location} id="c-location" />
                  </IconField>
                </div>
              </div>

              <div className="save-row">
                <button className="btn-save" onClick={saveCompanyChanges}>
                  <Icon name="save" /> Save Changes
                </button>
              </div>
            </div>

            {/* ── Security Tab ── */}
            <div className={'tab-content' + tabClass('security')} id="tab-security">
              <div className="settings-title">Password &amp; Security</div>
              <div className="settings-sub">Change the password you sign in with</div>
              <ChangePasswordCard />
            </div>

          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
