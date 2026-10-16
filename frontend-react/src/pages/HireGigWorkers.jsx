/**
 * LANNENT — HireGigWorkers
 * Converted from front-end/pages/hire-gig-workers.html.
 *
 * Browse available freelancers with filters (experience, hourly rate,
 * skills, availability) and a search box. Open a full profile, or
 * invite a worker to one of your open projects.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './HireGigWorkers.css?raw';

const SKILL_FILTERS = ['React', 'TypeScript', 'Node.js', 'Python', 'Django', 'AWS', 'Docker', 'Kubernetes', 'Figma', 'UI Design', 'PostgreSQL', 'MongoDB', 'React Native', 'Swift', 'Machine Learning'];
const AVAILABILITY_FILTERS = ['Full-time', 'Part-time', 'Contract', 'Not Available'];
const CHECKBOX_LABEL_STYLE = { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 8px', borderRadius: 8 };
const SECTION_TITLE_STYLE = { fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 };
const sectionIconStyle = bg => ({ width: 20, height: 20, background: bg, borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11 });

/** Active workers, shaped for the cards and the profile. */
function loadWorkersFromStore(Store) {
  return Store.getUsers()
    .filter(u => u.role === 'worker' && u.status !== 'suspended')
    .map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar || u.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      avatarColor: u.avatarColor || 'linear-gradient(135deg,#6366f1,#4f46e5)',
      // Real profile figures only — a missing one shows as missing.
      specialization: u.jobTitle || (u.skills && u.skills[0]) || 'Freelancer',
      // Project counts are worked out by the server from real projects;
      // nobody can type them in.
      skills: u.skills || [],
      projectsCompleted: u.completedProjects || 0,
      activeProjects: u.activeProjects || 0,
      hourlyRate: u.hourlyRate || 0,
      location: u.location || '',
      availability: typeof u.availability === 'string' && u.availability ? u.availability : 'Not set',
      experience: u.experienceLevel || 'Not set',
      bio: u.bio || '',
      portfolio: u.portfolioProjects || [],
    }));
}

/** A small stat box on a worker card. */
function CardStat({ value, label, color }) {
  return (
    <div style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: 'var(--input-bg)' }}>
      <div style={{ fontWeight: 700, fontSize: 14, ...(color ? { color } : {}) }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{label}</div>
    </div>
  );
}

/** One freelancer card. */
function WorkerCard({ w, onProfile, onInvite }) {
  const free = ['Full-time', 'Part-time', 'Contract'].includes(w.availability);
  const availBg = free ? '#22c55e' : (w.availability === 'Not set' ? '#94a3b8' : '#ef4444');
  const badgeBg = free ? '#ecfdf5' : '#f1f5f9';
  const badgeColor = free ? '#059669' : '#64748b';
  return (
    <div className="worker-card" onClick={() => onProfile(w.id)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: w.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700 }}>{w.avatar}</div>
            <div className="avail-dot" style={{ position: 'absolute', bottom: 0, right: 0, background: availBg }}></div>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{w.specialization}</div>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 9999, background: badgeBg, color: badgeColor }}>{w.availability}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {w.skills.map(s => <span key={s} className="skill-tag" style={{ fontSize: 11, padding: '2px 8px' }}>{s}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        <CardStat value={w.projectsCompleted} label="Completed" color="#10b981" />
        <CardStat value={w.activeProjects} label="In progress" color="#f59e0b" />
        <CardStat value={w.hourlyRate ? `₹${w.hourlyRate}/h` : '—'} label="Stated rate" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Icon name="map-pin" style={{ width: 14, height: 14, color: 'var(--muted-foreground)' }} />
        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{w.location || 'Location not set'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={e => { e.stopPropagation(); onProfile(w.id); }} className="btn-outline">View Profile</button>
        <button onClick={e => { e.stopPropagation(); onInvite(w.id); }} className="btn-primary">Invite</button>
      </div>
    </div>
  );
}

/** A coloured stat box in the profile panel. */
function ProfileStat({ value, label, bg, border, valueColor, labelColor, valueSize = 17 }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 6px', borderRadius: 12, background: bg, border: `1px solid ${border}` }}>
      <div style={{ fontWeight: 700, color: valueColor, fontSize: valueSize }}>{value}</div>
      <div style={{ fontSize: 10, color: labelColor, marginTop: 3 }}>{label}</div>
    </div>
  );
}

