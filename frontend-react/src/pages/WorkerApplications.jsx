/**
 * LANNENT — WorkerApplications
 * Converted from front-end/pages/worker-applications.html.
 *
 * Applications workers sent for the client's open projects. Pick a project
 * in the dropdown, browse its pending applications, open one for details,
 * then hire or reject. There is no bidding: every application is at the
 * project's posted budget, and hiring starts the project.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './WorkerApplications.css?raw';

const SANS = 'system-ui,-apple-system,sans-serif';
const formatDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const money = n => '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The client's open projects — only open tasks can still hire. */
function loadProjects(Store, Auth) {
  const session = Auth.getCurrentUser();
  if (!session) return [];
  return Store.getTasksByClient(session.userId)
    .filter(t => t.status === 'open')
    .map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      budget: '₹' + (t.budget || 0).toLocaleString('en-IN'),
      deadline: t.deadline ? formatDate(t.deadline) : 'No deadline',
      posted: t.createdAt ? formatDate(t.createdAt) : 'Recent',
      proposalCount: Store.getProposalsByTask(t.id).filter(p => p.type === 'application').length,
    }));
}

/** Every application on the client's tasks, with worker details filled in. */
function buildAllProposals(Store, Auth) {
  const session = Auth.getCurrentUser();
  if (!session) return [];
  const clientTaskIds = Store.getTasksByClient(session.userId).map(t => t.id);
  return Store.getProposals()
    .filter(p => clientTaskIds.includes(p.taskId) && p.type === 'application')
    .map(p => {
      const worker = Store.getUserById(p.workerId);
      return {
        id: p.id, projectId: p.taskId, taskId: p.taskId,
        workerName: p.workerName || worker?.name || 'Worker',
        avatar: p.avatar || worker?.avatar || 'WK',
        avatarColor: p.avatarColor || worker?.avatarColor || '',
        location: worker?.location || 'Location not set',
        applied: p.createdAt ? formatDate(p.createdAt) : 'Recently',
        coverLetter: p.message || '',
        skills: p.skills || worker?.skills || [],
        completedProjects: worker?.completedProjects || 0,
        activeProjects: worker?.activeProjects || 0,
        experience: worker?.experienceLevel || 'Not set',
        hourlyRate: worker?.hourlyRate ? `₹${worker.hourlyRate}/hr` : '—',
        availability: typeof worker?.availability === 'string' && worker.availability ? worker.availability : 'Availability not set',
        status: p.status || 'pending',
        fromStore: true,
        type: p.type,
      };
    });
}

/** Pending applications for one project. */
const pendingFor = (proposals, projectId) =>
  proposals.filter(p => (p.projectId === projectId || p.taskId === projectId) && p.status === 'pending');

