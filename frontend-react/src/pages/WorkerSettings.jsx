/**
 * LANNENT — WorkerSettings (worker Account Settings)
 * Converted from front-end/pages/worker-settings.html.
 *
 * Three tabs: Profile Information (with country-aware phone validation),
 * Professional Details (rate, availability, skills) and Portfolio (projects,
 * added through the "Add Portfolio Project" dialog).
 */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../components/DashboardLayout';
import FieldError from '../components/FieldError';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useFieldErrors from '../hooks/useFieldErrors';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './WorkerSettings.css?raw';
import AvatarColorPicker from '../components/AvatarColorPicker';
import ChangePasswordCard from '../components/ChangePasswordCard';
import { syncSessionFromUser, splitPhone, safeHref } from '../utils/helpers';

const EXPERIENCE_LEVELS = ['Junior', 'Mid-Level', 'Senior', 'Expert'];
const AVAILABILITY = ['Full-time', 'Part-time', 'Contract', 'Not Available'];

/* Side nav tabs definition */
const TABS = [
  { id: 'profile', icon: 'user', label: 'Profile Information' },
  { id: 'professional', icon: 'briefcase', label: 'Professional Details' },
  { id: 'portfolio', icon: 'folder-open', label: 'Portfolio' },
  { id: 'security', icon: 'lock', label: 'Password & Security' },
];

