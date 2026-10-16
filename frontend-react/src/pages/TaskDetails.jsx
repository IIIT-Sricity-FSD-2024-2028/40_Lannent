/**
 * LANNENT — TaskDetails
 * Converted from front-end/pages/task-details.html.
 *
 * Full details of one task (?id=<taskId>): description, milestones, skills,
 * budget and client. There is no bidding: the client's budget is the price.
 * While the task is open a worker can apply at that price; the client then
 * accepts one application, which hires that worker and starts the project.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import { getSavedTaskIds, toggleSavedTask } from '../utils/helpers';
import usePageTitle from '../hooks/usePageTitle';
import useRerender from '../hooks/useRerender';
import pageCss from './TaskDetails.css?raw';

const MILESTONE_STATUS_TEXT = {
  completed: '✓ Completed',
  approved: '✓ Approved',
  submitted: '⬆ Submitted',
  review: '⬆ In review',
  'in-progress': '⏳ In Progress',
  'revision-needed': '↺ Revision requested',
  disputed: '⚠ Disputed',
  pending: '○ Pending',
};

const MILESTONE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'];

// Colours of the status box shown instead of "Apply Now" once a task is not open
const STATUS_BOX_COLORS = {
  'in-progress': { background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' },
  completed: { background: '#f0fdf4', color: '#059669', border: '1px solid #a7f3d0' },
  other: { background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' },
};

export default function TaskDetails() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Task Details — Lannent');
  const [searchParams] = useSearchParams();
  const urlId = searchParams.get('id');
  const role = Auth.getCurrentUser()?.role;

  // "Save Task" bookmark — the button had no handler at all.
  const userId = Auth.getCurrentUser()?.userId;
  const [saved, setSaved] = useState(() => !!urlId && getSavedTaskIds(userId).includes(urlId));
  // Apply dialog: an optional note to the client. There is no price to name.
  const [applyOpen, setApplyOpen] = useState(false);
  const [note, setNote] = useState('');
  const rerender = useRerender();
  function toggleSave() {
    if (!userId || !urlId) { Validate.toast('Please log in to save tasks.', 'error'); return; }
    const nowSaved = toggleSavedTask(userId, urlId);
    setSaved(nowSaved);
    Validate.toast(nowSaved ? 'Task saved.' : 'Task removed from saved.', nowSaved ? 'success' : 'info');
  }

  const task = urlId ? Store.getTaskById(urlId) : null;

  // A missing task used to fall back to a fabricated one — five hardcoded
  // fixtures plus a default — so a wrong or stale id rendered an invented
  // project, complete with a client name, a budget and a skill list, as
  // though it were real. Better to say the task is not there.
  if (!task) {
    return (
      <>
        <PageStyle css={pageCss} />
        <EmptyState
          role={role}
          activePath="/browse-tasks"
          pageTitle="Task"
          message={urlId
            ? `No task found with the id "${urlId}". It may have been removed, or the link may be out of date.`
            : 'No task was specified. Open a task from the list to see its details.'}
          linkHref="/browse-tasks"
          linkLabel="Browse tasks"
        />
      </>
    );
  }

  const clientInfo = task.clientId ? Store.getUserById(task.clientId) : null;
  const clientName = clientInfo ? clientInfo.name : (task.clientName || 'Unknown Client');
  const clientInitials = clientInfo ? clientInfo.avatar : (task.clientInitials || '??');
  const clientMemberDate = clientInfo ? ('Member since ' + clientInfo.joinDate) : '';
  const clientProjects = clientInfo ? (Store.getTasksByClient(task.clientId)?.length || 0) : 0;
  const budgetDisplay = task.budget && typeof task.budget === 'number' ? ('₹' + task.budget.toLocaleString('en-IN')) : (task.budget || '₹0');
  const budgetNum = task.numBudget || (typeof task.budget === 'number' ? task.budget : parseInt(budgetDisplay.replace(/[^0-9]/g, '')) || 0);
  const taskMilestones = Store.getMilestonesByTask(task.id);
  const taskStatus = task.status || 'open';
  const statusLabel = taskStatus.charAt(0).toUpperCase() + taskStatus.slice(1).replace('-', ' ');
  const statusBadgeClass = taskStatus === 'open' ? 'badge-green' : taskStatus === 'in-progress' ? 'badge-blue' : taskStatus === 'completed' ? 'badge-purple' : taskStatus === 'cancelled' ? 'badge-red' : 'badge-orange';

  // This worker's most recent application or invitation here, if any.
  const mine = role === 'worker'
    ? Store.getProposalsByTask(task.id).filter(p => p.workerId === userId).slice(-1)[0] || null
    : null;
  const pendingApplication = mine && mine.type === 'application' && mine.status === 'pending' ? mine : null;
  const pendingInvitation = mine && mine.type === 'invitation' && mine.status === 'pending' ? mine : null;
  const rejected = Store.getProposalsByTask(task.id).some(p => p.workerId === userId && p.type === 'application' && p.status === 'rejected');

  function apply() {
    try {
      Store.applyToTask(task.id, note.trim());
    } catch (e) {
      Validate.toast(e.message, 'error');
      return;
    }
    setApplyOpen(false);
    setNote('');
    rerender();
    Validate.toast('✓ Application sent. The client will accept or decline it.', 'success');
  }

  function withdraw() {
    Validate.confirm('Withdraw your application? You can apply again later.', () => {
      try { Store.withdrawProposal(pendingApplication.id); } catch (e) { Validate.toast(e.message, 'error'); return; }
      rerender();
      Validate.toast('Application withdrawn.', 'success');
    });
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={role || 'worker'} activePath="/browse-tasks" pageTitle="Task Details" pageSubtitle="">
        <div style={{ marginBottom: 16 }}>
          <Link to="/browse-tasks" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--muted-foreground)', transition: 'color 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--foreground)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
            <Icon name="arrow-left" style={{ width: 16, height: 16 }} />
            Back to Browse
          </Link>
        </div>
        <div className="detail-layout">
          {/* LEFT: Main Details */}
          <div>
            <div className="detail-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    {task.auditEnabled ? (
                      <span className="badge badge-purple">Audit Enabled</span>
                    ) : ''}
                    <span className={`badge ${statusBadgeClass}`}>{statusLabel}</span>
                  </div>
                  <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>{task.title}</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted-foreground)' }}>
                      <Icon name="user" style={{ width: 13, height: 13 }} />
                      {clientName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted-foreground)' }}>
                      <Icon name="clock" style={{ width: 13, height: 13 }} />
                      {task.createdAt ? 'Posted ' + new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Posted recently'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted-foreground)' }}>
                      <Icon name="map-pin" style={{ width: 13, height: 13 }} />
                      Remote
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>{budgetDisplay}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Fixed Price</div>
                </div>
              </div>
            </div>
            {/* Description */}
            <div className="detail-card">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Project Description</h3>
              {(task.description || '').split('\n').filter(p => p.trim()).map((p, i) => (
                <p key={i} style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>{p}</p>
              ))}
            </div>
            {/* Milestones */}
            <div className="detail-card">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Project Milestones</h3>
              <div>
                {taskMilestones.length > 0 ? taskMilestones.map((m, i) => {
                  const color = MILESTONE_COLORS[i % MILESTONE_COLORS.length];
                  const msStatus = m.status || 'pending';
                  const msStatusLabel = MILESTONE_STATUS_TEXT[msStatus] || msStatus;
                  return (
                <div key={m.id} className="milestone-item">
                  <div className="milestone-dot" style={{ background: color, marginTop: 6 }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{`Milestone ${i+1}: ${m.title}`}</span>
                      <span style={{ fontWeight: 700, color: color }}>{`₹${(m.budget || 0).toLocaleString('en-IN')}`}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 4 }}>{m.description || ''}</p>
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{msStatusLabel}</span>
                  </div>
                </div>
              );
                }) : (
                <p style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>No milestones defined yet.</p>
              )}
              </div>
            </div>
            {/* Required Skills */}
            <div className="detail-card">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Required Skills</h3>
              <div className="skills-list">
                {(task.skills || []).map(s => <span key={s} className="skill-tag" style={{ padding: '6px 14px', fontSize: 13 }}>{s}</span>)}
              </div>
            </div>
          </div>
          {/* RIGHT: Sidebar */}
          <div>
            {/* Apply Card */}
            <div className="detail-card" style={{ position: 'sticky', top: 80 }}>
              <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>{`₹${budgetNum.toLocaleString('en-IN')}`}</div>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Total budget</div>
              </div>
              {taskStatus === 'open' ? (
                <>
                {role !== 'worker' ? (
                  <div style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 600, textAlign: 'center', marginBottom: 12, background: '#eef2ff', color: '#3730a3' }}>Open for applications</div>
                ) : pendingInvitation ? (
                  <Link to="/worker-invitations" className="btn-primary" style={{ display: 'block', width: '100%', padding: 12, borderRadius: 12, fontSize: 15, marginBottom: 12, textAlign: 'center', textDecoration: 'none' }}>You&apos;re invited — answer it</Link>
                ) : pendingApplication ? (
                  <>
                    <div style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 600, textAlign: 'center', marginBottom: 8, background: '#ecfdf5', color: '#047857' }}>✓ Applied — waiting for the client</div>
                    <button className="btn-outline" style={{ width: '100%', padding: 10, borderRadius: 12, fontSize: 14, marginBottom: 12 }} onClick={withdraw}>Withdraw application</button>
                  </>
                ) : rejected ? (
                  <div style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 13, textAlign: 'center', marginBottom: 12, ...STATUS_BOX_COLORS.other }}>The client declined your application to this project.</div>
                ) : (
                  <>
                    <button className="btn-primary" style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 15, marginBottom: 8 }} onClick={() => setApplyOpen(true)}>{`Apply for ${budgetDisplay}`}</button>
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', textAlign: 'center', marginBottom: 12, lineHeight: 1.5 }}>
                      The price is fixed by the client. If they accept your application, you are hired and the project starts.
                    </p>
                  </>
                )}
                {' '}
                {role === 'worker' && <button className="btn-outline" style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 15, ...(saved ? { borderColor: '#6366f1', color: '#4f46e5', background: '#eef2ff' } : {}) }}
                        onClick={toggleSave} aria-pressed={saved}>
                  <Icon name={saved ? 'bookmark-check' : 'bookmark'} style={{ width: 16, height: 16, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                  {saved ? 'Saved' : 'Save Task'}
                </button>}
                </>
              ) : (
                <div style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 600, textAlign: 'center', marginBottom: 12, ...STATUS_BOX_COLORS[taskStatus === 'in-progress' || taskStatus === 'completed' ? taskStatus : 'other'] }}>{taskStatus === 'in-progress' ? '🔄 In Progress — a worker has been hired' : taskStatus === 'completed' ? '✅ Completed' : '⚠️ ' + statusLabel}</div>
              )}
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Status</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{statusLabel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Category</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{task.category || 'General'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Milestones</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{`${taskMilestones.length} defined`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Progress</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{`${task.progress || 0}%`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Deadline</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : 'TBD'}</span>
                </div>
              </div>
              <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: 'var(--input-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>{clientInitials}</div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{clientName}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{clientMemberDate}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{clientProjects}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Projects</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{clientInfo?.completedProjects || 0}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Completed</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{task.auditEnabled ? 'Yes' : 'No'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Audit</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {applyOpen && (
          <div style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
               onClick={e => { if (e.target === e.currentTarget) setApplyOpen(false); }}>
            <div style={{ background: 'var(--card)', borderRadius: 24, padding: 28, width: '100%', maxWidth: 460, margin: '0 16px', boxShadow: '0 32px 80px rgba(0,0,0,0.15)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>{`Apply for ${budgetDisplay}`}</h2>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16, lineHeight: 1.5 }}>
                The budget is set by the client and is not negotiable. If they accept, you are hired at that price and paid milestone by milestone, less the service fee.
              </p>
              <label className="form-label" htmlFor="applyNote">Note to the client (optional)</label>
              <textarea id="applyNote" className="form-input" rows="4" maxLength={2000} placeholder="Relevant experience, links to similar work…"
                        value={note} onChange={e => setNote(e.target.value)} />
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button onClick={() => setApplyOpen(false)} className="btn-outline" style={{ flex: 1, padding: 12, borderRadius: 12 }}>Cancel</button>
                <button onClick={apply} className="btn-primary" style={{ flex: 1, padding: 12, borderRadius: 12 }}>Send application</button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  );
}
