/**
 * LANNENT — SuperuserUsers (Manage Users)
 * Converted from front-end/pages/superuser-users.html.
 *
 * Every user account, searchable and filterable by role. The super user can
 * add, edit, suspend / activate and delete accounts.
 */
import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import FieldError from '../components/FieldError';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useFieldErrors from '../hooks/useFieldErrors';
import useRerender from '../hooks/useRerender';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './SuperuserUsers.css?raw';

const ROLE_OPTIONS = [
  ['client', 'Client'], ['worker', 'Worker'], ['expert', 'Expert'], ['superuser', 'Super User'],
  ['revenue-admin', 'Revenue Admin'], ['intake-admin', 'Intake Admin'], ['compliance-admin', 'Compliance Admin'],
];
// Expert Reviewers join through the intake desk's application review, which
// records the domains they cover — an account made here would have none and
// could never be offered to a client.
// A second Super User could never be suspended or removed, so none is made here.
const CREATE_ROLE_OPTIONS = ROLE_OPTIONS.filter(([value]) => value !== 'expert' && value !== 'superuser');
const ROLE_BADGES = { client: 'badge-blue', worker: 'badge-green', expert: 'badge-purple', superuser: 'badge-red', 'revenue-admin': 'badge-orange', 'intake-admin': 'badge-blue', 'compliance-admin': 'badge-purple' };
const ROLE_COLORS = { client: 'linear-gradient(135deg,#6366f1,#4f46e5)', worker: 'linear-gradient(135deg,#10b981,#059669)', expert: 'linear-gradient(135deg,#a855f7,#7c3aed)', superuser: 'linear-gradient(135deg,#ef4444,#dc2626)', 'revenue-admin': 'linear-gradient(135deg,#f97316,#ea580c)', 'intake-admin': 'linear-gradient(135deg,#3b82f6,#2563eb)', 'compliance-admin': 'linear-gradient(135deg,#8b5cf6,#7c3aed)' };

const EMPTY_FORM = { name: '', email: '', password: '', role: '', status: 'active' };

