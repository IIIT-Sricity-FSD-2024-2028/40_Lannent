/**
 * LANNENT — Central Data Store (API-backed)
 * Refactored to use the NestJS backend API at localhost:3000.
 * Maintains a local cache for synchronous reads + async API mutations.
 * Drop-in replacement: all existing pages work without changes.
 */

const LANNENT_API = (typeof window !== 'undefined' && window.LANNENT_API)
  || 'http://localhost:3000/api';

const Store = (() => {
  const API = LANNENT_API;

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

  // True once at least one endpoint has answered. Pages read this to tell
  // "the API is down" apart from "there is genuinely no data yet" — without it,
  // an unreachable backend renders every page as a silent empty shell.
  let _online = false;
  let _reachedEndpoints = 0;

  function init() {
    // Load all data synchronously from the API so the cache is ready before pages render.
    const endpoints = [
      ['users', '/users'], ['tasks', '/tasks'], ['milestones', '/milestones'],
      ['proposals', '/proposals'], ['auditRequests', '/audit-requests'],
      ['auditReports', '/audit-reports'], ['disputes', '/disputes'],
      ['transactions', '/transactions'], ['expertApplications', '/expert-applications'],
      ['notifications', '/notifications'],
      ['messages', '/messages'],
    ];
    // Expert applications hold applicants' contact details and are admin-only.
    // Fetching them for every role logged a 403 on every page load, which buries
    // real errors in the console.
    let role = null;
    try { role = JSON.parse(localStorage.getItem('lannent_session') || '{}').role; } catch {}
    const allowed = endpoints.filter(([key]) => key !== 'expertApplications' || role === 'admin');

    _reachedEndpoints = 0;
    for (const [key, path] of allowed) {
      // One failing endpoint must not abort the rest.
      let data = null;
      try { data = _syncFetch(API + path); } catch (e) { data = null; }
      if (data) { _cache[key] = data; _reachedEndpoints++; }
      else if (!Array.isArray(_cache[key])) { _cache[key] = []; }
    }
    _online = _reachedEndpoints > 0;
    return _online;
  }

  function isOnline() { return _online; }

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

  // Balance changes must never fall back to a cache-only mutation: that reports
  // success for money the server never moved, and the change is lost on reload.
  // Both of these return null when the API does not confirm the change.
  function deductFromWallet(userId, amount) {
    const user = getUserById(userId);
    if (!user) return null;
    if (user.walletBalance < amount) return null;
    const result = _syncPost(`${API}/users/${userId}/wallet/deduct`, { amount });
    if (!result) return null;
    const idx = _cache.users.findIndex(u => u.id === userId);
    if (idx >= 0) _cache.users[idx] = result;
    return result;
  }

  // Deposits and withdrawals carry a platform fee, so these return the fee
  // breakdown ({ gross, fee, net, balance }) rather than the user record.
  // The cached user is refreshed from the server afterwards.
  // The server writes a ledger row for every wallet movement. Without this the
  // wallet pages showed a stale history and a frozen "Total Deposited" until reload.
  function _refreshTransactions() {
    const txs = _syncFetch(`${API}/transactions`);
    if (txs) _cache.transactions = txs;
  }

  function _refreshUser(userId) {
    const fresh = _syncFetch(`${API}/users/${userId}`);
    if (fresh) {
      const idx = _cache.users.findIndex(u => u.id === userId);
      if (idx >= 0) _cache.users[idx] = fresh;
    }
    return fresh;
  }

  function addToWallet(userId, amount) {
    const user = getUserById(userId);
    if (!user) return null;
    const result = _syncPost(`${API}/users/${userId}/wallet/add`, { amount });
    if (!result) return null;
    _refreshUser(userId);
    _refreshTransactions();
    return result;
  }

  /** Withdraws to an external account. Returns { gross, fee, net, balance }. */
  function withdrawFromWallet(userId, amount) {
    const user = getUserById(userId);
    if (!user) return null;
    const result = _syncPost(`${API}/users/${userId}/wallet/withdraw`, { amount });
    if (!result) return null;
    _refreshUser(userId);
    _refreshTransactions();
    return result;
  }

  // ─── AUDIT ENGAGEMENTS ────────────────────────────────────────────────────
  // An audit is a hired, negotiated, escrow-paid engagement:
  //   preview-sent → negotiating → agreed → escrow-funded
  //                → in-progress → report-submitted → paid
  function getAuditPreview(id) {
    return _syncFetch(`${API}/audit-requests/${id}/preview`);
  }
  function getAuditRequestsByTask(taskId) {
    return (_cache.auditRequests || []).filter(a => a.taskId === taskId);
  }
  function _refreshAuditRequests() {
    const fresh = _syncFetch(`${API}/audit-requests`);
    if (fresh) _cache.auditRequests = fresh;
  }
  function makeAuditOffer(id, { amount, offeredBy, note }) {
    const r = _syncPost(`${API}/audit-requests/${id}/offers`, { amount, offeredBy, note });
    if (r) _refreshAuditRequests();
    return r;
  }
  function acceptAuditOffer(id, offerId) {
    const r = _syncPost(`${API}/audit-requests/${id}/offers/${offerId}/accept`, {});
    if (r) _refreshAuditRequests();
    return r;
  }
  function fundAuditEscrow(id) {
    const r = _syncPost(`${API}/audit-requests/${id}/fund`, {});
    if (r) { _refreshAuditRequests(); _refreshUser(_sessionUserId()); }
    return r;
  }
  function acceptAuditEngagement(id, expertId) {
    const r = _syncPost(`${API}/audit-requests/${id}/accept`, { expertId });
    if (r) {
      _refreshAuditRequests();
      const tasks = _syncFetch(`${API}/tasks`);
      if (tasks) _cache.tasks = tasks;
    }
    return r;
  }
  function declineAuditEngagement(id, reason) {
    const r = _syncPost(`${API}/audit-requests/${id}/decline`, { reason });
    if (r) _refreshAuditRequests();
    return r;
  }
  function cancelDraftTask(taskId) {
    const r = _syncPost(`${API}/tasks/${taskId}/cancel-draft`, {});
    if (r) {
      const tasks = _syncFetch(`${API}/tasks`);
      if (tasks) _cache.tasks = tasks;
      _refreshUser(_sessionUserId());
    }
    return r;
  }
  function getExperts() {
    return (_cache.users || []).filter(u => u.role === 'expert' && u.status === 'active');
  }
  function _sessionUserId() {
    try { return JSON.parse(localStorage.getItem('lannent_session') || '{}').userId; } catch { return null; }
  }

  // ─── LEDGER ───────────────────────────────────────────────────────────────
  // Authoritative escrow and revenue totals. Do not re-derive escrow from
  // transaction rows: milestone-release rows carry the NET paid to the worker,
  // so summing them under-counts what actually left escrow by the service fee.
  function getLedgerSummary() {
    return _syncFetch(`${API}/ledger/summary`) || {
      totalHeld: 0, totalRevenue: 0, escrowByTask: {}, revenueEntries: [],
    };
  }

  function getEscrowForTask(taskId) {
    return _syncFetch(`${API}/ledger/escrow/${taskId}`) || { projectHeld: 0, auditHeld: 0 };
  }

  // ─── REVENUE (admin) ──────────────────────────────────────────────────────
  function getRevenueSummary()      { return _syncFetch(`${API}/revenue/summary`); }
  function getRevenueByFeeType()    { return _syncFetch(`${API}/revenue/by-fee-type`) || []; }
  function getRevenueTimeseries(period) {
    return _syncFetch(`${API}/revenue/timeseries?period=${period || 'day'}`) || [];
  }
  function getRevenueByUser()       { return _syncFetch(`${API}/revenue/by-user`) || []; }
  function getRevenueDistribution() { return _syncFetch(`${API}/revenue/distribution`); }
  function getRevenueByProject()    { return _syncFetch(`${API}/revenue/by-project`) || []; }
  function getProjectBreakdown(taskId) { return _syncFetch(`${API}/revenue/project/${taskId}`); }
  function getFeeConfig()           { return _syncFetch(`${API}/revenue/fee-config`); }
  function updateFeeConfig(patch)   { return _syncPatch(`${API}/revenue/fee-config`, patch); }

  // ─── FEE PREVIEW ──────────────────────────────────────────────────────────
  // Mirrors back-end/src/modules/ledger/fee-config.ts so forms can show the
  // charge before it is committed. The server always recomputes authoritatively.
  const FEES = {
    deposit:            { percent: 2.9,  fixed: 0.30 },
    clientMarketplace:  { percent: 5.0 },
    contractInitiation: [
      { upTo: 500, fee: 0.99 }, { upTo: 2000, fee: 4.99 },
      { upTo: 10000, fee: 9.99 }, { upTo: Infinity, fee: 14.99 },
    ],
    workerService: [
      { upTo: 500, percent: 20 }, { upTo: 10000, percent: 10 },
      { upTo: Infinity, percent: 5 },
    ],
    expertService: { percent: 10 },
    withdrawal:    { percent: 0.25, fixed: 0.25, min: 0.25 },
  };

  function _round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function _tier(tiers, amount) { return tiers.find(t => amount <= t.upTo) || tiers[tiers.length - 1]; }

  const Fees = {
    round2: _round2,
    deposit(gross) {
      const fee = _round2(gross * (FEES.deposit.percent / 100) + FEES.deposit.fixed);
      return { gross, fee, net: _round2(gross - fee) };
    },
    withdrawal(gross) {
      const raw = gross * (FEES.withdrawal.percent / 100) + FEES.withdrawal.fixed;
      const fee = _round2(Math.max(raw, FEES.withdrawal.min));
      return { gross, fee, net: _round2(gross - fee) };
    },
    projectFunding(budget) {
      const marketplace = _round2(budget * (FEES.clientMarketplace.percent / 100));
      const initiation = _tier(FEES.contractInitiation, budget).fee;
      return { budget, marketplace, initiation, total: _round2(budget + marketplace + initiation) };
    },
    workerRelease(amount, lifetimeBillings) {
      const rate = _tier(FEES.workerService, lifetimeBillings || 0).percent;
      const fee = _round2(amount * (rate / 100));
      return { amount, rate, fee, net: _round2(amount - fee) };
    },
    expertPayout(amount) {
      const fee = _round2(amount * (FEES.expertService.percent / 100));
      return { amount, fee, net: _round2(amount - fee) };
    },
  };

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
    // No retry, and no local fallback.
    //
    // This used to re-POST with a hardcoded `role: expert` header, which let ANY
    // signed-in user file an audit report — and filing one releases escrow to a
    // reviewer. It then cached a fake report locally when the server refused,
    // so the UI showed a report the backend had never accepted.
    console.error('[Store] Audit report was rejected by the server.');
    return null;
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

  /**
   * Public lookup: does an application exist for this email, and what is its
   * status. The full application list is admin-only — it holds applicants'
   * contact details — so signup and login use this instead.
   */
  function getExpertApplicationStatus(email) {
    return _syncFetch(`${API}/expert-applications/status?email=${encodeURIComponent(email)}`)
      || { exists: false, status: null };
  }

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
    init, resetToSeed, isOnline,
    getUsers, getUserById, getUserByEmail, createUser, updateUser, deleteUser, deductFromWallet, addToWallet, withdrawFromWallet, Fees, getLedgerSummary, getEscrowForTask,
    getRevenueSummary, getRevenueByFeeType, getRevenueTimeseries, getRevenueByUser,
    getRevenueDistribution, getRevenueByProject, getProjectBreakdown, getFeeConfig, updateFeeConfig,
    getTasks, getTaskById, getTasksByClient, getTasksByWorker, getOpenTasks, createTask, updateTask, deleteTask,
    getMilestones, getMilestonesByTask, getMilestoneById, createMilestone, updateMilestone, submitDeliverable, approveDeliverable,
    getProposals, getProposalsByTask, getProposalsByWorker, getInvitationsByWorker, createProposal, updateProposal, hireWorker, acceptInvitation, declineInvitation,
    getAuditRequests, getAuditRequestById, createAuditRequest, updateAuditRequest,
    getAuditPreview, getAuditRequestsByTask, makeAuditOffer, acceptAuditOffer, fundAuditEscrow,
    acceptAuditEngagement, declineAuditEngagement, cancelDraftTask, getExperts,
    getAuditReports, getAuditReportByRequest, getReportsByTask, saveAuditReport,
    getDisputes, getDisputeById, createDispute, resolveDispute,
    getTransactions, getTransactionsByUser, createTransaction,
    getNotifications, addNotification, markNotificationsRead,
    getMessagesByTask, getMessagesByUser, sendMessage,
    getExpertApplications, getExpertApplicationById, getExpertApplicationByEmail, getExpertApplicationStatus, saveExpertApplication, updateExpertApplicationStatus,
  };
})();

// Auto-init on load
try { Store.init(); } catch (e) { console.error('[Store] init failed:', e); }

