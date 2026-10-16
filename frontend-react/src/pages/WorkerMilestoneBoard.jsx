/**
 * LANNENT — WorkerMilestoneBoard
 * Converted from front-end/pages/worker-milestone-board.html.
 *
 * The worker's kanban board for one project (?id=<taskId>) — or all their
 * projects when no id is given. Milestones move To Do → In Progress →
 * In Review → Done; the worker can start a milestone or submit a deliverable.
 * A milestone under dispute sits in its own column with no work actions
 * until the reviewer's verdict settles it.
 */
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import KanbanColumn from '../components/KanbanColumn';
import PageStyle from '../components/PageStyle';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import useRerender from '../hooks/useRerender';
import { useValidation } from '../context/ValidationContext';
import pageCss from './WorkerMilestoneBoard.css?raw';

const PRIORITY_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
const DONE_STATUSES = ['done', 'approved', 'completed', 'audit-passed'];

/** The worker's milestones grouped into the four board columns. */
function loadWorkerMilestones(Store, Auth, taskId) {
  const session = Auth.getCurrentUser();
  if (!session) return { todo: [], inprogress: [], review: [], disputed: [], done: [] };
  const workerTasks = taskId ? [Store.getTaskById(taskId)].filter(Boolean) : Store.getTasksByWorker(session.userId);
  const colMap = { todo: [], inprogress: [], review: [], disputed: [], done: [] };
  workerTasks.forEach(t => {
    Store.getMilestonesByTask(t.id).forEach(m => {
      const card = {
        id: m.id, rawId: m.id, taskId: m.taskId,
        title: m.title, desc: m.description || '',
        amount: '₹' + (m.budget || 0).toLocaleString('en-IN'),
        due: m.dueDate ? new Date(m.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
        assignee: session.avatar || 'AW', assigneeColor: session.avatarColor || 'linear-gradient(135deg,#10b981,#059669)',
        priority: m.priority || 'Medium', progress: m.progress || 0, status: m.status || 'todo',
        revisionNote: m.status === 'revision-needed' ? m.revisionNote : null,
        cancelled: m.status === 'cancelled',
      };
      // A contract ended for non-delivery cancels the undelivered milestones;
      // they are finished, not "To Do".
      if (DONE_STATUSES.includes(m.status) || m.status === 'cancelled') colMap.done.push(card);
      else if (m.status === 'review' || m.status === 'submitted') colMap.review.push(card);
      // Had no column, so it fell through to To Do with "Start Working".
      else if (m.status === 'disputed') colMap.disputed.push(card);
      else if (m.status === 'in-progress') colMap.inprogress.push(card);
      else colMap.todo.push(card);
    });
  });
  return colMap;
}

/** Sum of "₹1,234"-style amounts. */
const sumAmounts = cards => cards.filter(m => !m.cancelled).reduce((s, m) => s + parseFloat((m.amount || '₹0').replace(/[^0-9.]/g, '') || 0), 0);

/** One milestone card; `col` decides the action at the bottom. */
function MilestoneCard({ m, col, onChange }) {
  const Store = useStore();
  const Validate = useValidation();
  const navigate = useNavigate();
  const pc = PRIORITY_COLORS[m.priority] || '#6366f1';

  function submitDeliverable() {
    navigate('/submit-deliverable?milestoneId=' + m.rawId + (m.taskId ? '&taskId=' + m.taskId : ''));
  }

  function startWorking() {
    // Only the status changes. Sending the whole cached record (and mutating
    // it first) asked the server to rewrite fields a worker does not own.
    try {
      Store.updateMilestone(m.rawId, { status: 'in-progress' });
    } catch (e) {
      Validate.toast(e.message, 'error');
      return;
    }
    onChange();
  }

  return (
    <div className="kanban-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="card-title" style={{ flex: 1, marginBottom: 0 }}>{m.title}</div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, marginLeft: 8, background: `${pc}20`, color: pc, whiteSpace: 'nowrap' }}>{m.priority}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5, marginBottom: 10 }}>{m.desc}</p>
      {m.progress ? (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
            <span style={{ color: 'var(--muted-foreground)' }}>Progress</span>
            <span style={{ fontWeight: 700, color: '#10b981' }}>{`${m.progress}%`}</span>
          </div>
          <div style={{ height: 5, borderRadius: 9999, background: 'var(--muted)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg,#10b981,#059669)', width: `${m.progress}%` }}></div>
          </div>
        </div>
      ) : ''}
      <div className="card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: m.assigneeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 9, fontWeight: 700 }}>{m.assignee}</div>
          <div className="card-meta" style={{ marginBottom: 0 }}>
            <Icon name="clock" style={{ width: 11, height: 11 }} />{` ${m.due}`}
          </div>
        </div>
        <span className="card-amount">{m.amount}</span>
      </div>
      {col === 'done' ? (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          {m.cancelled
            ? <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Cancelled — contract ended</span>
            : <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✓ Paid</span>}
        </div>
      ) : ''}
      {m.revisionNote ? (
        <div style={{ marginTop: 10, padding: 8, borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
          <strong>Changes requested:</strong> {m.revisionNote}
        </div>
      ) : ''}
      {col === 'disputed' ? (
        <div style={{ marginTop: 10, padding: 8, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', textAlign: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#b91c1c' }}>⚠ Under dispute — work paused until the reviewer decides</span>
        </div>
      ) : ''}
      {col === 'review' ? (
        <div style={{ marginTop: 10, padding: 8, borderRadius: 8, background: '#fef9c3', border: '1px solid #fde68a', textAlign: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>⏳ Awaiting Client Review</span>
        </div>
      ) : col === 'inprogress' ? (
        <div style={{ marginTop: 10 }}>
          <button onClick={e => { e.stopPropagation(); submitDeliverable(); }} style={{ width: '100%', padding: 7, borderRadius: 8, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Icon name="send" style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Submit Deliverable
          </button>
        </div>
      ) : col === 'todo' ? (
        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <button onClick={e => { e.stopPropagation(); startWorking(); }} style={{ flex: 1, padding: 7, borderRadius: 8, background: '#eef2ff', color: '#4f46e5', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {m.status === 'revision-needed' ? 'Start revising' : 'Start Working'}
          </button>
          {m.status === 'revision-needed' && (
            <button onClick={e => { e.stopPropagation(); submitDeliverable(); }} style={{ flex: 1, padding: 7, borderRadius: 8, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Resubmit</button>
          )}
        </div>
      ) : ''}
    </div>
  );
}

export default function WorkerMilestoneBoard() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Milestone Board — Lannent');
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('id');
  const task = taskId ? Store.getTaskById(taskId) : null;
  const taskTitle = task ? task.title : 'Milestone Board';

  const rerender = useRerender();
  const milestones = loadWorkerMilestones(Store, Auth, taskId);
  const allMs = [...milestones.todo, ...milestones.inprogress, ...milestones.review, ...milestones.disputed, ...milestones.done];
  // The badge said "In Progress" whatever the project's state.
  const badge = milestones.disputed.length
    ? { cls: 'badge badge-red', text: 'Disputed' }
    : task && task.status === 'completed'
      ? { cls: 'badge badge-green', text: 'Completed' }
      : { cls: 'badge badge-blue', text: 'In Progress' };
  const doneMs = milestones.done.length;
  const totalBudget = sumAmounts(allMs);
  const earnedAmt = sumAmounts(milestones.done);
  const escrowAmt = taskId ? (Store.getMyEscrow().projects.find(p => p.taskId === taskId)?.projectHeld || 0) : totalBudget - earnedAmt;
  const taskDeadline = task && task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  const progressPct = allMs.length ? Math.round((doneMs / allMs.length) * 100) : 0;
  const progressDone = doneMs + milestones.inprogress.length;


  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="worker" activePath="/worker-my-projects" pageTitle="Milestone Board" pageSubtitle={taskTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Link to="/worker-my-projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--muted-foreground)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--foreground)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
            <Icon name="arrow-left" style={{ width: 16, height: 16 }} />
            My Projects
          </Link>
          <span style={{ color: 'var(--border)' }}>›</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{taskTitle}</span>
          <span className={badge.cls} style={{ marginLeft: 'auto' }}>{badge.text}</span>
          <Link to={`/milestone-reports?role=worker&taskId=${taskId || ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 13, fontWeight: 500, color: 'var(--foreground)', textDecoration: 'none', transition: 'background 0.15s', marginLeft: 10 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--secondary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)'; }}>
            <Icon name="file-text" style={{ width: 14, height: 14 }} />
            Reports
          </Link>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard value={allMs.length} label="Total Milestones" icon="flag" iconBg="#eef2ff" iconColor="#6366f1" />
          <StatCard value={`₹${earnedAmt.toLocaleString('en-IN')}`} valueStyle={{ color: '#10b981' }} label="Approved (before fees)" icon="check-circle" iconBg="#ecfdf5" iconColor="#10b981" />
          <StatCard value={`₹${escrowAmt.toLocaleString('en-IN')}`} valueStyle={{ color: '#6366f1' }} label="In Escrow" icon="lock" iconBg="#eef2ff" iconColor="#6366f1" />
          <StatCard value={taskDeadline} label="Final Deadline" icon="calendar" iconBg="#fffbeb" iconColor="#f59e0b" />
        </div>

        {/* Overall progress */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Overall Progress</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#6366f1' }}>{`${progressPct}%`}</span>
              <Link to={`/worker-workroom?id=${taskId}`} className="btn-outline" style={{ fontSize: 13, padding: '6px 14px' }}>
                <Icon name="message-square" style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Workroom
              </Link>
            </div>
          </div>
          <div style={{ height: 10, borderRadius: 9999, background: 'var(--muted)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${progressPct}%`, boxShadow: '0 0 10px rgba(99,102,241,0.4)' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>
            <span>{`${progressDone} of ${allMs.length} milestones in progress or done`}</span>
          </div>
        </div>

        {/* Kanban */}
        <div className="kanban-board" id="kanbanContainer">
          {allMs.length === 0 ? (
            <div style={{ gridColumn: '1/-1', padding: 64, textAlign: 'center', color: 'var(--muted-foreground)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16 }}>
              <Icon name="flag" style={{ width: 48, height: 48, opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No milestones yet</div>
              <div style={{ fontSize: 14 }}>Milestones will appear once clients assign them to you.</div>
            </div>
          ) : (
            <>
              <KanbanColumn title="To Do" count={milestones.todo.length} dot="#94a3b8" titleColor="#64748b" countBg="#f1f5f9" countColor="#64748b">
                {milestones.todo.map(m => <MilestoneCard key={m.id} m={m} col="todo" onChange={rerender} />)}
              </KanbanColumn>
              <KanbanColumn title="In Progress" count={milestones.inprogress.length} dot="#6366f1" dotAnimation="pulse 2s infinite" titleColor="#6366f1" countBg="#e0e7ff" countColor="#4f46e5" background="#eef2ff">
                {milestones.inprogress.map(m => <MilestoneCard key={m.id} m={m} col="inprogress" onChange={rerender} />)}
              </KanbanColumn>
              <KanbanColumn title="In Review" count={milestones.review.length} dot="#f59e0b" titleColor="#d97706" countBg="#fef9c3" countColor="#b45309" background="#fffbeb">
                {milestones.review.map(m => <MilestoneCard key={m.id} m={m} col="review" />)}
              </KanbanColumn>
              <KanbanColumn title="Disputed" count={milestones.disputed.length} dot="#ef4444" titleColor="#b91c1c" countBg="#fee2e2" countColor="#991b1b" background="#fef2f2">
                {milestones.disputed.map(m => <MilestoneCard key={m.id} m={m} col="disputed" />)}
              </KanbanColumn>
              <KanbanColumn title="Done" count={milestones.done.length} dot="#10b981" titleColor="#059669" countBg="#d1fae5" countColor="#065f46" background="#ecfdf5">
                {milestones.done.map(m => <MilestoneCard key={m.id} m={m} col="done" />)}
              </KanbanColumn>
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
