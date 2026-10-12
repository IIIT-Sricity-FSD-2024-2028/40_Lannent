/**
 * LANNENT — TaskDetails
 * Converted from front-end/pages/task-details.html.
 *
 * Full details of one task (?id=<taskId>): description, milestones, skills,
 * budget and client. Workers can submit a proposal while the task is open.
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
import { escapeHtml } from '../utils/helpers';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './TaskDetails.css?raw';

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

  // Apply modal
  const [applyOpen, setApplyOpen] = useState(false);
  const [timeline, setTimeline] = useState('3 weeks');
  const [coverLetter, setCoverLetter] = useState('');
  // The page shows the proposal count from when it was opened (it is not
  // refreshed after submitting, as before).
  const [proposalCount] = useState(() => (urlId ? Store.getProposalsByTask(urlId).filter(p => p.type !== 'invitation').length : 0));

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
  const clientRating = clientInfo?.rating || 0;
  const budgetDisplay = task.budget && typeof task.budget === 'number' ? ('$' + task.budget.toLocaleString()) : (task.budget || '$0');
  const budgetNum = task.numBudget || (typeof task.budget === 'number' ? task.budget : parseInt(budgetDisplay.replace(/[^0-9]/g, '')) || 0);
  const taskMilestones = Store.getMilestonesByTask(task.id);
  const taskStatus = task.status || 'open';
  const statusLabel = taskStatus.charAt(0).toUpperCase() + taskStatus.slice(1).replace('-', ' ');
  const statusBadgeClass = taskStatus === 'open' ? 'badge-green' : taskStatus === 'in-progress' ? 'badge-blue' : taskStatus === 'completed' ? 'badge-purple' : 'badge-yellow';

  function submitProposal() {
    if (!coverLetter) {
      Validate.toast('Please write a cover letter', 'error');
      return;
    }
    const currentUser = Auth.getCurrentUser();
    if (!currentUser) {
      Validate.toast('Please log in to submit a proposal', 'error');
      return;
    }

    const latest = Store.getTaskById(task.id);

    // ── Guard: only open tasks accept proposals ───────────────────
    if (latest && latest.status !== 'open') {
      Validate.toast('This project is no longer accepting proposals.', 'error');
      setApplyOpen(false);
      return;
    }

    const taskBudget = latest ? (typeof latest.budget === 'number' ? latest.budget : parseInt(String(latest.budget).replace(/[^0-9]/g, '')) || 1000) : 1000;

    try {
      Store.createProposal({
        taskId: task.id || 't1',
        workerId: currentUser.userId,
        workerName: currentUser.name || 'Worker',
        avatar: currentUser.avatar || 'WK',
        avatarColor: currentUser.avatarColor || '#6366f1',
        bidPrice: '$' + taskBudget.toLocaleString(),
        timeline,
        coverLetter,
        skills: currentUser.skills || [],
        status: 'pending',
      });

      // Notify the task's client about the new proposal
      if (latest && latest.clientId) {
        Store.addNotification({
          userId: latest.clientId,
          type: 'proposal',
          text: `New proposal from ${escapeHtml(currentUser.name || 'a worker')}`,
          subtext: `${escapeHtml(latest.title)} — Bid: $${taskBudget.toLocaleString()}, Timeline: ${timeline}`,
        });
      }
    } catch (e) {
      console.error('[submitProposal] Error:', e);
    }

    setApplyOpen(false);
    Validate.toast('✓ Proposal submitted successfully!', 'success');
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
                      Posted recently
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
                  const msStatusLabel = msStatus === 'completed' ? '✓ Completed' : msStatus === 'submitted' ? '⬆ Submitted' : msStatus === 'in-progress' ? '⏳ In Progress' : msStatus === 'disputed' ? '⚠ Disputed' : '○ Pending';
                  return (
                <div key={m.id} className="milestone-item">
                  <div className="milestone-dot" style={{ background: color, marginTop: 6 }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{`Milestone ${i+1}: ${m.title}`}</span>
                      <span style={{ fontWeight: 700, color: color }}>{`$${(m.budget || 0).toLocaleString()}`}</span>
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
                <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>{`$${budgetNum.toLocaleString()}`}</div>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Total budget</div>
              </div>
              {taskStatus === 'open' ? (
                <>
                <button className="btn-primary" style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 15, marginBottom: 12 }} onClick={() => setApplyOpen(true)}>Apply Now</button>
                {' '}
                <button className="btn-outline" style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 15 }}>
                  <Icon name="bookmark" style={{ width: 16, height: 16, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                  Save Task
                </button>
                </>
              ) : (
                <div style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 600, textAlign: 'center', marginBottom: 12, ...STATUS_BOX_COLORS[taskStatus === 'in-progress' || taskStatus === 'completed' ? taskStatus : 'other'] }}>{taskStatus === 'in-progress' ? '🔄 In Progress — Not Accepting Proposals' : taskStatus === 'completed' ? '✅ Completed' : '⚠️ ' + statusLabel}</div>
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
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Proposals</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{`${proposalCount} submitted`}</span>
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
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{clientRating > 0 ? clientRating + '★' : 'N/A'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Rating</div>
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
        {/* Apply Modal */}
        <div id="applyModal" style={{ display: applyOpen ? 'flex' : 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 32, width: '100%', maxWidth: 480, margin: '0 16px', boxShadow: '0 32px 80px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600 }}>Submit Proposal</h2>
              <button onClick={() => setApplyOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                <Icon name="x" style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Delivery Timeline</label>
              {' '}
              <select id="timelineInput" className="form-input filter-select" style={{ padding: '12px 16px' }} value={timeline} onChange={e => setTimeline(e.target.value)}>
                <option>3 weeks</option>
                <option>4 weeks</option>
                <option>5 weeks</option>
                <option>6 weeks</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cover Letter</label>
              {' '}
              <textarea id="coverLetterInput" className="form-input" rows="4" placeholder="Describe your relevant experience and why you're the best fit for this project..."
                        value={coverLetter} onChange={e => setCoverLetter(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => setApplyOpen(false)} className="btn-outline" style={{ flex: 1, padding: 12, borderRadius: 12 }}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, padding: 12, borderRadius: 12 }} onClick={submitProposal}>Submit Proposal</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
