/**
 * LANNENT — ClientMyProjects
 * Converted from front-end/pages/client-my-projects.html.
 *
 * The client's projects as cards with tabs (All / Open / Active / Completed).
 * Each card shows progress, escrow and deadline and can be edited in a
 * dialog. A project nobody has been hired for can be cancelled (the server's
 * quote — fee by time live, audit and dispute escrow refunded in full — is
 * shown first). Once a worker is hired it cannot be cancelled.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import { hoverBackground } from '../utils/helpers';
import useRerender from '../hooks/useRerender';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ClientMyProjects.css?raw';

const DONE_STATUSES = ['completed', 'approved', 'audit-passed', 'done', 'paid'];
const STATUS_BADGES = {
  'open': ['badge-gray', 'Open'],
  'in-progress': ['badge-blue', 'In Progress'],
  'completed': ['badge-green', 'Completed'],
  // An audited project is held as a draft until a reviewer accepts.
  'draft': ['badge-amber', 'Draft — awaiting audit'],
  'cancelled': ['badge-gray', 'Cancelled'],
};
import { CATEGORIES as CATEGORY_OPTIONS } from '../utils/categories';
const CARD_BUTTON_STYLE = { padding: 10, border: '1px solid var(--border)', borderRadius: 10, background: 'white', color: 'var(--foreground)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1 };
/** Small icon button (edit / delete) in a card header. */
const iconButtonStyle = color => ({ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color, borderRadius: 6 });

function StatusBadge({ status }) {
  const [cls, label] = STATUS_BADGES[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

/** 'open' | 'active' | 'completed' | 'cancelled' — the tab a task belongs to. */
function taskCategory(status) {
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'open' || status === 'draft') return 'open';
  return 'active';
}

function fmtDate(d) {
  if (!d) return 'No deadline';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return d; }
}

/** The client's tasks, shaped as project cards. */
function getProjects(Store, userId) {
  const escrow = Store.getMyEscrow().projects;
  const txs = Store.getTransactions();
  return Store.getTasksByClient(userId).map(t => {
    const held = escrow.find(e => e.taskId === t.id);
    const paidOut = txs.filter(x => x.type === 'milestone-release' && x.taskId === t.id)
      .reduce((a, x) => a + (x.grossAmount != null ? x.grossAmount : x.amount || 0), 0);
    const worker = t.workerId ? Store.getUserById(t.workerId) : null;
    const milestones = Store.getMilestonesByTask(t.id);
    const done = milestones.filter(m => DONE_STATUSES.includes(m.status)).length;
    const calculatedProgress = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : (t.progress || 0);
    return {
      id: t.id,
      name: t.title,
      worker: worker ? worker.name : 'Not Assigned',
      workerAvatar: worker ? worker.avatar : '?',
      workerColor: worker ? worker.avatarColor : '#e5e7eb',
      progress: calculatedProgress,
      deadline: fmtDate(t.deadline),
      status: t.status,
      milestones: `${done}/${milestones.length}`,
      escrow: `₹${(held ? held.total : 0).toLocaleString('en-IN')}`,
      paidOut: `₹${paidOut.toLocaleString('en-IN')}`,
      category: taskCategory(t.status),
      auditEnabled: t.auditEnabled,
      hired: !!t.workerId,
      workerName: worker ? worker.name : '',
    };
  });
}