/** The red alert-circle used in the phone error line. */
function ErrorIcon() {
  return (
    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/** Input with a leading icon (".ws-input-wrap"). */
function InputWrap({ icon, children }) {
  return <div className="ws-input-wrap"><Icon name={icon} />{children}</div>;
}

/** The list of portfolio projects, or the empty state. */
function PortfolioGrid({ projects, onAdd, onRemove }) {
  if (projects.length === 0) {
    return (
      <div className="ws-empty-state">
        <Icon name="folder-open" style={{ width: 48, height: 48, display: 'block', margin: '0 auto' }} />
        <div className="ws-empty-text">No portfolio projects yet.<br />Add your first project to showcase your work.</div>
        <button className="ws-btn-primary" onClick={onAdd}>
          <Icon name="plus" style={{ width: 15, height: 15 }} />Add Your First Project
        </button>
      </div>
    );
  }
  return (
    <div className="ws-portfolio-grid">
      {projects.map(p => (
        <div className="ws-portfolio-card" key={p.id}>
          <div className="ws-portfolio-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--secondary)', color: 'var(--muted-foreground)' }}>
            <Icon name="folder-open" style={{ width: 28, height: 28 }} />
          </div>
          <div className="ws-portfolio-body">
            <div className="ws-portfolio-title-row">
              <div className="ws-portfolio-title">{p.title}</div>
              <button className="ws-btn-trash" onClick={() => onRemove(p.id)} title="Remove project">
                <Icon name="trash-2" style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div className="ws-portfolio-desc">{p.description}</div>
            {safeHref(p.url) ? (
              <a href={safeHref(p.url)} target="_blank" rel="noopener noreferrer" className="ws-ext-link">
                <Icon name="external-link" style={{ width: 12, height: 12 }} />View Project
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WorkerSettings() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  const PHONE_COUNTRIES = Validate.getPhoneCountries();
  usePageTitle('Account Settings — Lannent');
  const [session] = useState(() => Auth.getCurrentUser());
  const [user] = useState(() => Store.getUserById(session.userId) || {});

  const [profileData] = useState(() => ({
    fullName: user.name || 'Unknown', email: user.email || '',
    phone: user.phone || '', location: user.location || '',
    bio: user.bio || '',
    avatarColor: user.avatarColor || 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  }));
  const [professionalData] = useState(() => ({
    jobTitle: user.jobTitle || '',
    // Left blank until the worker chooses — pre-filling "Mid-Level" /
    // "Full-time" showed every worker who saved once as exactly that.
    experienceLevel: user.experienceLevel || '',
    hourlyRate: user.hourlyRate || 0,
    languages: user.languages || ['English'],
    availability: typeof user.availability === 'string' ? user.availability : '',
  }));

  const [activeTab, setActiveTab] = useState('profile');
  const [skills, setSkills] = useState(() => [...(user.skills || [])]);
  const [languages, setLanguages] = useState(() => [...((user.languages && user.languages.length) ? user.languages : ['English'])]);
  const [avatarColor, setAvatarColor] = useState(profileData.avatarColor);
  const [initials, setInitials] = useState(user.avatar || '?');
  const [portfolioProjects, setPortfolioProjects] = useState(() => user.portfolioProjects || []);
  const [bioLength, setBioLength] = useState(profileData.bio.length);
  const [countryCode, setCountryCode] = useState(() => splitPhone(user.phone, user.phoneCountryCode).code);
  const [phone, setPhone] = useState(() => splitPhone(user.phone, user.phoneCountryCode).digits);
  const [phoneSaveError, setPhoneSaveError] = useState('');
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const { errors, clearError, validateForm, errorStyle } = useFieldErrors();
  const contentRef = useRef(null);
  const modalRef = useRef(null);

  // ── Real-time phone validation (empty is OK — the phone is optional) ──
  const rule = Validate.getPhoneValidationRule(countryCode);
  const phoneError = phone.trim() ? (Validate.validatePhoneNumber(phone.trim(), countryCode) || '') : '';
  const shownPhoneError = phoneError || phoneSaveError;
  const phoneClass = !phone.trim() ? '' : shownPhoneError ? ' ws-input-error' : ' ws-input-valid';

  /** Reads a field by id (the original read them with getElementById). */
  const field = id => contentRef.current?.querySelector('#' + id);
  const modalField = id => modalRef.current?.querySelector('#' + id);

  // ── Profile ──
  function wsValidateAndSaveProfile() {
    const name = field('wsFullName')?.value.trim() || '';
    const email = field('wsEmail')?.value.trim() || '';
    const phoneVal = phone.trim();
    const location = field('wsLocation')?.value.trim() || '';
    const bio = field('wsBio')?.value.trim() || '';

    const { valid } = validateForm([
      { fieldId: 'wsFullName', value: name, checks: [v => Validate.required(v, 'Full name'), v => Validate.minLength(v, 2, 'Full name')] },
      { fieldId: 'wsEmail', value: email, checks: [Validate.email] },
    ]);
    if (!valid) return;

    // Validate phone with country-specific rule
    if (phoneVal) {
      const phoneErr = Validate.validatePhoneNumber(phoneVal, countryCode);
      if (phoneErr) { setPhoneSaveError(phoneErr); return; }
    }

    // Combine country code + phone for storage
    const fullPhone = phoneVal ? (countryCode + phoneVal) : '';

    let saved;
    try {
      saved = Store.updateUser(session.userId, { name, email, phone: fullPhone, phoneCountryCode: phoneVal ? countryCode : '', location, bio, avatarColor });
    } catch (e) {
      Validate.toast(e.message, 'error');
      return;
    }
    syncSessionFromUser(saved);
    setInitials(saved.avatar);
    Validate.toast('Profile saved.', 'success');
  }

  // ── Professional ──
  function wsSaveProfessional() {
    const jobTitle = field('wsJobTitle')?.value.trim() || '';
    const experienceLevel = field('wsExpLevel')?.value || '';
    const hourlyRate = field('wsHourlyRate')?.value || 0;
    const availability = field('wsAvailability')?.value || '';

    const rate = parseFloat(hourlyRate);
    if (!Number.isFinite(rate) || rate < 0) { Validate.toast('Enter an hourly rate of zero or more.', 'error'); return; }
    try {
      Store.updateUser(session.userId, { jobTitle, experienceLevel, hourlyRate: rate, availability, skills, languages });
    } catch (e) {
      Validate.toast(e.message, 'error');
      return;
    }
    Validate.toast('Professional details saved.', 'success');
  }

  function addLanguage() {
    const input = field('wsNewLang');
    const l = input?.value.trim();
    if (l && !languages.includes(l)) { setLanguages(list => [...list, l]); input.value = ''; }
  }

  function wsAddSkill() {
    const input = field('wsNewSkill');
    const s = input?.value.trim();
    if (s && !skills.includes(s)) {
      setSkills(list => [...list, s]);
      input.value = '';
    }
  }

  function wsRemoveSkill(skill) {
    setSkills(list => list.filter(s => s !== skill));
  }

  // ── Portfolio ──
  function savePortfolio(next) {
    try {
      Store.updateUser(session.userId, { portfolioProjects: next });
    } catch (e) {
      Validate.toast(e.message, 'error');
      return false;
    }
    setPortfolioProjects(next);
    return true;
  }

  function wsRemovePortfolioProject(id) {
    savePortfolio(portfolioProjects.filter(p => p.id !== id));
  }

  function wsAddPortfolioProject() {
    const titleEl = modalField('wsPortTitle');
    const descEl = modalField('wsPortDesc');
    const urlEl = modalField('wsPortUrl');
    const title = titleEl ? titleEl.value.trim() : '';
    const desc = descEl ? descEl.value.trim() : '';
    const url = urlEl ? urlEl.value.trim() : '';

    if (!title) {
      if (titleEl) titleEl.style.borderColor = '#ef4444';
      return;
    }
    if (url && !safeHref(url)) {
      Validate.toast('The project URL must start with http:// or https://', 'error');
      return;
    }

    // A stock photo picked at random used to stand in here "so new cards look
    // real" — it made every portfolio entry claim an image of work nobody did.
    // Entries carry no thumbnail until there is a real one to carry.
    const ok = savePortfolio([...portfolioProjects, {
      id: Date.now().toString(),
      title,
      description: desc || '',
      ...(url ? { url } : {}),
    }]);
    if (!ok) return;
    setPortfolioOpen(false);
    Validate.toast('Project added to your portfolio.', 'success');

    // Reset form
    if (titleEl) { titleEl.value = ''; titleEl.style.borderColor = ''; }
    if (descEl) descEl.value = '';
    if (urlEl) urlEl.value = '';
  }

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

  const tabClass = id => (activeTab === id ? ' active' : '');

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="worker" activePath="/worker-settings" pageTitle="Account Settings" pageSubtitle="Manage your profile, portfolio, payouts, and notifications.">
        <div className="ws-layout" ref={contentRef}>
          <div className="ws-sidenav">
            <div className="ws-nav-card">
              <nav>
                {TABS.map(t => (
                  <button key={t.id} className={'ws-nav-btn' + tabClass(t.id)} onClick={() => setActiveTab(t.id)}>
                    <Icon name={t.icon} style={{ width: 17, height: 17, flexShrink: 0 }} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
          <div className="ws-main">
            <div className="ws-content">

              {/* ── Tab: Profile ── */}
              <div id="ws-tab-profile" className={'ws-tab' + tabClass('profile')}>
                <div className="ws-section-title">Profile Information</div>
                <div className="ws-section-sub">Update your personal information and profile photo</div>

                <AvatarColorPicker initials={initials} value={avatarColor} onChange={setAvatarColor} />
                <div className="ws-divider"></div>

                <div className="ws-grid-2" style={{ marginBottom: 16 }}>
                  <div>
                    <label className="ws-label">Full Name</label>
                    <input type="text" className="ws-input" id="wsFullName" defaultValue={profileData.fullName}
                           style={errorStyle('wsFullName')} onInput={() => clearError('wsFullName')} />
                    <FieldError id="wsFullName" message={errors.wsFullName} />
                  </div>

                  <div>
                    <label className="ws-label">Email Address</label>
                    <InputWrap icon="mail">
                      <input type="email" className="ws-input" id="wsEmail" defaultValue={profileData.email}
                             style={errorStyle('wsEmail')} onInput={() => clearError('wsEmail')} />
                      <FieldError id="wsEmail" message={errors.wsEmail} />
                    </InputWrap>
                  </div>

                  <div style={{ gridColumn: '1/-1' }}>
                    <label className="ws-label">Phone Number</label>
                    <div className="ws-phone-group">
                      <select className="ws-phone-country" id="wsCountryCode" value={countryCode} onChange={e => { setPhoneSaveError(''); setCountryCode(e.target.value); }}>
                        {PHONE_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag + ' ' + c.name + ' (' + c.code + ')'}</option>)}
                      </select>
                      <div className="ws-phone-number-wrap">
                        <Icon name="phone" />
                        <input type="tel" className={'ws-input' + phoneClass} id="wsPhone" value={phone}
                               maxLength={rule.length} placeholder={rule.placeholder}
                               onChange={onPhoneChange} onPaste={onPhonePaste}
                               onKeyPress={e => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }} />
                      </div>
                    </div>
                    <div className="ws-phone-hint" id="wsPhoneHint"><Icon name="info" />{` Enter ${rule.length}-digit number`}</div>
                    <div id="wsPhoneError" className="ws-phone-error" style={{ display: shownPhoneError ? 'flex' : 'none' }}>
                      {shownPhoneError ? <><ErrorIcon />{shownPhoneError}</> : null}
                    </div>
                  </div>

                  <div>
                    <label className="ws-label">Location</label>
                    <InputWrap icon="map-pin">
                      <input type="text" className="ws-input" id="wsLocation" defaultValue={profileData.location} />
                    </InputWrap>
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label className="ws-label">Bio</label>
                  <textarea className="ws-textarea" id="wsBio" rows="4" maxLength={500} placeholder="Tell clients about yourself..." defaultValue={profileData.bio}
                            onInput={e => setBioLength(e.target.value.length)}></textarea>
                  <div className="ws-char-count" id="wsBioCount">{bioLength + '/500 characters'}</div>
                </div>

                <div className="ws-save-row">
                  <button className="ws-btn-primary" id="wsSaveBtn" disabled={!!phoneError} onClick={wsValidateAndSaveProfile}>
                    <Icon name="save" style={{ width: 15, height: 15 }} />Save Changes
                  </button>
                </div>
              </div>

              {/* ── Tab: Professional ── */}
              <div id="ws-tab-professional" className={'ws-tab' + tabClass('professional')}>
                <div className="ws-section-title">Professional Details</div>
                <div className="ws-section-sub">Manage your professional profile and expertise</div>

                <div className="ws-grid-2" style={{ marginBottom: 16 }}>
                  <div>
                    <label className="ws-label">Job Title</label>
                    <input type="text" className="ws-input" id="wsJobTitle" defaultValue={professionalData.jobTitle} />
                  </div>
                  <div>
                    <label className="ws-label">Experience Level</label>
                    <select className="ws-select" id="wsExpLevel" defaultValue={EXPERIENCE_LEVELS.includes(professionalData.experienceLevel) ? professionalData.experienceLevel : ''}>
                      <option value="">Not set</option>
                      {EXPERIENCE_LEVELS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="ws-label">Hourly Rate (₹)</label>
                    <InputWrap icon="indian-rupee">
                      <input type="number" min="0" className="ws-input" id="wsHourlyRate" defaultValue={professionalData.hourlyRate} />
                    </InputWrap>
                  </div>
                  <div>
                    <label className="ws-label">Availability</label>
                    <select className="ws-select" id="wsAvailability" defaultValue={AVAILABILITY.includes(professionalData.availability) ? professionalData.availability : ''}>
                      <option value="">Not set</option>
                      {AVAILABILITY.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="ws-label">Skills</label>
                  <div className="ws-chips" id="wsSkillsWrap">
                    {skills.map(skill => (
                      <div className="ws-chip-blue" key={skill}>
                        <span>{skill}</span>
                        <button onClick={() => wsRemoveSkill(skill)} title="Remove"><Icon name="x" style={{ width: 11, height: 11 }} /></button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="text" className="ws-input" id="wsNewSkill" style={{ width: 180, height: 36 }} placeholder="Add skill..." />
                    <button className="ws-btn-sm" onClick={wsAddSkill}><Icon name="plus" style={{ width: 13, height: 13 }} />Add</button>
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label className="ws-label">Languages</label>
                  <div className="ws-chips">
                    {languages.map(l => (
                      <div className="ws-chip-purple" key={l}>
                        <span>{l}</span>
                        <button onClick={() => setLanguages(list => list.filter(x => x !== l))} title="Remove"><Icon name="x" style={{ width: 11, height: 11 }} /></button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="text" className="ws-input" id="wsNewLang" style={{ width: 180, height: 36 }} placeholder="Add language..." />
                    <button className="ws-btn-sm" onClick={addLanguage}><Icon name="plus" style={{ width: 13, height: 13 }} />Add</button>
                  </div>
                </div>

                <div className="ws-save-row">
                  <button className="ws-btn-primary" onClick={wsSaveProfessional}>
                    <Icon name="save" style={{ width: 15, height: 15 }} />Save Changes
                  </button>
                </div>
              </div>

              {/* ── Tab: Security ── */}
              <div id="ws-tab-security" className={'ws-tab' + tabClass('security')}>
                <div className="ws-section-title">Password &amp; Security</div>
                <div className="ws-section-sub">Change the password you sign in with</div>
                <ChangePasswordCard />
              </div>

              {/* ── Tab: Portfolio ── */}
              <div id="ws-tab-portfolio" className={'ws-tab' + tabClass('portfolio')}>
                <div className="ws-section-header">
                  <div>
                    <div className="ws-section-title" style={{ marginBottom: 4 }}>Portfolio</div>
                    <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Showcase your best work to potential clients</div>
                  </div>
                  <button className="ws-btn-primary" onClick={() => setPortfolioOpen(true)}>
                    <Icon name="plus" style={{ width: 15, height: 15 }} />Add Project
                  </button>
                </div>
                <div id="wsPortfolioGrid">
                  <PortfolioGrid projects={portfolioProjects} onAdd={() => setPortfolioOpen(true)} onRemove={wsRemovePortfolioProject} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Portfolio Modal — injected into <body> after the dashboard, as before */}
      {createPortal(
        <div ref={modalRef}>
          <div className={'ws-modal-backdrop' + (portfolioOpen ? ' open' : '')} id="wsPortfolioModal"
               onClick={e => { if (e.target === e.currentTarget) setPortfolioOpen(false); }}>
            <div className="ws-modal ws-modal-md">
              <div className="ws-modal-title">Add Portfolio Project</div>
              <div className="ws-modal-sub">Showcase your work to potential clients</div>
              <div className="ws-modal-fields">
                <div>
                  <label className="ws-label">Project Title <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" className="ws-input" id="wsPortTitle" placeholder="E.g., E-Commerce Platform" />
                </div>
                <div>
                  <label className="ws-label">Description</label>
                  <textarea className="ws-textarea" id="wsPortDesc" rows="3" placeholder="Describe what you built and the technologies used"></textarea>
                </div>
                <div>
                  <label className="ws-label">Project URL</label>
                  <input type="url" className="ws-input" id="wsPortUrl" placeholder="https://example.com" />
                </div>
              </div>
              <div className="ws-modal-actions">
                <button className="ws-btn-secondary" onClick={() => setPortfolioOpen(false)}>Cancel</button>
                <button className="ws-btn-primary" onClick={wsAddPortfolioProject}>
                  <Icon name="plus" style={{ width: 15, height: 15 }} />Add Project
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
