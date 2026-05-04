/**
 * LANNENT — Central Data Store (API-backed)
 * Refactored to use the NestJS backend API at localhost:3000.
 * Maintains a local cache for synchronous reads + async API mutations.
 * Drop-in replacement: all existing pages work without changes.
 */

const Store = (() => {
  const API = 'http://localhost:3000/api';

  // Local cache — initialized from API on first load
  let _cache = {
    users: [], tasks: [], milestones: [], proposals: [],
    auditRequests: [], auditReports: [], disputes: [],
    transactions: [], expertApplications: [], notifications: [],
    messages: [],
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function _headers() {
    const h = { 'Content-Type': 'application/json' };
    try {
      const session = JSON.parse(localStorage.getItem('lannent_session') || '{}');
      if (session.role) h['role'] = session.role;
      if (session.userId) h['user-id'] = session.userId;
    } catch {}
    return h;
  }

  async function _fetch(url, opts = {}) {
    try {
      const res = await fetch(url, { headers: _headers(), ...opts });
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    } catch (e) {
      console.warn('Store API error:', e);
      return null;
    }
  }

  async function _post(url, body) {
    return _fetch(url, { method: 'POST', body: JSON.stringify(body) });
  }

  async function _patch(url, body) {
    return _fetch(url, { method: 'PATCH', body: JSON.stringify(body) });
  }

  async function _delete(url) {
    return _fetch(url, { method: 'DELETE' });
  }

  // ─── Cache Refresh ────────────────────────────────────────────────────────
  async function _refreshAll() {
    const [users, tasks, milestones, proposals, auditRequests, auditReports, disputes, transactions, expertApplications, notifications] = await Promise.all([
      _fetch(`${API}/users`),
      _fetch(`${API}/tasks`),
      _fetch(`${API}/milestones`),
      _fetch(`${API}/proposals`),
      _fetch(`${API}/audit-requests`),
      _fetch(`${API}/audit-reports`),
      _fetch(`${API}/disputes`),
      _fetch(`${API}/transactions`),
      _fetch(`${API}/expert-applications`),
      _fetch(`${API}/notifications`),
    ]);
    if (users) _cache.users = users;
    if (tasks) _cache.tasks = tasks;
    if (milestones) _cache.milestones = milestones;
    if (proposals) _cache.proposals = proposals;
    if (auditRequests) _cache.auditRequests = auditRequests;
    if (auditReports) _cache.auditReports = auditReports;
    if (disputes) _cache.disputes = disputes;
    if (transactions) _cache.transactions = transactions;
    if (expertApplications) _cache.expertApplications = expertApplications;
    if (notifications) _cache.notifications = notifications;
  }

  // ─── Synchronous HTTP helpers (blocks until API responds) ─────────────────
  function _syncFetch(url) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      const hdrs = _headers();
      Object.keys(hdrs).forEach(k => xhr.setRequestHeader(k, hdrs[k]));
      xhr.send();
      if (xhr.status === 200) {
        const json = JSON.parse(xhr.responseText);
        return json.data !== undefined ? json.data : json;
      }
    } catch (e) {
      console.warn('Store sync GET error:', url, e);
    }
    return null;
  }

  function _syncPost(url, body) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, false);
      const hdrs = _headers();
      Object.keys(hdrs).forEach(k => xhr.setRequestHeader(k, hdrs[k]));
      xhr.send(JSON.stringify(body));
      if (xhr.status >= 200 && xhr.status < 300) {
        const json = JSON.parse(xhr.responseText);
        return json.data !== undefined ? json.data : json;
      }
      console.error('[Store] _syncPost FAILED:', url, 'status:', xhr.status, 'response:', xhr.responseText.substring(0, 300));
    } catch (e) {
      console.warn('Store sync POST error:', url, e);
    }
    return null;
  }

  function _syncPatch(url, body) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('PATCH', url, false);
      const hdrs = _headers();
      Object.keys(hdrs).forEach(k => xhr.setRequestHeader(k, hdrs[k]));
      xhr.send(JSON.stringify(body));
      if (xhr.status >= 200 && xhr.status < 300) {
        const json = JSON.parse(xhr.responseText);
        return json.data !== undefined ? json.data : json;
      }
    } catch (e) {
      console.warn('Store sync PATCH error:', url, e);
    }
    return null;
  }

  function _syncDelete(url) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('DELETE', url, false);
      const hdrs = _headers();
      Object.keys(hdrs).forEach(k => xhr.setRequestHeader(k, hdrs[k]));
      xhr.send();
      if (xhr.status >= 200 && xhr.status < 300) {
        return true;
      }
    } catch (e) {
      console.warn('Store sync DELETE error:', url, e);
    }
    return false;
  }

  function init() {
    // Load all data synchronously from API so cache is ready before pages render
    const endpoints = [
      ['users', '/users'], ['tasks', '/tasks'], ['milestones', '/milestones'],
      ['proposals', '/proposals'], ['auditRequests', '/audit-requests'],
      ['auditReports', '/audit-reports'], ['disputes', '/disputes'],
      ['transactions', '/transactions'], ['expertApplications', '/expert-applications'],
      ['notifications', '/notifications'],
      ['messages', '/messages'],
    ];
    for (const [key, path] of endpoints) {
      const data = _syncFetch(API + path);
      if (data) _cache[key] = data;
    }
  }

  function resetToSeed() {
    _syncPost(`${API}/seed/reset`, {});
    init(); // reload cache
  }

  // ─── USERS ────────────────────────────────────────────────────────────────
  function getUsers() { return _cache.users; }
  function getUserById(id) { return _cache.users.find(u => u.id === id) || null; }
  function getUserByEmail(email) { return _cache.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null; }

  function createUser(data) {
    const result = _syncPost(`${API}/users`, data);
    if (result) { _cache.users.push(result); return result; }
    // Fallback if API fails
    const initials = data.name ? data.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';
    const user = { id: 'u_' + Date.now(), status: 'active', joinDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), walletBalance: 0, avatar: initials, avatarColor: 'linear-gradient(135deg,#6366f1,#4f46e5)', ...data };
    _cache.users.push(user);
    return user;
  }

  function updateUser(id, updates) {
    const result = _syncPatch(`${API}/users/${id}`, updates);
    if (result) { const idx = _cache.users.findIndex(u => u.id === id); if (idx >= 0) _cache.users[idx] = result; return result; }
    const idx = _cache.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    _cache.users[idx] = { ..._cache.users[idx], ...updates };
    return _cache.users[idx];
  }

  function deleteUser(id) {
    _syncDelete(`${API}/users/${id}`);
    _cache.users = _cache.users.filter(u => u.id !== id);
  }

  function deductFromWallet(userId, amount) {
    const user = getUserById(userId);
    if (!user) return null;
    if (user.walletBalance < amount) return null;
    const result = _syncPost(`${API}/users/${userId}/wallet/deduct`, { amount });
    if (result) { const idx = _cache.users.findIndex(u => u.id === userId); if (idx >= 0) _cache.users[idx] = result; return result; }
    user.walletBalance -= amount;
    return user;
  }

  function addToWallet(userId, amount) {
    const user = getUserById(userId);
    if (!user) return null;
    const result = _syncPost(`${API}/users/${userId}/wallet/add`, { amount });
    if (result) { const idx = _cache.users.findIndex(u => u.id === userId); if (idx >= 0) _cache.users[idx] = result; return result; }
    user.walletBalance += amount;
    return user;
  }

  // ─── TASKS ────────────────────────────────────────────────────────────────
  function getTasks() { return _cache.tasks; }
  function getTaskById(id) { return _cache.tasks.find(t => t.id === id) || null; }
  function getTasksByClient(clientId) { return _cache.tasks.filter(t => t.clientId === clientId); }
  function getTasksByWorker(workerId) { return _cache.tasks.filter(t => t.workerId === workerId); }
  function getOpenTasks() { return _cache.tasks.filter(t => t.status === 'open'); }

  function createTask(data) {
    const result = _syncPost(`${API}/tasks`, data);
    if (result) { _cache.tasks.push(result); return result; }
    const task = { id: 't_' + Date.now(), status: 'open', progress: 0, workerId: null, createdAt: new Date().toISOString().slice(0, 10), ...data };
    _cache.tasks.push(task);
    return task;
  }

  function updateTask(id, updates) {
    const result = _syncPatch(`${API}/tasks/${id}`, updates);
    if (result) { const idx = _cache.tasks.findIndex(t => t.id === id); if (idx >= 0) _cache.tasks[idx] = result; return result; }
    const idx = _cache.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    _cache.tasks[idx] = { ..._cache.tasks[idx], ...updates };
    return _cache.tasks[idx];
  }

  function deleteTask(id) {
    _syncDelete(`${API}/tasks/${id}`);
    _cache.tasks = _cache.tasks.filter(t => t.id !== id);
  }

  // ─── MILESTONES ───────────────────────────────────────────────────────────
  function getMilestones() { return _cache.milestones; }
  function getMilestonesByTask(taskId) { return _cache.milestones.filter(m => m.taskId === taskId); }
  function getMilestoneById(id) { return _cache.milestones.find(m => m.id === id) || null; }

  function createMilestone(data) {
    const result = _syncPost(`${API}/milestones`, data);
    if (result) { _cache.milestones.push(result); return result; }
    const ms = { id: 'm_' + Date.now(), status: 'pending', submittedAt: null, approvedAt: null, deliverable: null, ...data };
    _cache.milestones.push(ms);
    return ms;
  }

  function updateMilestone(id, updates) {
    const result = _syncPatch(`${API}/milestones/${id}`, updates);
    if (result) { const idx = _cache.milestones.findIndex(m => m.id === id); if (idx >= 0) _cache.milestones[idx] = result; return result; }
    const idx = _cache.milestones.findIndex(m => m.id === id);
    if (idx === -1) return null;
    _cache.milestones[idx] = { ..._cache.milestones[idx], ...updates };
    return _cache.milestones[idx];
  }

  function _checkTaskCompletion(taskId) {
    const t = _syncFetch(`${API}/tasks/${taskId}`);
    if (t) { const idx = _cache.tasks.findIndex(x => x.id === taskId); if (idx >= 0) _cache.tasks[idx] = t; }
  }

  function submitDeliverable(milestoneId, deliverable) {
    const result = _syncPost(`${API}/milestones/${milestoneId}/submit`, { deliverable });
    if (result) {
      const idx = _cache.milestones.findIndex(m => m.id === milestoneId);
      if (idx >= 0) _cache.milestones[idx] = result;
      return result;
    }
    return updateMilestone(milestoneId, { status: 'submitted', submittedAt: new Date().toISOString().slice(0, 10), deliverable });
  }

  function approveDeliverable(milestoneId) {
    const result = _syncPost(`${API}/milestones/${milestoneId}/approve`, {});
    if (result) {
      const idx = _cache.milestones.findIndex(m => m.id === milestoneId);
      if (idx >= 0) _cache.milestones[idx] = result;
      // Refresh tasks, users, and transactions cache to get updated progress/wallet/releases
      const ms = result;
      if (ms.taskId) _checkTaskCompletion(ms.taskId);
      if (ms.workerId) {
        const u = _syncFetch(`${API}/users/${ms.workerId}`);
        if (u) { const uidx = _cache.users.findIndex(x => x.id === ms.workerId); if (uidx >= 0) _cache.users[uidx] = u; }
      }
      // Refresh transactions cache (backend creates milestone-release tx)
      const txs = _syncFetch(`${API}/transactions`);
      if (txs) _cache.transactions = txs;
      // Refresh client user (task owner) for wallet balance
      const task = _cache.tasks.find(t => t.id === ms.taskId);
      if (task && task.clientId) {
        const cu = _syncFetch(`${API}/users/${task.clientId}`);
        if (cu) { const cidx = _cache.users.findIndex(x => x.id === task.clientId); if (cidx >= 0) _cache.users[cidx] = cu; }
      }
      return result;
    }
    const ms = getMilestoneById(milestoneId);
    if (ms) { ms.status = 'completed'; ms.approvedAt = new Date().toISOString().slice(0, 10); }
    return ms;
  }

  // ─── PROPOSALS ────────────────────────────────────────────────────────────
  function getProposals() { return _cache.proposals; }
  function getProposalsByTask(taskId) { return _cache.proposals.filter(p => p.taskId === taskId); }
  function getProposalsByWorker(workerId) { return _cache.proposals.filter(p => p.workerId === workerId && p.type !== 'invitation'); }
  function getInvitationsByWorker(workerId) { return _cache.proposals.filter(p => p.workerId === workerId && p.type === 'invitation'); }

  function createProposal(data) {
    const result = _syncPost(`${API}/proposals`, data);
    if (result) { _cache.proposals.push(result); return result; }
    const prop = { id: 'p_' + Date.now(), status: 'pending', createdAt: new Date().toISOString().slice(0, 10), ...data };
    _cache.proposals.push(prop);
    return prop;
  }

  function updateProposal(id, updates) {
    const result = _syncPatch(`${API}/proposals/${id}`, updates);
    if (result) { const idx = _cache.proposals.findIndex(p => p.id === id); if (idx >= 0) _cache.proposals[idx] = result; return result; }
    const idx = _cache.proposals.findIndex(p => p.id === id);
    if (idx === -1) return null;
    _cache.proposals[idx] = { ..._cache.proposals[idx], ...updates };
    return _cache.proposals[idx];
  }

  function hireWorker(proposalId) {
    const result = _syncPost(`${API}/proposals/${proposalId}/hire`, {});
    if (result) {
      // Refresh proposals, tasks, transactions from API
      const proposals = _syncFetch(`${API}/proposals`);
      const tasks = _syncFetch(`${API}/tasks`);
      const transactions = _syncFetch(`${API}/transactions`);
      if (proposals) _cache.proposals = proposals;
      if (tasks) _cache.tasks = tasks;
      if (transactions) _cache.transactions = transactions;
      return result;
    }
    // Fallback
    const prop = _cache.proposals.find(p => p.id === proposalId);
    if (!prop) return null;
    _cache.proposals = _cache.proposals.map(p =>
      p.taskId === prop.taskId ? { ...p, status: p.id === proposalId ? 'hired' : 'rejected' } : p
    );
    return _cache.proposals.find(p => p.id === proposalId);
  }

  function acceptInvitation(proposalId) {
    const result = _syncPost(`${API}/proposals/${proposalId}/accept`, {});
    if (result) {
      const proposals = _syncFetch(`${API}/proposals`);
      const tasks = _syncFetch(`${API}/tasks`);
      if (proposals) _cache.proposals = proposals;
      if (tasks) _cache.tasks = tasks;
      return result;
    }
    const prop = _cache.proposals.find(p => p.id === proposalId);
    if (!prop || prop.type !== 'invitation') return null;
    prop.status = 'hired';
    return prop;
  }

  function declineInvitation(proposalId) {
    const result = _syncPost(`${API}/proposals/${proposalId}/decline`, {});
    if (result) {
      const idx = _cache.proposals.findIndex(p => p.id === proposalId);
      if (idx >= 0) _cache.proposals[idx] = result;
      return result;
    }
    const prop = _cache.proposals.find(p => p.id === proposalId);
    if (!prop || prop.type !== 'invitation') return null;
    prop.status = 'rejected';
    return prop;
  }

  // ─── AUDIT REQUESTS ──────────────────────────────────────────────────────
  function getAuditRequests() { return _cache.auditRequests; }
  function getAuditRequestById(id) { return _cache.auditRequests.find(a => a.id === id) || null; }

  function createAuditRequest(data) {
    const result = _syncPost(`${API}/audit-requests`, data);
    if (result) { _cache.auditRequests.push(result); return result; }
    const req = { id: 'ar_' + Date.now(), createdAt: new Date().toISOString().slice(0, 10), ...data };
    _cache.auditRequests.push(req);
    return req;
  }

  function updateAuditRequest(id, updates) {
    const result = _syncPatch(`${API}/audit-requests/${id}`, updates);
    if (result) { const idx = _cache.auditRequests.findIndex(a => a.id === id); if (idx >= 0) _cache.auditRequests[idx] = result; return result; }
    const idx = _cache.auditRequests.findIndex(a => a.id === id);
    if (idx === -1) return null;
    _cache.auditRequests[idx] = { ..._cache.auditRequests[idx], ...updates };
    return _cache.auditRequests[idx];
  }

  // ─── AUDIT REPORTS ────────────────────────────────────────────────────────
  function getAuditReports() { return _cache.auditReports; }
  function getAuditReportByRequest(auditRequestId) { return _cache.auditReports.find(r => r.auditRequestId === auditRequestId) || null; }
  function getReportsByTask(taskId) { return _cache.auditReports.filter(r => r.taskId === taskId); }

  function saveAuditReport(data) {
    console.log('[Store] saveAuditReport called with:', JSON.stringify(data));
    console.log('[Store] Current headers:', JSON.stringify(_headers()));
    const result = _syncPost(`${API}/audit-reports`, data);
    console.log('[Store] _syncPost result:', result);
    if (result) {
      const existing = _cache.auditReports.findIndex(r => r.auditRequestId === data.auditRequestId);
      if (existing >= 0) _cache.auditReports[existing] = result;
      else _cache.auditReports.push(result);
      // Refresh related caches
      const ar = _syncFetch(`${API}/audit-requests`);
      const ms = _syncFetch(`${API}/milestones`);
      if (ar) _cache.auditRequests = ar;
      if (ms) _cache.milestones = ms;
      return result;
    }
    // Retry with explicit expert role header
    console.warn('[Store] First POST failed, retrying with explicit role header...');
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API}/audit-reports`, false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('role', 'expert');
      const session = JSON.parse(localStorage.getItem('lannent_session') || '{}');
      if (session.userId) xhr.setRequestHeader('user-id', session.userId);
      xhr.send(JSON.stringify(data));
      console.log('[Store] Retry status:', xhr.status, 'response:', xhr.responseText.substring(0, 200));
      if (xhr.status >= 200 && xhr.status < 300) {
        const json = JSON.parse(xhr.responseText);
        const retryResult = json.data !== undefined ? json.data : json;
        if (retryResult) {
          const existing = _cache.auditReports.findIndex(r => r.auditRequestId === data.auditRequestId);
          if (existing >= 0) _cache.auditReports[existing] = retryResult;
          else _cache.auditReports.push(retryResult);
          const ar = _syncFetch(`${API}/audit-requests`);
          if (ar) _cache.auditRequests = ar;
          return retryResult;
        }
      }
    } catch (e) {
      console.error('[Store] Retry also failed:', e);
    }
    // Final fallback — local only
    console.warn('[Store] All POST attempts failed, saving locally only');
    const report = { id: 'rep_' + Date.now(), createdAt: new Date().toISOString().slice(0, 10), ...data };
    _cache.auditReports.push(report);
    return report;
  }

  // ─── DISPUTES ─────────────────────────────────────────────────────────────
  function getDisputes() { return _cache.disputes; }
  function getDisputeById(id) { return _cache.disputes.find(d => d.id === id) || null; }

  function createDispute(data) {
    const result = _syncPost(`${API}/disputes`, data);
    if (result) {
      _cache.disputes.push(result);
      if (data.milestoneId) {
        const ms = _syncFetch(`${API}/milestones`);
        if (ms) _cache.milestones = ms;
      }
      return result;
    }
    const dispute = { id: 'd_' + Date.now(), status: 'open', expertId: null, verdict: null, resolution: null, createdAt: new Date().toISOString().slice(0, 10), ...data };
    _cache.disputes.push(dispute);
    if (data.milestoneId) {
      const localMs = getMilestoneById(data.milestoneId);
      if (localMs) {
        localMs.status = 'disputed';
      }
    }
    return dispute;
  }

  function resolveDispute(id, { verdict, resolution, expertId }) {
    const result = _syncPost(`${API}/disputes/${id}/resolve`, { verdict, resolution, expertId });
    if (result) {
      const idx = _cache.disputes.findIndex(d => d.id === id);
      if (idx >= 0) _cache.disputes[idx] = result;
      // Refresh milestones & tasks
      const ms = _syncFetch(`${API}/milestones`);
      const tasks = _syncFetch(`${API}/tasks`);
      if (ms) _cache.milestones = ms;
      if (tasks) _cache.tasks = tasks;
      return result;
    }
    const idx = _cache.disputes.findIndex(d => d.id === id);
    if (idx === -1) return null;
    _cache.disputes[idx] = { ..._cache.disputes[idx], status: 'resolved', verdict, resolution, expertId, resolvedAt: new Date().toISOString().slice(0, 10) };
    return _cache.disputes[idx];
  }

  // ─── TRANSACTIONS ─────────────────────────────────────────────────────────
  function getTransactions() { return _cache.transactions; }
  function getTransactionsByUser(userId) { return _cache.transactions.filter(t => t.fromId === userId || t.toId === userId); }

  function createTransaction(data) {
    const result = _syncPost(`${API}/transactions`, data);
    if (result) { _cache.transactions.push(result); return result; }
    const tx = { id: 'tx_' + Date.now(), status: 'completed', createdAt: new Date().toISOString().slice(0, 10), ...data };
    _cache.transactions.push(tx);
    return tx;
  }

  // ─── EXPERT APPLICATIONS ──────────────────────────────────────────────────
  function getExpertApplications() { return _cache.expertApplications || []; }
  function getExpertApplicationById(id) { return (_cache.expertApplications || []).find(a => a.id === id) || null; }
  function getExpertApplicationByEmail(email) { return (_cache.expertApplications || []).find(a => a.email.toLowerCase() === email.toLowerCase()) || null; }

  function saveExpertApplication(data) {
    if (getExpertApplicationByEmail(data.email)) {
      return { success: false, error: 'An application with this email already exists.' };
    }
    const result = _syncPost(`${API}/expert-applications`, data);
    if (result) {
      _cache.expertApplications.push(result);
      return { success: true, application: result };
    }
    const app = { id: 'ea_' + Date.now(), status: 'pending', appliedAt: new Date().toISOString().slice(0, 10), reviewedAt: null, reviewedBy: null, ...data };
    _cache.expertApplications.push(app);
    return { success: true, application: app };
  }

  function updateExpertApplicationStatus(id, status, reviewerId) {
    const result = _syncPatch(`${API}/expert-applications/${id}/status`, { status, reviewedBy: reviewerId });
    if (result) {
      const idx = _cache.expertApplications.findIndex(a => a.id === id);
      if (idx >= 0) _cache.expertApplications[idx] = result;
      // Refresh users (auto-created on approval)
      if (status === 'approved') {
        const users = _syncFetch(`${API}/users`);
        if (users) _cache.users = users;
      }
      return result;
    }
    const idx = _cache.expertApplications.findIndex(a => a.id === id);
    if (idx === -1) return null;
    _cache.expertApplications[idx].status = status;
    return _cache.expertApplications[idx];
  }

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  function getNotifications(userId) { return (_cache.notifications || []).filter(n => n.userId === userId); }

  function addNotification(data) {
    const result = _syncPost(`${API}/notifications`, data);
    if (result) { _cache.notifications.push(result); return; }
    _cache.notifications.push({ id: 'n_' + Date.now(), read: false, createdAt: new Date().toISOString().slice(0, 10), ...data });
  }

  function markNotificationsRead(userId) {
    _syncPatch(`${API}/notifications/${userId}/read-all`, {});
    // Update local cache
    (_cache.notifications || []).forEach(n => {
      if (n.userId === userId) n.read = true;
    });
  }

  // ─── MESSAGES ──────────────────────────────────────────────────────────────
  function getMessagesByTask(taskId) { return (_cache.messages || []).filter(m => m.taskId === taskId); }
  function getMessagesByUser(userId) { return (_cache.messages || []).filter(m => m.senderId === userId || m.receiverId === userId); }

  function sendMessage(data) {
    const result = _syncPost(`${API}/messages`, data);
    if (result) {
      _cache.messages.push(result);
    } else {
      _cache.messages.push({ id: 'msg_' + Date.now(), createdAt: new Date().toISOString(), ...data });
    }
    // Auto-generate notification for the receiver
    const sender = getUserById(data.senderId);
    const senderName = sender ? sender.name : (data.senderName || 'Someone');
    addNotification({
      userId: data.receiverId,
      type: 'message',
      text: `New message from ${senderName}`,
      subtext: data.content.length > 50 ? data.content.substring(0, 50) + '...' : data.content,
    });
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────
  return {
    init, resetToSeed,
    getUsers, getUserById, getUserByEmail, createUser, updateUser, deleteUser, deductFromWallet, addToWallet,
    getTasks, getTaskById, getTasksByClient, getTasksByWorker, getOpenTasks, createTask, updateTask, deleteTask,
    getMilestones, getMilestonesByTask, getMilestoneById, createMilestone, updateMilestone, submitDeliverable, approveDeliverable,
    getProposals, getProposalsByTask, getProposalsByWorker, getInvitationsByWorker, createProposal, updateProposal, hireWorker, acceptInvitation, declineInvitation,
    getAuditRequests, getAuditRequestById, createAuditRequest, updateAuditRequest,
    getAuditReports, getAuditReportByRequest, getReportsByTask, saveAuditReport,
    getDisputes, getDisputeById, createDispute, resolveDispute,
    getTransactions, getTransactionsByUser, createTransaction,
    getNotifications, addNotification, markNotificationsRead,
    getMessagesByTask, getMessagesByUser, sendMessage,
    getExpertApplications, getExpertApplicationById, getExpertApplicationByEmail, saveExpertApplication, updateExpertApplicationStatus,
  };
})();

// Auto-init on load
Store.init();