/** The contents of the worker profile panel. */
function WorkerProfile({ worker, onClose, onInvite }) {
  const free = ['Full-time', 'Part-time', 'Contract'].includes(worker.availability);
  const availBg = free ? '#ecfdf5' : '#f1f5f9';
  const availColor = free ? '#059669' : '#64748b';
  const expBg = ['Senior', 'Expert'].includes(worker.experience) ? '#eef2ff' : '#faf5ff';
  const expColor = ['Senior', 'Expert'].includes(worker.experience) ? '#4f46e5' : '#7c3aed';

  return (
    <>
      {/* ── Header ── */}
      <div style={{ padding: '24px 24px 20px', background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', borderBottom: '1px solid #c7d2fe' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: worker.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>{worker.avatar}</div>
              <div style={{ position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: '50%', background: availColor, border: '2px solid white' }}></div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#111827' }}>{worker.name}</div>
              <div style={{ fontSize: 14, color: '#4f46e5', fontWeight: 500, marginTop: 2 }}>{worker.specialization}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{'📍 ' + (worker.location || 'Location not set')}</span>
                {worker.availability !== 'Not set' && <span title="Availability the worker set on their profile" style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 9999, background: availBg, color: availColor }}>{worker.availability}</span>}
                {worker.experience !== 'Not set' && <span title="Experience level the worker set on their profile" style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 9999, background: expBg, color: expColor }}>{worker.experience}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 22, lineHeight: 1, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>&times;</button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ padding: '22px 24px', maxHeight: '62vh', overflowY: 'auto' }}>
        {/* About / Bio */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...SECTION_TITLE_STYLE, marginBottom: 8 }}>
            <span style={sectionIconStyle('#6366f1')}>👤</span>
            About
          </div>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, borderLeft: '3px solid #6366f1' }}>{worker.bio || 'This worker has not written a bio yet.'}</p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          <ProfileStat value={worker.projectsCompleted} label="Completed on Lannent" bg="#ecfdf5" border="#a7f3d0" valueColor="#059669" labelColor="#065f46" />
          <ProfileStat value={worker.activeProjects} label="In progress now" bg="#eef2ff" border="#c7d2fe" valueColor="#4f46e5" labelColor="#3730a3" />
          <ProfileStat value={worker.hourlyRate ? <>{`₹${worker.hourlyRate}`}<span style={{ fontSize: 10 }}>/hr</span></> : '—'} label="Stated hourly rate" bg="#faf5ff" border="#ddd6fe" valueColor="#7c3aed" labelColor="#5b21b6" valueSize={15} />
        </div>

        {/* Skills */}
        <div style={{ marginBottom: 20 }}>
          <div style={SECTION_TITLE_STYLE}>
            <span style={sectionIconStyle('#0ea5e9')}>✓</span>
            Skills
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {worker.skills.map(s => <span key={s} style={{ padding: '5px 12px', borderRadius: 20, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#0369a1', fontSize: 12, fontWeight: 500 }}>{s}</span>)}
          </div>
        </div>

        {/* Portfolio */}
        {worker.portfolio && worker.portfolio.length ? (
          <div style={{ marginBottom: 22 }}>
            <div style={SECTION_TITLE_STYLE}>
              <span style={sectionIconStyle('#6366f1')}>📄</span>
              Portfolio
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {worker.portfolio.map((port, i) => (
                <div key={i} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#111827', marginBottom: 4 }}>{port.title}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{port.description}</div>
                </div>
              ))}
            </div>
          </div>
        ) : ''}


        {/* Work History */}
        {worker.workHistory && worker.workHistory.length ? (
          <div style={{ marginBottom: 22 }}>
            <div style={SECTION_TITLE_STYLE}>
              <span style={sectionIconStyle('#10b981')}>📋</span>
              Work History
            </div>
            {worker.workHistory.map((wh, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: '1px solid #a7f3d0', background: '#f0fdf4', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#111827' }}>{wh.project}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{wh.role}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#166534', whiteSpace: 'nowrap' }}>{wh.duration}</span>
              </div>
            ))}
          </div>
        ) : ''}

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
          <button onClick={() => { onInvite(worker.id); onClose(); }} className="btn-primary" style={{ flex: 1, padding: 12, borderRadius: 12, fontWeight: 600 }}>Invite to Project</button>
          <button onClick={onClose} className="btn-outline" style={{ flex: 1, padding: 12, borderRadius: 12 }}>Close</button>
        </div>
      </div>
    </>
  );
}

// The rate slider's top end means "any rate", so nobody is hidden by default.
const MAX_RATE = 500;
const DEFAULT_FILTERS = { search: '', experience: '', maxRate: String(MAX_RATE), skills: [], availability: [] };

export default function HireGigWorkers() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Hire Gig Workers — Lannent');
  const [workers] = useState(() => loadWorkersFromStore(Store));
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [profileWorker, setProfileWorker] = useState(null);   // worker shown in the profile panel
  const [profileOpen, setProfileOpen] = useState(null);        // null until first opened
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLabel, setInviteLabel] = useState('Invite worker to one of your active projects');
  const [inviteMessage, setInviteMessage] = useState('');

  // Open projects that can still take an invitation
  const session = Auth.getCurrentUser();
  const [openTasks] = useState(() => (session ? Store.getTasksByClient(session.userId).filter(t => t.status === 'open') : null));
  const [projectId, setProjectId] = useState(() => (openTasks && openTasks.length ? openTasks[0].id : ''));

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const toggleIn = (key, value) => setFilters(f => ({ ...f, [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value] }));

  const q = filters.search.toLowerCase();
  const maxRate = Number(filters.maxRate);
  const filtered = workers.filter(w => {
    const matchSearch = !q || w.name.toLowerCase().indexOf(q) !== -1
      || w.specialization.toLowerCase().indexOf(q) !== -1
      || w.skills.some(s => s.toLowerCase().indexOf(q) !== -1);
    const matchExp = !filters.experience || w.experience === filters.experience;
    const matchRate = maxRate >= MAX_RATE || w.hourlyRate <= maxRate;
    const matchSkills = filters.skills.length === 0 || filters.skills.some(sk => w.skills.indexOf(sk) !== -1);
    const matchAvail = filters.availability.length === 0 || filters.availability.indexOf(w.availability) !== -1;
    return matchSearch && matchExp && matchRate && matchSkills && matchAvail;
  });

  function openProfile(id) {
    const worker = workers.find(w => w.id === id);
    if (!worker) return;
    setSelectedWorker(worker);
    setProfileWorker(worker);
    setProfileOpen(true);
  }

  function openInviteModal(id) {
    const worker = workers.find(w => w.id === id);
    if (!worker) return;
    setSelectedWorker(worker);
    setInviteLabel('Invite ' + worker.name + ' to one of your active projects');
    setInviteOpen(true);
  }

  function sendInvite() {
    // Validate: a project must be selected
    if (!projectId) {
      Validate.toast('Please select a project to invite the worker to.', 'error');
      return;
    }
    // Guard: only open tasks accept invitations
    const task = Store.getTaskById(projectId);
    if (task && task.status !== 'open') {
      Validate.toast('This project is no longer open — cannot send invitations.', 'error');
      return;
    }
    // The invitation is at the project's posted budget; the worker accepts or declines it.
    if (selectedWorker) {
      try {
        Store.sendInvitation({ taskId: projectId, workerId: selectedWorker.id, message: inviteMessage });
      } catch (e) {
        Validate.toast((e.message), 'error');
        return;
      }
    }
    setInviteOpen(false);
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#10b981;color:white;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:500;z-index:300;box-shadow:0 8px 24px rgba(16,185,129,0.3);';
    toast.textContent = 'Invitation sent to ' + (selectedWorker ? selectedWorker.name : 'worker') + '!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="client" activePath="/hire-gig-workers" pageTitle="Hire Gig Workers" pageSubtitle="Find skilled freelancers and invite them to collaborate on your project">
        <div className="hire-layout">
          <div className="filter-sidebar">
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Filters</span>
                <button style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setFilters(DEFAULT_FILTERS)}>Reset</button>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>Experience</label>
                <select id="filterExp" className="form-input" value={filters.experience} onChange={e => setFilter('experience', e.target.value)}>
                  <option value="">All Levels</option>
                  <option value="Junior">Junior</option>
                  <option value="Mid-Level">Mid-Level</option>
                  <option value="Senior">Senior</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>Hourly Rate (max)</label>
                <input id="rateRange" type="range" min="0" max={MAX_RATE} step="5" value={filters.maxRate} onChange={e => setFilter('maxRate', e.target.value)} style={{ width: '100%' }} />
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>
                  {Number(filters.maxRate) >= MAX_RATE ? 'Any rate' : <>Up to ₹<span id="rateValue">{filters.maxRate}</span>/hr</>}
                </p>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>Skills</label>
                <div style={{ display: 'grid', gap: 2, maxHeight: 220, overflowY: 'auto' }}>
                  {SKILL_FILTERS.map(s => (
                    <label key={s} style={CHECKBOX_LABEL_STYLE}>
                      <input type="checkbox" value={s} checked={filters.skills.includes(s)} onChange={() => toggleIn('skills', s)} />
                      <span style={{ fontSize: 13 }}>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>Availability</label>
                {AVAILABILITY_FILTERS.map(s => (
                  <label key={s} style={CHECKBOX_LABEL_STYLE}>
                    <input type="checkbox" value={s} checked={filters.availability.includes(s)} onChange={() => toggleIn('availability', s)} />
                    <span style={{ fontSize: 13 }}>{s}</span>
                  </label>
                ))}
              </div>
              <button onClick={() => setFilters(DEFAULT_FILTERS)} style={{ width: '100%', padding: 10, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Clear All Filters</button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                <span id="workerCount">{filtered.length}</span> freelancers found
              </p>
              <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
                <Icon name="search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                <input id="workerSearch" type="text" placeholder="Search freelancers by name, skill..." value={filters.search} onChange={e => setFilter('search', e.target.value)}
                       style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div id="workersContainer" className="workers-grid">
              {!filtered.length ? (
                <div style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'var(--card)', padding: 48, textAlign: 'center' }}>
                  <h3 style={{ fontWeight: 500, fontSize: 18, marginBottom: 8 }}>No freelancers found</h3>
                  <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 16 }}>Try adjusting your filters or search criteria</p>
                  <button onClick={() => setFilters(DEFAULT_FILTERS)} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 14 }}>Clear Filters</button>
                </div>
              ) : filtered.map(w => <WorkerCard key={w.id} w={w} onProfile={openProfile} onInvite={openInviteModal} />)}
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Both dialogs live at the end of <body>, as before */}
      {createPortal(
        <>
          <div className="profile-modal" id="profileModal"
               style={profileOpen === null ? undefined : { display: profileOpen ? 'flex' : 'none', alignItems: 'flex-start', justifyContent: 'center' }}
               onClick={e => { if (e.target === e.currentTarget) setProfileOpen(false); }}>
            <div className="profile-panel" id="profilePanel">
              {profileWorker && <WorkerProfile worker={profileWorker} onClose={() => setProfileOpen(false)} onInvite={openInviteModal} />}
            </div>
          </div>

          <div id="inviteModal" style={{ display: inviteOpen ? 'flex' : 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 210, alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'white', borderRadius: 24, padding: 32, width: '100%', maxWidth: 440, margin: '0 16px', boxShadow: '0 32px 80px rgba(0,0,0,0.15)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Invite to Project</h2>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 20 }} id="inviteWorkerLabel">
                {inviteLabel}
              </p>
              <div className="form-group">
                <label className="form-label">Select Project</label>
                <select className="form-input" id="projectSelect" style={{ padding: '12px 16px', width: '100%' }} value={projectId} onChange={e => setProjectId(e.target.value)}>
                  {!openTasks ? <option>No projects available</option>
                    : !openTasks.length ? <option value="">No open projects — only open projects accept invitations</option>
                    : openTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                {(openTasks || []).some(t => t.id === projectId) && (
                  <div style={{ fontSize: 12, marginTop: 6, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                    {`The offer is the project's budget, ₹${Number(openTasks.find(t => t.id === projectId).budget).toLocaleString('en-IN')}. If the worker accepts, they are hired at that price and the project starts straight away.`}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Personal Message</label>
                <textarea id="inviteMessage" className="form-input" rows="3" placeholder="Hi! I would like to invite you to work on..." value={inviteMessage} onChange={e => setInviteMessage(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setInviteOpen(false)} className="btn-outline" style={{ flex: 1, padding: 12, borderRadius: 12 }}>Cancel</button>
                <button onClick={sendInvite} className="btn-primary" style={{ flex: 2, padding: 12, borderRadius: 12 }}>Send Invitation</button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