/** One coloured tile of the project details strip. */
function ProjectTile({ icon, iconColor, label, labelColor, value, valueColor, valueSize, background, border }) {
  return (
    <div style={{ padding: 14, borderRadius: 12, background, border: `1px solid ${border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon name={icon} style={{ width: 16, height: 16, color: iconColor, flexShrink: 0 }} />
        <div style={{ fontSize: 11, color: labelColor, fontWeight: 600, fontFamily: SANS }}>{label}</div>
      </div>
      <div style={{ fontSize: valueSize, fontWeight: valueSize === 16 ? 700 : 600, color: valueColor, fontFamily: SANS }}>{value}</div>
    </div>
  );
}

/** A small stat box in the proposal detail ("92% Success Rate"). */
function WorkerStat({ value, label, background, valueColor, labelColor, valueSize = 18 }) {
  return (
    <div style={{ padding: 12, borderRadius: 12, background, textAlign: 'center' }}>
      <div style={{ fontWeight: 700, fontSize: valueSize, color: valueColor }}>{value}</div>
      <div style={{ fontSize: 11, color: labelColor }}>{label}</div>
    </div>
  );
}

/** Full details of the selected application, with Hire / Reject. */
function ProposalDetail({ p, budget, onHire, onReject }) {
  if (!p) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted-foreground)' }}>Select an application to view details</div>;
  const metaIcon = { width: 12, height: 12, display: 'inline', verticalAlign: 'middle' };
  return (
    <>
      <div className="detail-section">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: p.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 700 }}>{p.avatar}</div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{p.workerName}</h2>
              <div style={{ fontSize: 13, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span><Icon name="map-pin" style={metaIcon} />{' ' + p.location}</span>
                <span><Icon name="clock" style={metaIcon} />{' ' + p.availability}</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{budget}</div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{`Your budget · applied ${p.applied}`}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          <WorkerStat value={p.experience} label="Experience" background="#ecfdf5" valueColor="#10b981" labelColor="#065f46" valueSize={14} />
          <WorkerStat value={p.completedProjects} label="Completed on Lannent" background="#eef2ff" valueColor="#4f46e5" labelColor="#3730a3" />
          <WorkerStat value={p.activeProjects} label="In progress now" background="#fffbeb" valueColor="#d97706" labelColor="#92400e" />
          <WorkerStat value={p.hourlyRate} label="Hourly Rate" background="#faf5ff" valueColor="#7c3aed" labelColor="#5b21b6" valueSize={16} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-primary" style={{ flex: 2, padding: 10, borderRadius: 12 }} onClick={() => onHire(p.id)}>
            <Icon name="check-circle" style={{ width: 15, height: 15, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            {`Hire ${p.workerName.split(' ')[0]}`}
          </button>
          <button className="btn-outline" style={{ flex: 1, padding: 10, borderRadius: 12, color: '#ef4444', borderColor: '#fca5a5' }} title="Reject" onClick={() => onReject(p.id)}>
            Reject
          </button>
        </div>
      </div>

      <div className="detail-section">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Note from the worker</h3>
        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, overflowWrap: 'anywhere' }}>{p.coverLetter || 'No note added.'}</p>
      </div>

      <div className="detail-section">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Skills</h3>
        <div className="skills-list">
          {p.skills.map(s => <span key={s} className="skill-tag" style={{ fontSize: 13, padding: '5px 12px' }}>{s}</span>)}
        </div>
      </div>
    </>
  );
}

export default function WorkerApplications() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Worker Applications — Lannent');
  const [projects] = useState(() => loadProjects(Store, Auth));
  const [allProposals, setAllProposals] = useState(() => buildAllProposals(Store, Auth));
  const [selectedProjectId, setSelectedProjectId] = useState(() => projects[0]?.id || '');
  const [selectedProposalId, setSelectedProposalId] = useState(null);
  const [search, setSearch] = useState('');            // what is typed in the search box
  const [appliedSearch, setAppliedSearch] = useState(''); // the filter in effect (cleared when switching project)
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [chevronAnimated, setChevronAnimated] = useState(false);
  const [hireProposalId, setHireProposalId] = useState(null);
  const [hireOpen, setHireOpen] = useState(null);       // null until first opened
  const switcherRef = useRef(null);

  // Close the project dropdown on any click outside it
  useEffect(() => {
    function onDocumentClick(event) {
      if (switcherRef.current && !switcherRef.current.contains(event.target)) setDropdownOpen(false);
    }
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, []);

  // If client has no projects, show empty state
  if (!projects.length) {
    return (
      <>
        <PageStyle css={pageCss} />
        <DashboardLayout role="client" activePath="/worker-applications" pageTitle="Worker Applications" pageSubtitle="Review applications and hire the best talent">
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Icon name="inbox" style={{ width: 32, height: 32, color: '#6366f1' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No projects yet</h3>
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 24 }}>Post a task first to start receiving worker applications.</p>
            <Link to="/post-task" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, fontSize: 14 }}>Post a Task</Link>
          </div>
        </DashboardLayout>
      </>
    );
  }

  const project = projects.find(p => p.id === selectedProjectId);
  const proposals = pendingFor(allProposals, selectedProjectId);
  const q = appliedSearch.toLowerCase();
  const listed = proposals.filter(p => !q || p.workerName.toLowerCase().includes(q) || p.skills.some(s => s.toLowerCase().includes(q)));
  const selectedProposal = allProposals.find(p => p.id === selectedProposalId);
  const hireProposal = allProposals.find(p => p.id === hireProposalId);

  function switchProject(id) {
    setSelectedProjectId(id);
    setSelectedProposalId(null);
    setAppliedSearch('');
    setDropdownOpen(false);
  }

  function toggleDropdown() {
    setDropdownOpen(open => !open);
    setChevronAnimated(true);
  }

  function openHireModal(proposalId) {
    if (!allProposals.find(p => p.id === proposalId)) return;
    setSelectedProposalId(proposalId);
    setHireProposalId(proposalId);
    setHireOpen(true);
  }

  function confirmHire() {
    // Guard: verify the task is still open before hiring
    const task = Store.getTaskById(selectedProjectId);
    if (task && task.status !== 'open') {
      setHireOpen(false);
      Validate.toast('This project is no longer open — cannot hire.', 'error');
      return;
    }
    setHireOpen(false);

    try {
      // Accepting the application hires the worker and starts the project.
      Store.acceptProposal(selectedProposalId);
    } catch (e) {
      // Usually the milestones do not add up to the budget, or the wallet
      // cannot cover the contract fees.
      Validate.toast((e.message), 'error');
      return;
    }

    // Update UI — mark hired; the other pending applications on the project close
    setAllProposals(list => list.map(p => (p.taskId === selectedProjectId && (p.id === selectedProposalId || p.status === 'pending') ? { ...p, status: p.id === selectedProposalId ? 'hired' : 'closed' } : p)));
    Validate.toast(`✓ Worker hired. ${money(hireQuote ? hireQuote.fees : 0)} in contract fees charged; the budget stays in escrow.`, 'success');
    switchProject(selectedProjectId);
  }

  function rejectProposal(proposalId) {
    Validate.confirm('Are you sure you want to reject this application?', () => {
      try {
        Store.declineProposal(proposalId);
      } catch (e) {
        Validate.toast((e.message), 'error');
        return;
      }
      setAllProposals(list => list.map(p => (p.id === proposalId ? { ...p, status: 'rejected' } : p)));
      Validate.toast('Application rejected.', 'success');
      switchProject(selectedProjectId);
    });
  }

  // The budget has been in escrow since posting and is the contract price;
  // hiring charges the marketplace and initiation fees on it. Quote what the
  // server will actually charge, using the same fee table it uses.
  let hireQuote = null;
  if (hireProposal) {
    const task = Store.getTaskById(hireProposal.taskId);
    const price = task ? Number(task.budget) || 0 : 0;
    const planned = task ? Store.getMilestonesByTask(task.id).reduce((a, m) => a + (Number(m.budget) || 0), 0) : 0;
    hireQuote = { ...Store.Fees.projectFunding(price), price, planned };
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="client" activePath="/worker-applications" pageTitle="Worker Applications" pageSubtitle="Review applications and hire the best talent">
        <div style={{ marginBottom: 16 }}>
          <Link to="/client-my-projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--muted-foreground)', transition: 'color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--foreground)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
            <Icon name="arrow-left" style={{ width: 16, height: 16 }} />
            Back to Projects
          </Link>
        </div>

        {/* Project Switcher with Dropdown and Details */}
        <div style={{ marginBottom: 20 }}>
          <div ref={switcherRef} style={{ position: 'relative', background: 'linear-gradient(135deg,#eef2ff,#f0f4ff)', border: '1px solid #c7d2fe', borderRadius: 16, padding: '16px 20px', marginBottom: 16 }}>
            <div id="projectSelectDisplay" onClick={toggleDropdown} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px 12px', background: 'rgba(255,255,255,0.6)', borderRadius: 12, border: '1px solid #ddd6fe' }}>
              <Icon name="briefcase" style={{ width: 20, height: 20, color: '#4f46e5', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }} id="projectSelectTitle">{project ? project.title : 'Select a project'}</div>
                <div style={{ fontSize: 12, color: '#6366f1' }} id="projectSelectProposals">{proposals.length + ' applications'}</div>
              </div>
              <Icon name="chevron-down" id="dropdownChevron"
                    style={{ width: 18, height: 18, color: '#6366f1', flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', ...(chevronAnimated ? { transition: 'transform 0.2s' } : {}) }} />
            </div>
            {/* Custom Dropdown Menu */}
            <div id="projectDropdownMenu" style={{ display: dropdownOpen ? 'block' : 'none', position: 'absolute', top: '100%', left: 16, right: 16, background: 'white', border: '1px solid #c7d2fe', borderRadius: 12, marginTop: 8, boxShadow: '0 8px 24px rgba(79,70,229,0.15)', zIndex: 100, overflow: 'hidden' }}>
              {projects.map(proj => (
                <div key={proj.id} onClick={() => switchProject(proj.id)}
                     style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 12 }}
                     onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <Icon name="briefcase" style={{ width: 16, height: 16, color: '#4f46e5', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{proj.title}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{`${pendingFor(allProposals, proj.id).length} applications`}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Details */}
          <div id="projectDetails" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            {project && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, fontFamily: SANS, color: 'var(--foreground)' }}>{project.title}</h3>
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, fontFamily: SANS }}>{project.description}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                  <ProjectTile icon="indian-rupee" iconColor="#10b981" label="Budget" labelColor="#065f46" value={project.budget} valueColor="#059669" valueSize={16} background="linear-gradient(135deg,#f0fdf4,#ecfdf5)" border="#a7f3d0" />
                  <ProjectTile icon="users" iconColor="#0ea5e9" label="Applications" labelColor="#0c4a6e" value={proposals.length} valueColor="#0284c7" valueSize={16} background="linear-gradient(135deg,#eff6ff,#eef2ff)" border="#bfdbfe" />
                  <ProjectTile icon="calendar" iconColor="#f59e0b" label="Deadline" labelColor="#92400e" value={project.deadline} valueColor="#d97706" valueSize={14} background="linear-gradient(135deg,#fffbeb,#fef3c7)" border="#fde68a" />
                  <ProjectTile icon="clock" iconColor="#a855f7" label="Posted" labelColor="#6b21a8" value={project.posted} valueColor="#9333ea" valueSize={14} background="linear-gradient(135deg,#faf5ff,#f3e8ff)" border="#ddd6fe" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main layout */}
        <div className="apps-layout">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }} id="proposalCount">{`${proposals.length} Applications`}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 10, background: 'var(--input-bg)', flex: 1, maxWidth: 200, marginLeft: 12 }}>
                <Icon name="search" style={{ width: 14, height: 14, color: 'var(--muted-foreground)', flexShrink: 0 }} />
                <input type="text" placeholder="Search..." id="proposalSearch" style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', flex: 1 }}
                       value={search} onChange={e => { setSearch(e.target.value); setAppliedSearch(e.target.value); }} />
              </div>
            </div>
            <div className="proposal-list" id="proposalList">
              {!listed.length ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)' }}>No applications for this project yet.</div>
              ) : listed.map(p => (
                <div key={p.id} className={'proposal-item' + (p.id === selectedProposalId ? ' active' : '')} onClick={() => setSelectedProposalId(p.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: p.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{p.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.workerName}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{`${p.completedProjects} completed on Lannent`}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{`Applied ${p.applied}`}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}>{p.coverLetter}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="proposal-detail" id="proposalDetail">
            <ProposalDetail p={selectedProposal} budget={project ? project.budget : ''} onHire={openHireModal} onReject={rejectProposal} />
          </div>
        </div>

        {/* Hire Modal */}
        <div className="hire-modal" id="hireModal" style={hireOpen === null ? undefined : { display: hireOpen ? 'flex' : 'none' }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 32, width: '100%', maxWidth: 440, margin: '0 16px', boxShadow: '0 32px 80px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Confirm Hire</h2>
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 20 }}>
              You&apos;re about to hire <strong id="hireWorkerName">{hireProposal ? hireProposal.workerName : ''}</strong> for this project. The budget is already in escrow; hiring starts the project, and the other applications are closed.
            </p>
            <div style={{ padding: 16, borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#374151' }}>Contract price (your posted budget)</span>
                <span style={{ fontWeight: 700 }} id="hireBidAmount">{hireQuote ? money(hireQuote.price) : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#374151' }}>{`Marketplace fee (${Store.Fees.rates().clientMarketplace.percent}%)`}</span>
                <span style={{ fontWeight: 600, color: '#dc2626' }} id="hireFee">{hireQuote ? money(hireQuote.marketplace) : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#374151' }}>Contract initiation fee</span>
                <span style={{ fontWeight: 600, color: '#dc2626' }} id="hireInitiation">{hireQuote ? money(hireQuote.initiation) : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: '1px solid #bbf7d0', paddingTop: 8, marginTop: 4 }}>
                <span style={{ fontWeight: 600 }}>Charged to your wallet now</span>
                <span style={{ fontWeight: 700, color: '#10b981' }} id="hireTotal">{hireQuote ? money(hireQuote.fees) : ''}</span>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }} id="hireBidNote">
                {hireProposal ? `${hireProposal.workerName} will do the project for ${money(hireQuote.price)}, paid out milestone by milestone.` : ''}
              </div>
              {hireQuote && Math.abs(hireQuote.planned - hireQuote.price) > 0.005 && (
                <div style={{ fontSize: 12, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', marginTop: 10 }}>
                  {`Your milestones add up to ${money(hireQuote.planned)}. Edit them on the milestone board so they add up to exactly ${money(hireQuote.price)} before hiring — that is how the worker is paid.`}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setHireOpen(false)} className="btn-outline" style={{ flex: 1, padding: 12, borderRadius: 12 }}>Cancel</button>
              <button onClick={confirmHire} className="btn-primary" style={{ flex: 2, padding: 12, borderRadius: 12 }}>Confirm Hire</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