export default function SuperuserUsers() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Manage Users — Lannent');
  const rerender = useRerender();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  // After "Delete" the row fades out for 300ms before the table redraws, so the
  // rows as they were are kept on screen meanwhile (the Store already dropped it).
  const [fadingId, setFadingId] = useState(null);
  const [frozenRows, setFrozenRows] = useState(null);

  // Add / edit dialog
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [modalText, setModalText] = useState({ title: 'Add User', sub: 'Create a new user account.', button: 'Save' });
  const [form, setForm] = useState(EMPTY_FORM);
  const { errors, showError, clearError, clearAllErrors, validateForm, errorStyle } = useFieldErrors();

  const q = search.toLowerCase();
  const filtered = Store.getUsers().filter(u => {
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const setField = (key, fieldId) => e => { setForm(f => ({ ...f, [key]: e.target.value })); if (fieldId) clearError(fieldId); };

  function openAddModal() {
    setEditingUserId(null);
    setModalText({ title: 'Add New User', sub: 'Create a new user account on the platform.', button: 'Create User' });
    setForm(EMPTY_FORM);
    clearAllErrors();
    setModalOpen(true);
  }

  function openEditModal(id) {
    const user = Store.getUserById(id);
    if (!user) return;
    setEditingUserId(id);
    setModalText({ title: 'Edit User', sub: 'Update details for ' + user.name, button: 'Save Changes' });
    setForm({ name: user.name, email: user.email, password: '', role: user.role, status: user.status });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUserId(null);
    clearAllErrors();
  }

  function saveUser() {
    const name = form.name.trim();
    const email = form.email.trim();
    const { password, role, status } = form;

    const rules = [
      { fieldId: 'mName', value: name, checks: [v => Validate.required(v, 'Name'), v => Validate.minLength(v, 2, 'Name')] },
      { fieldId: 'mEmail', value: email, checks: [Validate.email] },
      { fieldId: 'mRole', value: role, checks: [v => Validate.selected(v, 'role')] },
    ];
    if (!editingUserId) {
      rules.push({ fieldId: 'mPassword', value: password, checks: [Validate.password] });
    }
    const { valid } = validateForm(rules);
    if (!valid) return;

    // Check email uniqueness
    const existing = Store.getUserByEmail(email);
    if (existing && existing.id !== editingUserId) {
      showError('mEmail', 'This email is already in use.');
      return;
    }

    try {
      if (editingUserId) {
        // A role is fixed when the account is made; everything else here is saved.
        Store.updateUser(editingUserId, { name, email, status });
        Validate.toast('User updated.', 'success');
      } else {
        const created = Store.createUser({ name, email, password, role, avatarColor: ROLE_COLORS[role] || '' });
        if (status === 'suspended') Store.updateUser(created.id, { status });
        Validate.toast('Account created. Give its owner the temporary password — they must choose their own when they first sign in.', 'success');
      }
    } catch (e) {
      Validate.toast((e.message), 'error');
      return;
    }
    closeModal();
    rerender();
  }

  function toggleSuspend(id) {
    const user = Store.getUserById(id);
    if (!user) return;
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    Validate.confirm(
      `Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} ${user.name}?`,
      () => {
        try {
          Store.updateUser(id, { status: newStatus });
        } catch (e) {
          Validate.toast((e.message), 'error');
          return;
        }
        rerender();
        Validate.toast(`User ${newStatus === 'suspended' ? 'suspended' : 'activated'}.`, newStatus === 'suspended' ? 'warning' : 'success');
      }
    );
  }

  function deleteUser(id) {
    const user = Store.getUserById(id);
    if (!user) return;
    const session = Auth.getCurrentUser();
    if (session && session.userId === id) { Validate.toast('You cannot delete your own account.', 'error'); return; }

    Validate.confirm(
      `Permanently delete ${user.name}? This action cannot be undone.`,
      () => {
        try {
          Store.deleteUser(id);
        } catch (e) {
          Validate.toast((e.message), 'error');
          return;
        }
        setFrozenRows(filtered);
        setFadingId(id);
        setTimeout(() => { setFadingId(null); setFrozenRows(null); }, 300);
        Validate.toast('User deleted.', 'error');
      }
    );
  }

  const rows = frozenRows || filtered;

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="superuser" activePath="/superuser-users" pageTitle="Manage Users" pageSubtitle="Add, edit, suspend or delete platform users">
        <div className="su-toolbar">
          <input className="su-search" id="userSearch" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          {' '}
          <select className="su-filter" id="roleFilter" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {' '}
          <button className="btn-add" onClick={openAddModal}>
            <Icon name="plus" style={{ width: 16, height: 16 }} /> Add User
          </button>
        </div>

        <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--muted-foreground)' }}>
          Showing <strong id="userCount">{rows.length + ' user' + (rows.length !== 1 ? 's' : '')}</strong>
        </div>

        <div className="user-table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Wallet</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="usersTableBody">
              {!rows.length ? (
                <tr className="empty-row"><td colSpan="6">No users found.</td></tr>
              ) : rows.map(u => (
                <tr key={u.id} id={`userRow_${u.id}`} style={fadingId === u.id ? { opacity: 0, transition: 'opacity 0.3s' } : undefined}>
                  <td>
                    <div className="worker-cell">
                      <div className="worker-avatar" style={u.avatarColor ? { background: u.avatarColor } : undefined}>{u.avatar}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${ROLE_BADGES[u.role] || 'badge-blue'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>{u.status}</span></td>
                  <td style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>{u.joinDate}</td>
                  <td style={{ fontWeight: 600 }}>{`₹${(u.walletBalance || 0).toLocaleString('en-IN')}`}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-edit" onClick={() => openEditModal(u.id)}>Edit</button>
                      {/* Operations accounts (including your own) cannot be suspended or deleted. */}
                      {u.role !== 'superuser' && <>
                        <button className="btn-suspend" onClick={() => toggleSuspend(u.id)}>{u.status === 'active' ? 'Suspend' : 'Activate'}</button>
                        <button className="btn-delete" onClick={() => deleteUser(u.id)}>Delete</button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        <div className={'modal-overlay' + (modalOpen ? ' open' : '')} id="userModal" onClick={e => { if (e.target.id === 'userModal') closeModal(); }}>
          <div className="modal">
            <p className="modal-title" id="modalTitle">{modalText.title}</p>
            <p className="modal-sub" id="modalSub">{modalText.sub}</p>
            <div className="form-group">
              <label className="form-label">Full Name <span className="req">*</span></label>
              {' '}
              <input className="form-input" id="mName" placeholder="e.g. Jane Smith" value={form.name} onChange={setField('name', 'mName')} style={errorStyle('mName')} />
              <FieldError id="mName" message={errors.mName} />
            </div>
            <div className="form-group">
              <label className="form-label">Email <span className="req">*</span></label>
              {' '}
              <input className="form-input" id="mEmail" type="email" placeholder="user@example.com" value={form.email} onChange={setField('email', 'mEmail')} style={errorStyle('mEmail')} />
              <FieldError id="mEmail" message={errors.mEmail} />
            </div>
            {/* Passwords belong to their owners. A new account gets a temporary
                one that its owner must replace at first sign-in; nobody can set
                an existing person's password from here. */}
            {!editingUserId && (
              <div className="form-group">
                <label className="form-label">Temporary password <span className="req" id="pwRequired">*</span></label>
                {' '}
                <input className="form-input" id="mPassword" type="password" placeholder="At least 8 characters with A-z, 0-9 and a symbol" value={form.password} onChange={setField('password', 'mPassword')} style={errorStyle('mPassword')} />
                <FieldError id="mPassword" message={errors.mPassword} />
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>
                  The new owner must replace it before they can use the account. The account is recorded as created by you.
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Role <span className="req">*</span></label>
              {' '}
              <select className="form-select" id="mRole" value={form.role} onChange={setField('role', 'mRole')} style={errorStyle('mRole')} disabled={!!editingUserId}>
                <option value="">Select role</option>
                {(editingUserId ? ROLE_OPTIONS : CREATE_ROLE_OPTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {!editingUserId ? <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>Expert Reviewers join through an application reviewed by the intake desk.</div> : null}
              <FieldError id="mRole" message={errors.mRole} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              {' '}
              <select className="form-select" id="mStatus" value={form.status} onChange={setField('status')}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel-modal" onClick={closeModal}>Cancel</button>
              <button className="btn-save-modal" id="saveModalBtn" onClick={saveUser}>{modalText.button}</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
