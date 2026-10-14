/**
 * LANNENT — SuperuserCreateTask
 * Converted from front-end/pages/superuser-create-task.html.
 *
 * The superuser is no longer permitted to create tasks, so — exactly like the
 * original page — this route always redirects:
 *   signed out → login
 *   superuser  → superuser dashboard
 *   anyone else → their own dashboard
 * The create-task form below (CreateTaskForm) is kept, converted, for reference
 * but is never reached.
 */
import { Fragment, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './SuperuserCreateTask.css?raw';

const CATEGORIES = ['Web Development', 'Mobile Development', 'Backend / API', 'UI/UX Design', 'AI / Machine Learning', 'DevOps / Cloud'];
const EMPTY_MILESTONE = { title: '', description: '', budget: '', deadline: '' };
const NO_ERRORS = { mTitle: '', mDesc: '', mBudget: '', mDeadline: '' };

export default function SuperuserCreateTask() {
  const Auth = useAuth();
  usePageTitle('Create Task — Super User — Lannent');
  // Superuser is no longer permitted to create tasks — redirect to dashboard.
  const session = Auth.getCurrentUser();
  if (!session) return <Navigate to="/login" />;
  if (session.role === 'superuser') return <Navigate to="/superuser-dashboard" />;
  return <Navigate to={Auth.getDashboardUrl(session.role)} />;
}

/** One required-field label. */
function Label({ children, required = true }) {
  // Text and trailing space stay one text node, as in the original markup
  return <label className="form-label">{required ? children + ' ' : children}{required ? <span className="required">*</span> : null}</label>;
}

/** One row of the sidebar "Task Summary" card. */
function SummaryItem({ kind, icon, label, id, value }) {
  return (
    <div className={'summary-item ' + kind}>
      <div className={'summary-label ' + kind}>
        <Icon name={icon} style={{ width: 14, height: 14 }} /> {label}
      </div>
      <div className={'summary-value ' + kind} id={id}>{value}</div>
    </div>
  );
}

/** Real-time budget status with progress bar (renderBudgetCheck in the original). */
function BudgetCheck({ currency, milestoneCost, totalBudget, milestoneCount }) {
  // No milestones or no budget yet
  if (totalBudget <= 0 && milestoneCount === 0) return null;

  const diff = totalBudget - milestoneCost;
  const pct = totalBudget > 0 ? Math.min((milestoneCost / totalBudget) * 100, 100) : 0;
  const exceeded = milestoneCost > totalBudget;
  const matched = milestoneCost === totalBudget && totalBudget > 0;

  const barClass = matched ? 'ok' : exceeded ? 'over' : 'warn';
  const boxClass = matched ? 'ok' : exceeded ? 'exceeded' : 'warn';

  let icon, message;
  if (matched) {
    icon = 'check-circle'; message = 'Budget is perfectly allocated across milestones.';
  } else if (exceeded) {
    icon = 'alert-triangle'; message = `Milestone costs exceed total budget by ${currency} ${(milestoneCost - totalBudget).toLocaleString()}.`;
  } else {
    icon = 'info'; message = `${currency} ${diff.toLocaleString()} remaining to allocate.`;
  }

  return (
    <div className={`budget-check ${boxClass}`}>
      <div className="budget-bar"><div className={`budget-bar-fill ${barClass}`} style={{ width: `${Math.min(pct, 100)}%` }}></div></div>
      <div className="budget-check-item">
        <span>Milestone total</span>
        {' '}
        <strong>{`${currency} ${milestoneCost.toLocaleString()}`}</strong>
      </div>
      <div className="budget-check-item">
        <span>Project Budget</span>
        {' '}
        <strong>{`${currency} ${totalBudget.toLocaleString()}`}</strong>
      </div>
      <div className="budget-check-item budget-check-divider">
        <span>{matched ? '✓ Fully allocated' : exceeded ? '✗ Over budget' : 'Remaining'}</span>
        {' '}
        <strong>{`${currency} ${Math.abs(diff).toLocaleString()}`}</strong>
      </div>
      <div className="budget-check-warning">
        <Icon name={icon} style={{ width: 14, height: 14 }} />
        <p>{message}</p>
      </div>
    </div>
  );
}

/** The original create-task form (never reached — see the note at the top). */
export function CreateTaskForm() {
  const Store = useStore();
  const Validate = useValidation();
  const navigate = useNavigate();
  const [clients] = useState(() => Store.getUsers().filter(u => u.role === 'client'));

  // ── Form state ──
  const [taskTitle, setTaskTitle] = useState('');
  const [category, setCategory] = useState('Web Development');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [clientId, setClientId] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState(EMPTY_MILESTONE);
  const [editingIndex, setEditingIndex] = useState(null);
  const [msErrors, setMsErrors] = useState(NO_ERRORS);
  // The milestone cards only picked up a currency change when the list was
  // next re-rendered (add / remove / edit / cancel) — kept that way.
  const [cardCurrency, setCardCurrency] = useState('USD');
  const [publishState, setPublishState] = useState('idle');  // idle | publishing | done

  /** Every list re-render rebuilt the inline form, which cleared its errors. */
  const refreshMilestones = () => { setMsErrors(NO_ERRORS); setCardCurrency(currency); };

  // ── Budget helpers ──
  const milestoneCost = milestones.reduce((sum, m) => sum + (parseFloat(m.budget) || 0), 0);
  const totalBudget = parseFloat(budget) || 0;
  const budgetOk = totalBudget > 0 && milestoneCost === totalBudget;
  const summaryBudget = parseFloat(budget || 0);

  const ready = taskTitle.trim().length >= 5 && description.trim().length >= 10 &&
                parseFloat(budget) > 0 && deadline && clientId && milestones.length > 0 && budgetOk;

  // ── Milestone actions ──
  const updateNew = (field, errKey) => e => {
    const value = e.target.value;
    setNewMilestone(nm => ({ ...nm, [field]: value }));
    setMsErrors(errs => ({ ...errs, [errKey]: '' }));
  };

  /** addMilestone – validates and adds to state */
  const addMilestone = () => {
    const nm = newMilestone;
    const errs = { ...NO_ERRORS };
    const budgetVal = parseFloat(nm.budget);

    if (!nm.title || nm.title.trim().length < 3) errs.mTitle = 'Title must be ≥ 3 characters';
    if (!nm.description || nm.description.trim().length < 5) errs.mDesc = 'Description is required';
    if (!nm.budget || budgetVal <= 0) errs.mBudget = 'Must be greater than 0';
    else if (totalBudget > 0 && budgetVal > totalBudget) errs.mBudget = 'Cannot exceed total budget';
    if (!nm.deadline) errs.mDeadline = 'Deadline is required';
    else if (deadline && nm.deadline > deadline) errs.mDeadline = `Must be on or before project deadline (${deadline})`;

    if (Object.values(errs).some(Boolean)) { setMsErrors(errs); return; }

    // Save
    if (editingIndex !== null) {
      setMilestones(list => list.map((m, i) => i === editingIndex ? { ...nm } : m));
      setEditingIndex(null);
    } else {
      setMilestones(list => [...list, { ...nm }]);
    }
    setNewMilestone(EMPTY_MILESTONE);
    setShowMilestoneForm(false);
    refreshMilestones();
  };

  const removeMilestone = idx => {
    setMilestones(list => list.filter((_, i) => i !== idx));
    refreshMilestones();
  };

  const editMilestone = idx => {
    setEditingIndex(idx);
    setNewMilestone({ ...milestones[idx] });
    setShowMilestoneForm(true);
    refreshMilestones();
  };

  const cancelMilestone = () => {
    setShowMilestoneForm(false);
    setEditingIndex(null);
    setNewMilestone(EMPTY_MILESTONE);
    refreshMilestones();
  };

  // ── Submit ──
  const validateTaskForm = () => {
    let valid = true;
    const title = taskTitle.trim();
    const desc = description.trim();
    if (!title || title.length < 5) { Validate.toast('Task title must be at least 5 characters.', 'error'); valid = false; }
    if (!desc || desc.length < 10) { Validate.toast('Description must be at least 10 characters.', 'error'); valid = false; }
    if (!budget || parseFloat(budget) <= 0) { Validate.toast('Please enter a valid budget.', 'error'); valid = false; }
    if (!deadline) { Validate.toast('Please set a project deadline.', 'error'); valid = false; }
    if (!clientId) { Validate.toast('Please select a client.', 'error'); valid = false; }
    if (milestones.length === 0) { Validate.toast('Add at least one milestone before posting.', 'error'); valid = false; }
    if (!budgetOk && milestones.length > 0) { Validate.toast('Total milestone budgets must exactly equal the task budget.', 'error'); valid = false; }
    return valid;
  };

  const handleTaskSubmit = () => {
    if (!validateTaskForm()) return;
    setPublishState('publishing');

    setTimeout(() => {
      const task = Store.createTask({
        title: taskTitle,
        category,
        description: description.trim(),
        skills: [],
        deadline,
        budget: parseFloat(budget),
        currency,
        auditEnabled: false,
        clientId,
        status: 'open',
      });
      milestones.forEach(m => {
        Store.createMilestone({ taskId: task.id, title: m.title, description: m.description, budget: parseFloat(m.budget), deadline: m.deadline, workerId: null });
      });
      Validate.toast('Task created and assigned to client successfully!', 'success');
      setPublishState('done');
      setTimeout(() => { navigate('/superuser-tasks'); }, 1200);
    }, 800);
  };

  const saveDraft = () => {
    if (!taskTitle.trim()) { Validate.toast('Enter a task title to save draft.', 'error'); return; }
    Validate.toast('Draft saved successfully.', 'info');
  };

  const clientName = clientId ? (Store.getUserById(clientId)?.name || 'Unknown') : 'Not selected';
  const editing = editingIndex !== null;

  /** One input of the inline milestone form, with its error line. */
  const msField = (errKey, input) => (
    <>
      {input}
      <div className={'field-error' + (msErrors[errKey] ? ' show' : '')} id={errKey + 'Err'}>{msErrors[errKey]}</div>
    </>
  );

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="superuser" activePath="/superuser-create-task" pageTitle="Create Task" pageSubtitle="Create and assign a new task to a client">
        {/* The template's own <style> (@keyframes spin) lives in SuperuserCreateTask.css */}
        <div className="post-container">
          <div>
            {/* Basic Info */}
            <div className="section-card">
              <h2><Icon name="file-text" style={{ width: 18, height: 18 }} /> Basic Information</h2>
              <div className="form-group">
                <Label>Task Title</Label>
                <input type="text" className="form-input" id="taskTitle" placeholder="e.g. E-commerce Website Redesign" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <Label required={false}>Category</Label>
                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <Label>Description</Label>
                <textarea className="form-textarea" rows="5" id="taskDesc" placeholder="Describe what you need done, goals, and requirements..." value={description} onChange={e => setDescription(e.target.value)}></textarea>
              </div>
            </div>

            {/* Client Assignment */}
            <div className="section-card">
              <h2><Icon name="user-check" style={{ width: 18, height: 18 }} /> Assign to Client</h2>
              <div className="form-group">
                <Label>Select Client</Label>
                <select className="form-select" id="clientSelect" value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">— Select a client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{`${c.name} — ${c.email}`}</option>)}
                </select>
              </div>
            </div>

            {/* Budget & Deadline */}
            <div className="section-card">
              <h2><Icon name="wallet" style={{ width: 18, height: 18 }} /> Budget & Deadline</h2>
              <div className="grid-2">
                <div className="form-group">
                  <Label>Total Budget</Label>
                  <div style={{ position: 'relative' }}>
                    <Icon name="dollar-sign" className="input-icon" />
                    <input type="number" className="form-input with-icon" id="taskBudget" placeholder="5000" min="1" onChange={e => setBudget(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <Label required={false}>Currency</Label>
                  <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <Label>Project Deadline</Label>
                <input type="date" className="form-input" id="taskDeadline" onChange={e => setDeadline(e.target.value)} />
              </div>
              <div id="budgetCheckContainer">
                <BudgetCheck currency={currency} milestoneCost={milestoneCost} totalBudget={totalBudget} milestoneCount={milestones.length} />
              </div>
            </div>

            {/* Milestones */}
            <div className="section-card">
              <h2><Icon name="milestone" style={{ width: 18, height: 18 }} /> Milestones</h2>
              <div id="milestonesContainer">
                {!showMilestoneForm && milestones.length === 0 ? (
                  <div className="empty-state">
                    <Icon name="milestone" style={{ width: 48, height: 48 }} />
                    <p>No milestones yet. Add at least one to post the task.</p>
                  </div>
                ) : null}

                {/* Milestone inline form */}
                {showMilestoneForm ? (
                  <div className="milestone-form">
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name={editing ? 'pencil' : 'plus-circle'} style={{ width: 16, height: 16, color: '#0369a1' }} />
                      {`${editing ? 'Edit' : 'Add'} Milestone`}
                    </div>
                    <div className="form-group">
                      <Label>Milestone Title</Label>
                      {msField('mTitle', <input type="text" className={'form-input' + (msErrors.mTitle ? ' has-error' : '')} id="mTitle" value={newMilestone.title} onChange={updateNew('title', 'mTitle')} placeholder="e.g. Design Phase" />)}
                    </div>
                    <div className="form-group">
                      <Label>Description</Label>
                      {msField('mDesc', <textarea className={'form-input' + (msErrors.mDesc ? ' has-error' : '')} id="mDesc" rows="3" value={newMilestone.description} onChange={updateNew('description', 'mDesc')} placeholder="What's the deliverable?"></textarea>)}
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <Label>Budget</Label>
                        {msField('mBudget', <input type="number" className={'form-input' + (msErrors.mBudget ? ' has-error' : '')} id="mBudget" value={newMilestone.budget} onChange={updateNew('budget', 'mBudget')} placeholder="Amount" min="1" />)}
                      </div>
                      <div className="form-group">
                        <Label>Deadline</Label>
                        {msField('mDeadline', <input type="date" className={'form-input' + (msErrors.mDeadline ? ' has-error' : '')} id="mDeadline" value={newMilestone.deadline} onChange={updateNew('deadline', 'mDeadline')} />)}
                      </div>
                    </div>
                    <div className="milestone-form-actions">
                      <button className="save" type="button" onClick={addMilestone}>
                        <Icon name="check" style={{ width: 14, height: 14, display: 'inline' }} />{` ${editing ? 'Update' : 'Save'} Milestone`}
                      </button>
                      {' '}
                      <button className="cancel" type="button" onClick={cancelMilestone}>Cancel</button>
                    </div>
                  </div>
                ) : null}

                {/* Existing milestones */}
                {milestones.map((m, idx) => (
                  <div className="milestone-card" style={{ animationDelay: `${idx * 0.05}s` }} key={idx}>
                    <div className="milestone-content">
                      <div className="milestone-title">
                        <div className="milestone-index">{idx + 1}</div>
                        <h3>{m.title}</h3>
                      </div>
                      {/* The fallback markup was escaped in the original, so it would show as text */}
                      <div className="milestone-desc">{m.description || '<em style="opacity:0.5;">No description</em>'}</div>
                      <div className="milestone-meta">
                        <span className="milestone-budget">
                          <Icon name="dollar-sign" style={{ width: 14, height: 14 }} />
                          {`${cardCurrency} ${parseFloat(m.budget).toLocaleString()}`}
                        </span>
                        {' '}
                        <span className="milestone-deadline">
                          <Icon name="calendar" style={{ width: 13, height: 13 }} />
                          {m.deadline || 'No deadline'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="milestone-delete" type="button" title="Edit" onClick={() => editMilestone(idx)}>
                        <Icon name="pencil" style={{ width: 14, height: 14 }} />
                      </button>
                      <button className="milestone-delete" type="button" title="Remove" onClick={() => removeMilestone(idx)}>
                        <Icon name="x" style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="add-milestone-btn" id="addMilestoneBtn" type="button" style={showMilestoneForm ? { display: 'none' } : undefined}
                      onClick={() => { setShowMilestoneForm(true); refreshMilestones(); }}>
                <Icon name="plus" style={{ width: 16, height: 16 }} /> Add Milestone
              </button>
            </div>

            {/* Actions */}
            <div className="action-buttons">
              <button type="button" className="save-draft" onClick={saveDraft}>
                <Icon name="save" style={{ width: 16, height: 16 }} /> Save Draft
              </button>
              {' '}
              <button type="button" className="publish" id="publishBtn" disabled={!ready || publishState !== 'idle'} onClick={handleTaskSubmit}>
                {publishState === 'idle' ? <Fragment><Icon name="send" style={{ width: 16, height: 16 }} /> Post Task</Fragment> : null}
                {publishState === 'publishing' ? <Fragment><div className="btn-spinner" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div> Publishing...</Fragment> : null}
                {publishState === 'done' ? <Fragment><Icon name="check" style={{ width: 16, height: 16 }} /> Published!</Fragment> : null}
              </button>
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="post-sidebar">
            <div className="sidebar-card">
              <h3>Task Summary</h3>
              <SummaryItem kind="budget" icon="dollar-sign" label="Budget" id="sumBudget" value={`${currency} ${isNaN(summaryBudget) ? 0 : summaryBudget.toLocaleString()}`} />
              <SummaryItem kind="milestones" icon="milestone" label="Milestones" id="sumMilestones" value={milestones.length} />
              <SummaryItem kind="deadline" icon="calendar" label="Deadline" id="sumDeadline" value={deadline ? deadline : 'Not set'} />
              <SummaryItem kind="client" icon="user" label="Assigned Client" id="sumClient" value={clientName} />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
