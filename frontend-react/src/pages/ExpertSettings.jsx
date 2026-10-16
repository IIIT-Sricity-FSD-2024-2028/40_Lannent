/**
 * LANNENT — ExpertSettings
 * Converted from front-end/pages/expert-settings.html.
 *
 * The Expert Reviewer's settings in three sections (side navigation):
 * profile, availability, and the audit domains they review.
 */
import { useState } from 'react';
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
import pageCss from './ExpertSettings.css?raw';
import AvatarColorPicker from '../components/AvatarColorPicker';
import ChangePasswordCard from '../components/ChangePasswordCard';
import { CATEGORIES, CATEGORY_INFO } from '../utils/categories';
import { syncSessionFromUser } from '../utils/helpers';

const DOMAINS = CATEGORIES.map(c => ({ id: c, label: c, ...CATEGORY_INFO[c] }));
const SECTIONS = [
  { id: 'profile', icon: 'user', label: 'Profile' },
  { id: 'availability', icon: 'clock', label: 'Availability' },
  { id: 'domains', icon: 'layers', label: 'Audit Domains' },
  { id: 'security', icon: 'lock', label: 'Password & Security' },
];
const SAVE_ICON = { width: 13, height: 13 };

export default function ExpertSettings() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Expert Settings — Lannent');
  const session = Auth.getCurrentUser();
  const [user] = useState(() => (session ? Store.getUserById(session.userId) : null));

  const profile = {
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    avatarColor: user?.avatarColor || 'linear-gradient(135deg, #a855f7, #7c3aed)',
  };
  const nameParts = profile.name.split(' ');
  const availability = (user?.availability && typeof user.availability === 'object')
    ? user.availability
    : { status: 'Actively accepting cases', maxCases: 2, type: 'Both — Audits & Disputes' };

  const [section, setSection] = useState('profile');
  const [fname, setFname] = useState(nameParts[0] || '');
  const [lname, setLname] = useState(nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  const [email, setEmail] = useState(profile.email);
  const [bio, setBio] = useState(profile.bio);
  const [initials, setInitials] = useState(user?.avatar || '?');
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor);
  const [specialization, setSpecialization] = useState(user?.specialization || '');
  const [hourlyRate, setHourlyRate] = useState(user?.hourlyRate || 0);
  const [availStatus, setAvailStatus] = useState(availability.status);
  const [availMax, setAvailMax] = useState(String(availability.maxCases));
  const [availType, setAvailType] = useState(availability.type);
  // The categories this reviewer is offered on — what client matching reads.
  const [selectedDomains, setSelectedDomains] = useState(() => [...(user?.domains || [])]);
  // The intake team vetted these. A reviewer can narrow them, not add to them.
  const approved = user?.approvedDomains?.length ? user.approvedDomains : (user?.domains || []);
  const offered = DOMAINS.filter(d => approved.includes(d.id));
  const { errors, clearError, validateForm, errorStyle } = useFieldErrors();

  if (!user) {
    // Bailing here used to leave a genuinely blank page.
    return (
      <>
        <PageStyle css={pageCss} />
        <EmptyState role="expert" activePath="/expert-settings" pageTitle="Settings"
                    message="Your profile could not be loaded. Check that the API is running, then reload."
                    linkHref="/expert-dashboard" linkLabel="Back to Dashboard" />
      </>
    );
  }

  function toggleDomain(id) {
    setSelectedDomains(list => (list.includes(id) ? list.filter(d => d !== id) : [...list, id]));
  }

  function saveExpertProfile() {
    const f = fname.trim(), l = lname.trim(), em = email.trim(), b = bio.trim();
    const { valid } = validateForm([
      { fieldId: 'es-fname', value: f, checks: [v => Validate.required(v, 'First name')] },
      { fieldId: 'es-lname', value: l, checks: [v => Validate.required(v, 'Last name')] },
      { fieldId: 'es-email', value: em, checks: [Validate.email] },
    ]);
    if (!valid) return;

    const rate = parseFloat(hourlyRate);
    if (!Number.isFinite(rate) || rate < 0) { Validate.toast('Enter an hourly rate of zero or more.', 'error'); return; }
    let saved;
    try {
      saved = Store.updateUser(session.userId, {
        name: f + ' ' + l, email: em, bio: b, avatarColor, specialization: specialization.trim(), hourlyRate: rate,
      });
    } catch (e) {
      Validate.toast(e.message, 'error');
      return;
    }
    syncSessionFromUser(saved);
    setInitials(saved.avatar);
    Validate.toast('Profile saved.', 'success');
  }

  function saveAvailability() {
    try {
      Store.updateUser(session.userId, {
        availability: { status: availStatus, maxCases: parseInt(availMax, 10) || 0, type: availType },
      });
    } catch (e) {
      Validate.toast(e.message, 'error');
      return;
    }
    Validate.toast('Availability saved.', 'success');
  }

  function saveDomains() {
    if (!selectedDomains.length) {
      Validate.toast('Choose at least one domain — clients only see reviewers who cover their category.', 'error');
      return;
    }
    // Saved in the order they appear on screen.
    const ordered = DOMAINS.filter(d => selectedDomains.includes(d.id)).map(d => d.id);
    try {
      Store.updateUser(session.userId, { domains: ordered });
    } catch (e) {
      Validate.toast(e.message, 'error');
      return;
    }
    Validate.toast('Audit domains saved. You will be offered projects in these categories.', 'success');
  }

  const sectionStyle = id => (section === id ? undefined : { display: 'none' });
  const domainCount = DOMAINS.filter(d => selectedDomains.includes(d.id)).length;

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="expert" activePath="/expert-settings" pageTitle="Settings" pageSubtitle="Manage your reviewer profile and preferences">
        <div className="settings-layout">
          {/* Side nav */}
          <nav className="settings-nav">
            {SECTIONS.map(s => (
              <a key={s.id} href="#" className={'settings-nav-item' + (section === s.id ? ' active' : '')}
                 onClick={e => { e.preventDefault(); setSection(s.id); }}>
                <Icon name={s.icon} style={{ width: 15, height: 15 }} />{' ' + s.label}
              </a>
            ))}
          </nav>

          <div>
            {/* PROFILE */}
            <div id="sec-profile" style={sectionStyle('profile')}>
              <div className="settings-card">
                <h3>Expert Profile</h3>
                <div style={{ marginBottom: 18 }}>
                  <AvatarColorPicker initials={initials} value={avatarColor} onChange={setAvatarColor} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    {' '}
                    <input type="text" className="form-input" id="es-fname" value={fname} style={errorStyle('es-fname')}
                           onChange={e => { setFname(e.target.value); clearError('es-fname'); }} />
                    <FieldError id="es-fname" message={errors['es-fname']} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    {' '}
                    <input type="text" className="form-input" id="es-lname" value={lname} style={errorStyle('es-lname')}
                           onChange={e => { setLname(e.target.value); clearError('es-lname'); }} />
                    <FieldError id="es-lname" message={errors['es-lname']} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  {' '}
                  <input type="email" className="form-input" id="es-email" value={email} style={errorStyle('es-email')}
                         onChange={e => { setEmail(e.target.value); clearError('es-email'); }} />
                  <FieldError id="es-email" message={errors['es-email']} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Specialization</label>
                    {' '}
                    <input type="text" className="form-input" id="es-spec" value={specialization} maxLength={120}
                           placeholder="e.g. Full-Stack & Security" onChange={e => setSpecialization(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hourly rate (₹)</label>
                    {' '}
                    <input type="number" min="0" className="form-input" id="es-rate" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  {' '}
                  <textarea className="form-input" rows="3" id="es-bio" maxLength={500} value={bio} onChange={e => setBio(e.target.value)} />
                  <div className="form-hint">Shown to Clients and Gig Workers when assigned to their case.</div>
                </div>
                <button className="btn-save" onClick={saveExpertProfile}>
                  <Icon name="save" style={SAVE_ICON} /> Save Profile
                </button>
              </div>
            </div>

            {/* AVAILABILITY */}
            <div id="sec-availability" style={sectionStyle('availability')}>
              <div className="settings-card">
                <h3>Availability</h3>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  {' '}
                  <select className="form-input" id="es-avail-status" value={availStatus} onChange={e => setAvailStatus(e.target.value)}>
                    <option>Actively accepting cases</option>
                    <option>Available — selective only</option>
                    <option>Unavailable</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Max Concurrent Cases</label>
                  {' '}
                  <select className="form-input" id="es-avail-max" value={availMax} onChange={e => setAvailMax(e.target.value)}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="5">5</option>
                    <option value="10">10</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Preferred Case Type</label>
                  {' '}
                  <select className="form-input" id="es-avail-type" value={availType} onChange={e => setAvailType(e.target.value)}>
                    <option>Both — Audits &amp; Disputes</option>
                    <option>Technical Audits only</option>
                    <option>Conflict Resolution only</option>
                  </select>
                </div>
                <button className="btn-save" onClick={saveAvailability}>
                  <Icon name="save" style={SAVE_ICON} /> Save Availability
                </button>
              </div>
            </div>

            {/* SECURITY */}
            <div id="sec-security" style={sectionStyle('security')}>
              <div className="settings-card">
                <h3>Password &amp; Security</h3>
                <ChangePasswordCard />
              </div>
            </div>

            {/* DOMAINS */}
            <div id="sec-domains" style={sectionStyle('domains')}>
              <div className="settings-card">
                <h3>Audit Domains</h3>
                <p className="domains-summary">
                  <span id="domain-count">{domainCount}</span>{` of the ${offered.length} categories you were approved for — clients are only offered you on projects in these. To review a new category, ask the intake team.`}
                </p>
                <div className="domain-grid">
                  {offered.map(d => (
                    <div key={d.id} className={`domain-card ${selectedDomains.includes(d.id) ? 'on' : 'off'}`} onClick={() => toggleDomain(d.id)} data-id={d.id}>
                      <div className="domain-card-icon"><Icon name={d.icon} /></div>
                      <div>
                        <div className="domain-card-title">{d.label}</div>
                        <div className="domain-card-sub">{d.sub}</div>
                      </div>
                      <div className="domain-check"><div className="domain-check-dot"></div></div>
                    </div>
                  ))}
                </div>
                <button className="btn-save" onClick={saveDomains}>
                  <Icon name="save" style={SAVE_ICON} /> Save Domains
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
