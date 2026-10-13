/**
 * LANNENT — ProjectMilestoneBoard
 * Converted from front-end/pages/project-milestone-board.html.
 *
 * The client's kanban board for one project (?id=<taskId>; defaults to their
 * first project). Shows escrow released / locked, overall progress and the
 * milestones in five columns, with a "Review Deliverable" action on
 * submitted work.
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
import pageCss from './ProjectMilestoneBoard.css?raw';

const PRIORITY_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981', Normal: '#6366f1' };

/** The project's milestones grouped into the five board columns. */
function loadMilestonesFromStore(Store, Auth, taskId) {
  if (!taskId) {
    // fallback: use the client's first project
    const session = Auth.getCurrentUser();
    if (!session) return { todo: [], inProgress: [], review: [], disputed: [], done: [] };
    taskId = Store.getTasksByClient(session.userId)[0]?.id;
  }
  const all = taskId ? Store.getMilestonesByTask(taskId) : [];
  const colMap = { todo: [], inProgress: [], review: [], disputed: [], done: [] };
  all.forEach(m => {
    const worker = m.workerId ? Store.getUserById(m.workerId) : null;
    const card = {
      id: m.id,
      title: m.title,
      desc: m.description || '',
      amount: '$' + (m.budget || 0).toLocaleString(),
      due: m.dueDate ? new Date(m.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date',
      assignee: worker ? worker.avatar : '?',
      assigneeColor: worker ? worker.avatarColor : '#94a3b8',
      priority: m.priority || 'Medium',
      progress: m.progress || 0,
      status: m.status || 'todo',
      rawId: m.id,
      taskId: m.taskId,
    };
    if (m.status === 'completed' || m.status === 'approved' || m.status === 'audit-passed') colMap.done.push(card);
    else if (m.status === 'review' || m.status === 'submitted') colMap.review.push(card);
    else if (m.status === 'disputed') colMap.disputed.push(card);
    else if (m.status === 'in-progress') colMap.inProgress.push(card);
    else colMap.todo.push(card);
  });
  return colMap;
}

/** Sum of "$1,234"-style amounts. */
const sumAmounts = cards => cards.reduce((s, m) => s + parseFloat((m.amount || '$0').replace(/[^0-9.]/g, '') || 0), 0);

/** One milestone card; `col` decides the footer note / action. */
function MilestoneCard({ m, col }) {
  const navigate = useNavigate();
  const pc = PRIORITY_COLORS[m.priority] || '#6366f1';

  return (
    <div className="kanban-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="card-title" style={{ flex: 1, marginBottom: 0 }}>{m.title}</div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, marginLeft: 8, background: `${pc}20`, color: pc, whiteSpace: 'nowrap' }}>{m.priority}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5, marginBottom: 10 }}>{m.desc}</p>
      {m.progress !== undefined ? (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
            <span style={{ color: 'var(--muted-foreground)' }}>Progress</span>
            <span style={{ fontWeight: 700, color: '#6366f1' }}>{`${m.progress}%`}</span>
          </div>
          <div style={{ height: 5, borderRadius: 9999, background: 'var(--muted)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${m.progress}%` }}></div>
          </div>
        </div>
      ) : ''}
      <div className="card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: m.assigneeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 9, fontWeight: 700 }}>{m.assignee}</div>
          <div className="card-meta" style={{ marginBottom: 0 }}>
            <Icon name="clock" style={{ width: 11, height: 11 }} />
            {m.due}
          </div>
        </div>
        <span className="card-amount">{m.amount}</span>
      </div>
      {col === 'done' ? (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✓ Approved &amp; Paid</span>
        </div>
      ) : ''}
      {col === 'review' ? (
        <div style={{ marginTop: 10 }}>
          <button onClick={e => { e.stopPropagation(); navigate(`/review-deliverable?milestoneId=${m.rawId}&role=client`); }} style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0ea5e9', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Icon name="eye" style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Review Deliverable
          </button>
        </div>
      ) : ''}
      {col === 'disputed' ? <div style={{ marginTop: 10, textAlign: 'center', color: '#b91c1c', fontWeight: 700, fontSize: 12 }}>⚠ Dispute Active</div> : ''}
    </div>
  );
}

export default function ProjectMilestoneBoard() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Milestone Board — Lannent');
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('id');
  const task = taskId ? Store.getTaskById(taskId) : null;

  const milestones = loadMilestonesFromStore(Store, Auth, taskId);
  const allMs = [...milestones.todo, ...milestones.inProgress, ...milestones.review, ...milestones.disputed, ...milestones.done];
  const doneMs = milestones.done.length;
  const totalBudget = sumAmounts(allMs);
  const releasedAmt = sumAmounts(milestones.done);
  const released = '$' + releasedAmt.toLocaleString();
  const pending = '$' + (totalBudget - releasedAmt).toLocaleString();
  const taskTitle = task ? task.title : 'Milestone Board';
  const taskDeadline = task && task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  const progressPct = allMs.length ? Math.round((doneMs / allMs.length) * 100) : 0;

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="client" activePath="/client-my-projects" pageTitle="Milestone Board" pageSubtitle={taskTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <Link to="/client-my-projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--muted-foreground)', transition: 'color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--foreground)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
            <Icon name="arrow-left" style={{ width: 16, height: 16 }} />
            My Projects
          </Link>
          <span style={{ color: 'var(--border)' }}>›</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{taskTitle}</span>
          <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>In Progress</span>
          <Link to={`/milestone-reports?role=client&taskId=${taskId || ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 13, fontWeight: 500, color: 'var(--foreground)', textDecoration: 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--secondary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)'; }}>
            <Icon name="file-text" style={{ width: 14, height: 14 }} />
            Reports
          </Link>
          <Link to={`/project-workroom?id=${taskId}`} className="btn-primary" style={{ fontSize: 13, padding: '6px 14px', marginLeft: 4 }}>
            <Icon name="door-open" style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Go to Workroom
          </Link>
        </div>

        {/* Project Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard value={allMs.length} label="Total Milestones" icon="flag" iconBg="#eef2ff" iconColor="#6366f1" />
          <StatCard value={released} valueStyle={{ color: '#10b981' }} label="Escrow Released" icon="unlock" iconBg="#ecfdf5" iconColor="#10b981" />
          <StatCard value={pending} valueStyle={{ color: '#6366f1' }} label="Escrow Locked" icon="lock" iconBg="#eef2ff" iconColor="#6366f1" />
          <StatCard value={taskDeadline} label="Final Deadline" icon="calendar" iconBg="#fffbeb" iconColor="#f59e0b" />
        </div>

        {/* Overall Progress */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Overall Progress</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#6366f1' }}>{`${progressPct}%`}</span>
              <Link to="/messages" className="btn-primary" style={{ fontSize: 13, padding: '6px 14px' }}>
                <Icon name="message-square" style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Message Worker
              </Link>
            </div>
          </div>
          <div style={{ height: 10, borderRadius: 9999, background: 'var(--muted)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${progressPct}%`, boxShadow: '0 0 10px rgba(99,102,241,0.4)' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>
            <span>{`${doneMs} of ${allMs.length} milestones completed`}</span>
            <span>22 days remaining</span>
          </div>
        </div>

        {/* Kanban Board */}
        {allMs.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted-foreground)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, marginBottom: 24 }}>
            <Icon name="flag" style={{ width: 48, height: 48, opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No milestones yet</div>
            <div style={{ fontSize: 14 }}>Add milestones when posting or editing this task.</div>
          </div>
        ) : ''}
        <div className="kanban-board">
          <KanbanColumn title="To Do" count={milestones.todo.length} dot="#94a3b8" titleColor="#64748b" countBg="#f1f5f9" countColor="#64748b">
            {milestones.todo.map(m => <MilestoneCard key={m.id} m={m} col="todo" />)}
          </KanbanColumn>
          <KanbanColumn title="In Progress" count={milestones.inProgress.length} dot="#6366f1" dotAnimation="pulse 2s infinite" titleColor="#6366f1" countBg="#e0e7ff" countColor="#4f46e5" background="#eef2ff">
            {milestones.inProgress.map(m => <MilestoneCard key={m.id} m={m} col="inProgress" />)}
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
        </div>
      </DashboardLayout>
    </>
  );
}