/** One project card. */
function ProjectCard({ p, onEdit, onDelete, onCancel }) {
  const navigate = useNavigate();
  const go = (e, path) => { e.stopPropagation(); navigate(path); };
  const completed = p.category === 'completed';
  const escrowBox = completed
    ? { background: '#d1fae5', border: '1px solid #a7f3d0', color: '#047857' }
    : { background: '#dbeafe', border: '1px solid #bfdbfe', color: '#0369a1' };

  return (
    <div className="project-card" style={{ display: 'flex', flexDirection: 'column' }} id={`card-${p.id}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', flex: 1, marginRight: 12 }}>{p.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusBadge status={p.status} />
          <button onClick={() => onEdit(p.id)} title="Edit" style={iconButtonStyle('var(--muted-foreground)')} {...hoverBackground('var(--secondary)', 'none')}>
            <Icon name="pencil" style={{ width: 14, height: 14 }} />
          </button>
          {['open', 'draft', 'cancelled'].includes(p.status) && !p.hired ? (
            <button onClick={() => onDelete(p.id)} title="Delete" style={iconButtonStyle('#ef4444')} {...hoverBackground('#fee2e2', 'none')}>
              <Icon name="trash-2" style={{ width: 14, height: 14 }} />
            </button>
          ) : ''}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.workerColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>{p.workerAvatar}</div>
        <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{p.worker}</span>
        {p.auditEnabled ? (
          <Link to="/audit-offers" style={{ fontSize: 11, background: '#f3e8ff', color: '#7c3aed', padding: '2px 8px', borderRadius: 99, fontWeight: 500, marginLeft: 4, textDecoration: 'none' }}>
            {p.status === 'draft' ? 'Audit pending →' : 'Audit On'}
          </Link>
        ) : ''}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Milestone Progress</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>{`${p.milestones} completed`}</span>
        </div>
        <div style={{ height: 6, borderRadius: 9999, background: 'var(--muted)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${p.progress}%`, transition: 'width 0.4s' }}></div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, flex: 1 }}>
        <div style={{ ...escrowBox, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 11, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name={completed ? 'check-circle' : 'lock'} style={{ width: 13, height: 13 }} />
            {completed ? 'Paid to worker' : 'Held in escrow'}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{completed ? p.paidOut : p.escrow}</div>
        </div>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 4 }}>
            <Icon name="calendar" style={{ width: 13, height: 13, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Deadline
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{p.deadline}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {p.status === 'draft' ? (
          <button onClick={e => go(e, '/audit-offers')} style={CARD_BUTTON_STYLE}>
            <Icon name="shield-check" style={{ width: 14, height: 14 }} />
            Audit Offers
          </button>
        ) : p.status === 'cancelled' ? (
          <div style={{ ...CARD_BUTTON_STYLE, cursor: 'default', color: 'var(--muted-foreground)' }}>Cancelled — escrow returned</div>
        ) : p.category === 'open' ? (
          <>
            <button onClick={e => go(e, '/worker-applications')} style={CARD_BUTTON_STYLE}>
              <Icon name="users" style={{ width: 14, height: 14 }} />
              View Applications
            </button>
            {!p.hired ? (
              <button onClick={e => { e.stopPropagation(); onCancel(p.id); }} style={{ ...CARD_BUTTON_STYLE, color: '#b91c1c', borderColor: '#fecaca' }}>
                <Icon name="x-circle" style={{ width: 14, height: 14 }} />
                Cancel
              </button>
            ) : null}
          </>
        ) : completed ? (
          <button onClick={e => go(e, `/project-milestone-board?id=${p.id}`)} style={CARD_BUTTON_STYLE}>
            <Icon name="eye" style={{ width: 14, height: 14 }} />
            View Details
          </button>
        ) : (
          <>
            <button onClick={e => go(e, `/project-milestone-board?id=${p.id}`)} style={CARD_BUTTON_STYLE}>
              <Icon name="layout-list" style={{ width: 14, height: 14 }} />
              Milestones
            </button>
            <button onClick={e => go(e, `/project-workroom?id=${p.id}`)} style={CARD_BUTTON_STYLE}>
              <Icon name="message-circle" style={{ width: 14, height: 14 }} />
              Workroom
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const EMPTY_EDIT = { title: '', category: 'Web Development', deadline: '', status: 'open' };

export default function ClientMyProjects() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('My Projects — Lannent');
  const session = Auth.getCurrentUser();
  const refreshView = useRerender();
  const [activeTab, setActiveTab] = useState('all');

  // Edit dialog
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [edit, setEdit] = useState(EMPTY_EDIT);
  const [editErrors, setEditErrors] = useState({});

  const all = getProjects(Store, session.userId);
  const editingTask = editingTaskId ? Store.getTaskById(editingTaskId) : null;
  /** The category can change only before anyone is hired. The budget never changes once posted. */
  const editable = task => !!task && ['open', 'draft'].includes(task.status) && !task.workerId;
  const count = cat => all.filter(p => p.category === cat).length;
  const list = activeTab === 'all' ? all : all.filter(p => p.category === activeTab);
  const tabClass = tab => 'tab-btn' + (activeTab === tab ? ' active' : '');

  function openEditModal(id) {
    const task = Store.getTaskById(id);
    if (!task) return;
    setEditingTaskId(id);
    setEdit({ title: task.title || '', category: task.category || 'Web Development', deadline: task.deadline || '', status: task.status || 'open' });
  }

  function closeEditModal() {
    setEditingTaskId(null);
    setEditErrors({});
  }

  function saveEdit() {
    const title = edit.title.trim();
    const errors = {};
    if (!title || title.length < 3) errors.title = 'Title must be at least 3 characters.';
    setEditErrors(errors);
    if (Object.keys(errors).length) return;

    const task = Store.getTaskById(editingTaskId);
    const patch = { title, deadline: edit.deadline || undefined };
    if (editable(task)) patch.category = edit.category;
    try {
      Store.updateTask(editingTaskId, patch);
    } catch (e) {
      setEditErrors({ title: e.message });
      return;
    }
    closeEditModal();
    refreshView();
    Validate.toast('Project updated.', 'success');
  }

  /** The server's quote, spelled out for the confirm dialog. */
  function quoteText(q) {
    const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const parts = [];
    parts.push(q.fee > 0
      ? `A cancellation fee of ${money(q.fee)} (${q.rate}% of the ${money(q.base)} budget) applies, because the project has been live for ${q.hoursLive >= 48 ? Math.floor(q.hoursLive / 24) + ' days' : Math.round(q.hoursLive) + ' hours'}.`
      : 'No cancellation fee applies.');
    parts.push(`You get back ${money(q.refund.total)}: ${money(q.refund.project)} of the project budget`
      + (q.refund.audit ? `, ${money(q.refund.audit)} technical-audit escrow` : '')
      + (q.refund.dispute ? `, ${money(q.refund.dispute)} dispute escrow` : '') + '.');
    return parts.join(' ');
  }

  function quoteFor(id) {
    try {
      return Store.getCancellationQuote(id);
    } catch (e) {
      Validate.toast(e.message, 'error');
      return null;
    }
  }

  function cancelProject(id) {
    const task = Store.getTaskById(id);
    if (!task) return;
    const q = quoteFor(id);
    if (!q) return;
    if (!q.cancellable) { Validate.toast(q.reason, 'error'); return; }
    Validate.confirm(`Cancel "${task.title}"? ${quoteText(q)} Pending applications and invitations are closed. This cannot be undone.`, () => {
      let result;
      try {
        result = Store.cancelTask(id);
      } catch (e) {
        Validate.toast(e.message, 'error');
        return;
      }
      refreshView();
      const fee = result?.cancellation?.fee?.fee || 0;
      Validate.toast(fee ? `Project cancelled. ₹${fee} fee kept; the rest is back in your wallet.` : 'Project cancelled and your money returned.', 'success');
    });
  }

  function deleteTask(id) {
    const task = Store.getTaskById(id);
    if (!task) return;
    if (task.workerId) {
      Validate.toast('A worker has been hired, so this project can no longer be cancelled or deleted.', 'error');
      return;
    }
    // Deleting a live project is a cancellation too, so it carries the same fee.
    const q = task.status === 'open' ? quoteFor(id) : null;
    if (task.status === 'open' && !q) return;
    const detail = q ? quoteText(q) : 'Anything still held in escrow for it is returned to your wallet.';
    Validate.confirm(`Delete "${task.title}"? ${detail} This cannot be undone.`, () => {
      try {
        Store.deleteTask(id);
      } catch (e) {
        Validate.toast((e.message), 'error');
        return;
      }
      refreshView();
      Validate.toast('Project deleted and its escrow returned to your wallet.', 'success');
    });
  }

  const setEditField = key => e => setEdit(v => ({ ...v, [key]: e.target.value }));
  const errorText = key => <div id={key === 'title' ? 'editTitleErr' : 'editBudgetErr'} style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: editErrors[key] ? 'block' : 'none' }}>{editErrors[key] || ''}</div>;

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="client" activePath="/client-my-projects" pageTitle="My Projects" pageSubtitle="Manage and track all your active and past projects">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div className="tab-bar">
            <button className={tabClass('all')} onClick={() => setActiveTab('all')}>{`All (${all.length})`}</button>
            {' '}
            <button className={tabClass('open')} onClick={() => setActiveTab('open')}>{`Open (${count('open')})`}</button>
            {' '}
            <button className={tabClass('active')} onClick={() => setActiveTab('active')}>{`Active (${count('active')})`}</button>
            {' '}
            <button className={tabClass('completed')} onClick={() => setActiveTab('completed')}>{`Completed (${count('completed')})`}</button>
            {' '}
            <button className={tabClass('cancelled')} onClick={() => setActiveTab('cancelled')}>{`Cancelled (${count('cancelled')})`}</button>
          </div>
          <Link to="/post-task" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="plus" style={{ width: 16, height: 16 }} /> New Project
          </Link>
        </div>

        <div id="projectsContainer">
          {!list.length ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Icon name="folder-open" style={{ width: 24, height: 24, color: 'var(--muted-foreground)' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No projects yet</div>
              <div style={{ fontSize: 14, marginBottom: 20 }}>Post a task to get started with your first project.</div>
              <Link to="/post-task" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="plus" style={{ width: 16, height: 16 }} /> Post a Task
              </Link>
            </div>
          ) : (
            <div className="projects-grid">
              {list.map(p => <ProjectCard key={p.id} p={p} onEdit={openEditModal} onDelete={deleteTask} onCancel={cancelProject} />)}
            </div>
          )}
        </div>
      </DashboardLayout>


      {/* Edit modal (lives at the end of <body>, as before) */}
      {createPortal(
        <div className={'modal-overlay' + (editingTaskId ? ' open' : '')} id="editModal" onClick={e => { if (e.target === e.currentTarget) closeEditModal(); }}>
          <div className="modal">
            <div className="modal-title">Edit Project</div>
            <div className="modal-sub">Update details for this task.</div>
            <div className="modal-field">
              <label>Title <span style={{ color: '#ef4444' }}>*</span></label>
              {' '}
              <input type="text" id="editTitle" placeholder="Task title" value={edit.title} onChange={setEditField('title')} style={editErrors.title ? { borderColor: '#ef4444' } : undefined} />
              {errorText('title')}
            </div>
            <div className="modal-field">
              <label>Category</label>
              {' '}
              <select id="editCategory" value={edit.category} onChange={setEditField('category')} disabled={!editingTask || !editable(editingTask) || editingTask.status === 'draft'}>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="modal-field">
              <label>Budget (₹)</label>
              {' '}
              <input type="text" id="editBudget" value={editingTask ? '₹' + Number(editingTask.budget || 0).toLocaleString('en-IN') : ''} disabled readOnly />
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>
                The budget is fixed once a project is posted. To use a different budget, delete this project and post it again.
              </div>
            </div>
            <div className="modal-field">
              <label>Deadline</label>
              {' '}
              <input type="date" id="editDeadline" value={edit.deadline} onChange={setEditField('deadline')} />
            </div>
            <div className="modal-field">
              <label>Status</label>
              {' '}
              <select id="editStatus" value={edit.status} disabled>
                <option value={editingTask ? editingTask.status : 'open'}>{editingTask ? editingTask.status.replace(/-/g, ' ') : 'Open'}</option>
              </select>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>
                Status follows the work — it starts when you hire and completes when the last milestone is settled.
                {editingTask && editingTask.status === 'open' && !editingTask.workerId ? ' To cancel before anyone is hired, use Cancel on the project card.' : ''}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel-modal" onClick={closeEditModal}>Cancel</button>
              <button className="btn-save-modal" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
