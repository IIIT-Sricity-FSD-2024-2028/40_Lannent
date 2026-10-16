/**
 * LANNENT — SuperuserTasks (Manage Tasks)
 * Converted from front-end/pages/superuser-tasks.html.
 *
 * Every task on the platform, searchable and filterable by status. A task
 * can be viewed in a read-only dialog; a project that never started (open,
 * draft or cancelled, no worker hired) can be deleted — whatever it still
 * holds in escrow goes back to the client.
 */
import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import PageStyle from '../components/PageStyle';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useRerender from '../hooks/useRerender';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './SuperuserTasks.css?raw';

const STATUS_BADGES = { 'open': 'badge-orange', 'in-progress': 'badge-blue', 'completed': 'badge-green', 'cancelled': 'badge-red', 'draft': 'badge-blue' };

const DELETABLE = ['open', 'draft', 'cancelled'];
const canDelete = t => DELETABLE.includes(t.status) && !t.workerId;

/** Share of the project's milestones that are approved. */
function progressOf(Store, t) {
  const ms = Store.getMilestonesByTask(t.id);
  if (!ms.length) return t.status === 'completed' ? 100 : 0;
  return Math.round((ms.filter(m => ['completed', 'approved'].includes(m.status)).length / ms.length) * 100);
}

function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_BADGES[status] || 'badge-blue'}`}>{status.replace(/-/g, ' ')}</span>;
}

// Shared look of the read-only fields in the details dialog
const FIELD_STYLE = { padding: '10px 14px', background: 'var(--secondary)', borderRadius: 10, fontSize: 14 };

/** One labelled read-only field of the details dialog. */
function DetailField({ label, id, style, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={style || FIELD_STYLE} id={id}>{children}</div>
    </div>
  );
}

export default function SuperuserTasks() {
  const Store = useStore();
  const Validate = useValidation();
  usePageTitle('Manage Tasks — Lannent');
  const rerender = useRerender();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailTask, setDetailTask] = useState(null);   // last task shown in the dialog
  const [detailOpen, setDetailOpen] = useState(false);

  const q = search.trim().toLowerCase();
  const filtered = Store.getTasks().filter(t => {
    const matchSearch = !q || [t.title, t.category, Store.getUserById(t.clientId)?.name].some(v => String(v || '').toLowerCase().includes(q));
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function viewTaskDetails(id) {
    const task = Store.getTaskById(id);
    if (!task) return;
    setDetailTask(task);
    setDetailOpen(true);
  }

  function deleteTask(id) {
    const task = Store.getTaskById(id);
    if (!task) return;
    if (!canDelete(task)) {
      Validate.toast('Only a project that never started (no worker hired) can be deleted.', 'error');
      return;
    }
    Validate.confirm(
      `Permanently delete "${task.title}"? Anything still held in its escrow is returned to the client's wallet. This cannot be undone.`,
      () => {
        // The server refunds the project's escrow (budget held since posting,
        // and any reviewer fees) to the client before removing it.
        try {
          Store.deleteTask(id);
        } catch (e) {
          Validate.toast((e.message), 'error');
          return;
        }
        rerender();
        Validate.toast('Task deleted and its escrow returned to the client.', 'success');
      }
    );
  }

  // Values shown in the details dialog ("—" until a task has been opened)
  const d = detailTask;
  const dClient = d ? Store.getUserById(d.clientId) : null;
  const dWorker = d && d.workerId ? Store.getUserById(d.workerId) : null;

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="superuser" activePath="/superuser-tasks" pageTitle="Manage Tasks" pageSubtitle="View task details or delete tasks on the platform">
        <div className="su-toolbar">
          <input className="su-search" id="taskSearch" placeholder="Search by title, category or client..." value={search} onChange={e => setSearch(e.target.value)} />
          {' '}
          <select className="su-filter" id="statusFilter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--muted-foreground)' }}>
          Showing <strong id="taskCount">{filtered.length + ' task' + (filtered.length !== 1 ? 's' : '')}</strong>
        </div>

        <div className="task-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Client</th>
                <th>Worker</th>
                <th>Budget</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="tasksTableBody">
              {!filtered.length ? (
                <tr className="empty-row"><td colSpan="7">No tasks found.</td></tr>
              ) : filtered.map(t => {
                const client = Store.getUserById(t.clientId);
                const worker = t.workerId ? Store.getUserById(t.workerId) : null;
                const progress = progressOf(Store, t);
                return (
                  <tr key={t.id} id={`taskRow_${t.id}`}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, maxWidth: 180 }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{t.category}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{client?.name || 'Unknown'}</td>
                    <td style={{ fontSize: 13 }}>{worker?.name || <span style={{ color: 'var(--muted-foreground)' }}>Unassigned</span>}</td>
                    <td style={{ fontWeight: 600 }}>{`₹${(Number(t.budget) || 0).toLocaleString('en-IN')}`}</td>
                    <td>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
                      <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{`${progress}%`}</span>
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-edit" onClick={() => viewTaskDetails(t.id)}>View</button>
                        {canDelete(t) ? <button className="btn-delete" onClick={() => deleteTask(t.id)}>Delete</button> : ''}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* View Detail Modal (read-only) */}
        <div className={'modal-overlay' + (detailOpen ? ' open' : '')} id="taskDetailModal"
             onClick={e => { if (e.target.id === 'taskDetailModal') setDetailOpen(false); }}>
          <div className="modal">
            <p className="modal-title" id="detailTitle">{d ? d.title : 'Task Details'}</p>
            <p className="modal-sub">Read-only view of task information.</p>
            <div className="grid-2">
              <DetailField label="Category" id="detailCategory">{d ? d.category || '—' : '—'}</DetailField>
              <DetailField label="Status" id="detailStatus" style={{ padding: '10px 14px' }}>{d ? <StatusBadge status={d.status} /> : '—'}</DetailField>
            </div>
            <div className="grid-2">
              <DetailField label="Budget" id="detailBudget" style={{ ...FIELD_STYLE, fontWeight: 600 }}>{d ? '₹' + (Number(d.budget) || 0).toLocaleString('en-IN') : '—'}</DetailField>
              <DetailField label="Deadline" id="detailDeadline">{d ? d.deadline || '—' : '—'}</DetailField>
            </div>
            <div className="grid-2">
              <DetailField label="Client" id="detailClient">{d ? (dClient ? dClient.name : 'Unknown') : '—'}</DetailField>
              <DetailField label="Worker" id="detailWorker">{d ? (dWorker ? dWorker.name : 'Unassigned') : '—'}</DetailField>
            </div>
            <div className="grid-2">
              <DetailField label="Progress" id="detailProgress">{d ? progressOf(Store, d) + '%' : '—'}</DetailField>
              <DetailField label="Created" id="detailCreated">{d ? d.createdAt || '—' : '—'}</DetailField>
            </div>
            <DetailField label="Description" id="detailDesc" style={{ ...FIELD_STYLE, lineHeight: 1.6, maxHeight: 120, overflowY: 'auto' }}>
              {d ? d.description || 'No description provided.' : '—'}
            </DetailField>
            <div className="modal-actions">
              <button className="btn-cancel-modal" onClick={() => setDetailOpen(false)} style={{ flex: 1 }}>Close</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
