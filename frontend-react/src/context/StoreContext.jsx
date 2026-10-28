/**
 * LANNENT — StoreContext
 * Ported from front-end/js/store.js, and shared with the app through React Context.
 *
 *   const Store = useStore();
 *   Store.getTasks();  Store.createTask({...});   // same API as before
 *
 * The Store keeps a local cache for synchronous reads and sends changes to
 * the API. The cache is (re)filled by Store.init(), which the router calls on
 * every navigation — the React equivalent of the full page load that used to
 * re-run store.js on every page (see App.jsx → PageLoader).
 *
 * There is one Store for the whole app (it owns the cache), so <StoreProvider>
 * hands that single instance to every component.
 */
import { createContext, useContext } from 'react';

/**
 * Where the API lives.
 *
 * During development Vite proxies /api to the NestJS server on port 3000
 * (see vite.config.js), so requests stay same-origin. Set VITE_API_URL to
 * point somewhere else, e.g. VITE_API_URL=http://localhost:3000/api.
 */
export const LANNENT_API = import.meta.env.VITE_API_URL || '/api';

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
      // The bearer token is authoritative server-side and overrides the two
      // headers above; they stay for sessions created before tokens existed.
      const token = localStorage.getItem('lannent_token');
      if (token) h['Authorization'] = 'Bearer ' + token;
    } catch {}
    return h;
  }

  /**
   * Uploads one file and resolves to the reference a deliverable stores:
   * `{ id, name, size, mime, url }`.
   *
   * This cannot go through `_write`: that sends a JSON string over a
   * synchronous XHR, and `_headers()` forces `Content-Type: application/json`.
   * A multipart body needs the browser to set the content type itself, so the
   * boundary is right — hence async fetch and a headers object with the
   * content type deliberately left out.
   */
  async function uploadFile(file, meta = {}) {
    const form = new FormData();
    form.append('file', file);
    if (meta.taskId) form.append('taskId', meta.taskId);
    if (meta.milestoneId) form.append('milestoneId', meta.milestoneId);
    if (meta.purpose) form.append('purpose', meta.purpose);

    const h = _headers();
    delete h['Content-Type'];

    // An Expert Reviewer applicant has no account yet, so their résumé goes to
    // the public application route — the authenticated one would refuse a
    // request with no role header.
    const endpoint = meta.purpose === 'expert-application' ? `${API}/files/application` : `${API}/files`;

    const res = await fetch(endpoint, { method: 'POST', headers: h, body: form });
    let payload = null;
    try { payload = await res.json(); } catch {}
    if (!res.ok || !payload || payload.success === false) {
      throw new Error((payload && payload.message) || `Upload failed (${res.status})`);
    }
    return payload.data !== undefined ? payload.data : payload;
  }

  /** Deletes a file you uploaded (refused once it is part of a submitted deliverable). */
  function deleteFile(id) {
    return _write('DELETE', `${API}/files/${id}`);
  }

  /** Absolute URL for a stored file, for links and download buttons. */
  function fileUrl(ref) {
    if (!ref) return '';
    const path = typeof ref === 'string' ? ref : ref.url;
    if (!path) return '';
    return /^https?:\/\//i.test(path) ? path : API.replace(/\/api$/, '') + path;
  }

  /** True when `href` points at a stored file, which is a route that needs credentials. */
  function _isFileHref(href) {
    if (!href) return false;
    const origin = API.replace(/\/api$/, '');
    return href.indexOf(API + '/files/') === 0 || href.indexOf(origin + '/api/files/') === 0 || href.indexOf('/api/files/') === 0;
  }

  /**
   * Downloads a stored file and hands it to the browser to save.
   *
   * `GET /api/files/:id` is behind RequireAuthMiddleware, and identity lives in
   * localStorage — it is attached per request by `_headers()`. A plain
   * `<a href download>` sends none of it, so the browser followed the link
   * anonymously, received a 401 JSON body, and saved *that* under the .pdf
   * name. The file looked downloaded and would not open. Fetching it here
   * carries the credentials and saves the actual bytes.
   */
  async function downloadFile(ref, filename) {
    const url = fileUrl(ref);
    if (!url) throw new Error('That file was never stored on the server.');
    const name = filename || (ref && typeof ref === 'object' && ref.name) || 'download';

    // A GET carries no body, and declaring a JSON content type on one is both
    // meaningless and enough to trigger a preflight.
    const h = _headers();
    delete h['Content-Type'];

    let res;
    try {
      res = await fetch(url, { headers: h });
    } catch (e) {
      throw new Error('The server could not be reached, so the file was not downloaded.');
    }

    if (!res.ok) {
      // Read the reason rather than saving it as the file.
      let message = '';
      try { message = ((await res.json()) || {}).message || ''; } catch (e) {}
      if (!message) {
        message = res.status === 401 || res.status === 403
          ? 'You are not signed in with an account that can open this file.'
          : `The file could not be downloaded (${res.status}).`;
      }
      throw new Error(message);
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    // A link with no `download` attribute still deserves the real filename,
    // which the server already states on the response.
    a.download = name !== 'download' ? name : (_filenameFromResponse(res) || name);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoking immediately can cancel the save while it is still being read.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    return true;
  }

  /** The filename from `Content-Disposition`, preferring the RFC 5987 form. */
  function _filenameFromResponse(res) {
    try {
      const cd = res.headers.get('Content-Disposition') || '';
      const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
      if (star) return decodeURIComponent(star[1].trim());
      const plain = /filename="?([^";]+)"?/i.exec(cd);
      if (plain) return plain[1].trim();
    } catch (e) {}
    return '';
  }

  /** A message the user can actually see, on a page whose CSS we cannot assume. */
  function _notifyDownloadError(message) {
    try {
      const el = document.createElement('div');
      el.setAttribute('role', 'alert');
      el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;' +
        'max-width:min(460px,92vw);background:#dc2626;color:#fff;padding:12px 16px;border-radius:12px;' +
        'font:500 13.5px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,0.25);';
      el.textContent = message;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 6000);
    } catch (e) {
      console.error('[Store] download failed:', message);
    }
  }

  /**
   * Makes every existing file link work without touching the pages that build
   * them. The links are rendered into innerHTML across several pages, so this
   * is delegated from the document rather than bound per element — including
   * the ones rendered after this runs.
   */
  function _interceptFileLinks() {
    if (typeof document === 'undefined' || document.__lannentFileLinks) return;
    document.__lannentFileLinks = true;
    // Capture phase: several pages call stopPropagation() inside cards, which
    // would keep a bubbling listener from ever seeing the click.
    document.addEventListener('click', (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      if (!_isFileHref(a.getAttribute('href'))) return;

      // Opening it in a new tab would be anonymous too, so every click is
      // handled here rather than only the plain ones.
      e.preventDefault();
      if (a.dataset.downloading === '1') return;
      a.dataset.downloading = '1';

      downloadFile(a.getAttribute('href'), a.getAttribute('download') || '')
        .catch(err => _notifyDownloadError(err && err.message ? err.message : 'The file could not be downloaded.'))
        .finally(() => { delete a.dataset.downloading; });
    }, true);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _interceptFileLinks);
    } else {
      _interceptFileLinks();
    }
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
      _handleUnauthorized(xhr.status);
    } catch (e) {
      console.warn('Store sync GET error:', url, e);
    }
    return null;
  }

  /**
   * The server no longer accepts our token — it expired (12h), or a dev
   * server restarted with a fresh secret. Every request then failed with 401
   * and the app rendered as if it were offline, with the user still "signed
   * in" and no way to tell why. Sign out and go to the login page instead.
   */
  function _handleUnauthorized(status) {
    if (status !== 401) return;
    let hadToken = false;
    try { hadToken = !!localStorage.getItem('lannent_token'); } catch {}
    if (!hadToken) return;
    try { localStorage.removeItem('lannent_session'); localStorage.removeItem('lannent_token'); } catch {}
    // The password-reset pages are for people who cannot sign in, so a dead
    // token must not bounce them off the link they followed.
    const stay = ['/login', '/forgot-password', '/reset-password'];
    if (typeof window !== 'undefined' && !stay.includes(window.location.pathname)) {
      window.location.href = '/login';
    }
  }

  /**
   * Every write goes through here. It returns the server's data, or throws an
   * Error carrying the server's own message.
   *
   * The old helpers returned null both when the server was unreachable and
   * when it *refused* the request, and most writes then fell back to editing
   * the local cache. So a hire the server rejected for insufficient funds,
   * or an approval it refused, showed on screen as done until the next
   * reload. A refused write now fails visibly, with the reason.
   */
  function _write(method, url, body) {
    const xhr = new XMLHttpRequest();
    try {
      xhr.open(method, url, false);
      const hdrs = _headers();
      Object.keys(hdrs).forEach(k => xhr.setRequestHeader(k, hdrs[k]));
      xhr.send(body === undefined ? null : JSON.stringify(body));
    } catch (e) {
      throw new Error('The server could not be reached, so nothing was saved.');
    }
    let json = null;
    try { json = JSON.parse(xhr.responseText); } catch {}
    if (xhr.status >= 200 && xhr.status < 300) {
      return json && json.data !== undefined ? json.data : json;
    }
    _handleUnauthorized(xhr.status);
    throw new Error((json && json.message) || `The server refused this request (${xhr.status}).`);
  }

  // True once at least one endpoint has answered. Pages read this to tell
  // "the API is down" apart from "there is genuinely no data yet" — without it,
  // an unreachable backend renders every page as a silent empty shell.
  let _online = false;
  let _reachedEndpoints = 0;

  /** What a page load reads, for the signed-in role. Null when nothing should be read. */
  function _initPlan() {
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
    let role = null, token = null, mustChange = false;
    try {
      const session = JSON.parse(localStorage.getItem('lannent_session') || '{}');
      role = session.role;
      mustChange = !!session.mustChangePassword;
      token = localStorage.getItem('lannent_token');
    } catch {}
    // Nobody is signed in (login, landing, signup): every endpoint below needs
    // credentials. And an account that must first choose its own password can
    // read nothing until it has.
    if ((!role && !token) || mustChange) return null;
    return endpoints.filter(([key]) => key !== 'expertApplications' || (role === 'intake-admin' || role === 'compliance-admin'));
  }

  /** Reachability for visitors who are not signed in — one public endpoint. */
  function _ping() {
    let reachable = null;
    try { reachable = _syncFetch(API + '/stats/public'); } catch (e) {}
    _online = reachable !== null;
    _reachedEndpoints = _online ? 1 : 0;
  }

  /** Refills the cache synchronously (after a seed reset). Page loads use initAsync. */
  function init() {
    const allowed = _initPlan();
    if (!allowed) { _ping(); return _online; }

    _reachedEndpoints = 0;
    for (const [key, path] of allowed) {
      // One failing endpoint must not abort the rest.
      let data = null;
      try { data = _syncFetch(API + path); } catch (e) { data = null; }
      if (data) { _cache[key] = data; _reachedEndpoints++; }
      else if (!Array.isArray(_cache[key])) { _cache[key] = []; }
    }
    _online = _reachedEndpoints > 0;

    // The rates every preview is computed with. Read from the server so a
    // change the revenue desk makes shows up in every form's preview.
    const rates = _syncFetch(API + '/ledger/fee-rates');
    if (rates) _applyRates(rates);
    return _online;
  }

  /**
   * Refills the cache with every read in parallel, without blocking the page.
   *
   * init() makes about a dozen synchronous requests one after another, and it
   * ran on every navigation — the whole UI froze for the sum of them. The
   * router now awaits this instead and shows a loading state meanwhile.
   */
  async function initAsync() {
    const allowed = _initPlan();
    if (!allowed) {
      try { _online = (await fetch(API + '/stats/public')).ok; } catch { _online = false; }
      _reachedEndpoints = _online ? 1 : 0;
      return _online;
    }
    const h = _headers();
    delete h['Content-Type'];
    const read = async (path) => {
      try {
        const res = await fetch(API + path, { headers: h });
        if (res.status === 401) { _handleUnauthorized(401); return null; }
        if (!res.ok) return null;
        const json = await res.json();
        return json.data !== undefined ? json.data : json;
      } catch { return null; }
    };
    const results = await Promise.all([...allowed.map(([, path]) => read(path)), read('/ledger/fee-rates')]);
    _reachedEndpoints = 0;
    allowed.forEach(([key], i) => {
      const data = results[i];
      if (data) { _cache[key] = data; _reachedEndpoints++; }
      else if (!Array.isArray(_cache[key])) { _cache[key] = []; }
    });
    _online = _reachedEndpoints > 0;
    const rates = results[results.length - 1];
    if (rates) _applyRates(rates);
    return _online;
  }

  /** Asynchronously re-reads the signed-in user's notifications. */
  async function refreshNotifications() {
    const h = _headers();
    delete h['Content-Type'];
    try {
      const res = await fetch(`${API}/notifications`, { headers: h });
      if (res.status === 401) { _handleUnauthorized(401); return _cache.notifications; }
      if (!res.ok) return _cache.notifications;
      const json = await res.json();
      _cache.notifications = Array.isArray(json.data) ? json.data : [];
    } catch (e) { /* offline: keep what we have */ }
    return _cache.notifications;
  }

  function markNotificationRead(id) {
    try { _write('PATCH', `${API}/notifications/${id}/read`, {}); } catch (e) { console.warn('[Store]', e.message); }
    const n = (_cache.notifications || []).find(x => x.id === id);
    if (n) n.read = true;
  }

  function isOnline() { return _online; }

  function resetToSeed() {
    _write('POST', `${API}/seed/reset`, {});
    init(); // reload cache
  }

  // ─── USERS ────────────────────────────────────────────────────────────────
  function getUsers() { return _cache.users; }
  function getUserById(id) { return _cache.users.find(u => u.id === id) || null; }
  function getUserByEmail(email) { return _cache.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null; }

  function createUser(data) {
    // Staff/admin roles cannot be created through the public signup endpoint.
    // When the caller is a superuser creating a privileged role, use the
    // dedicated staff route that bypasses the self-service restriction.
    // Every account a superuser makes goes through the staff route, which
    // records who made it and makes its owner choose their own password.
    let endpoint = `${API}/users`;
    try {
      const session = JSON.parse(localStorage.getItem('lannent_session') || '{}');
      if (session.role === 'superuser') endpoint = `${API}/users/staff`;
    } catch {}
    // No local fallback: a signup the server refused (e.g. a taken email)
    // used to create a fake account in the cache and carry on.
    const result = _write('POST', endpoint, data);
    _cache.users.push(result);
    return result;
  }

  function updateUser(id, updates) {
    const result = _write('PATCH', `${API}/users/${id}`, updates);
    const idx = _cache.users.findIndex(u => u.id === id);
    if (idx >= 0) _cache.users[idx] = result;
    return result;
  }

  function deleteUser(id) {
    _write('DELETE', `${API}/users/${id}`);
    _cache.users = _cache.users.filter(u => u.id !== id);
  }

  // Balance changes must never fall back to a cache-only mutation: that reports
  // success for money the server never moved, and the change is lost on reload.
  // (`deductFromWallet` was removed along with its unrecorded server route.)

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
    const result = _write('POST', `${API}/users/${userId}/wallet/add`, { amount });
    _refreshUser(userId);
    _refreshTransactions();
    return result;
  }

  /** Withdraws to an external account. Returns { gross, fee, net, balance }. */
  function withdrawFromWallet(userId, amount) {
    const result = _write('POST', `${API}/users/${userId}/wallet/withdraw`, { amount });
    _refreshUser(userId);
    _refreshTransactions();
    return result;
  }

  /** Escrow held on the signed-in user's projects, bucket by bucket. */
  function getMyEscrow() {
    return _syncFetch(`${API}/ledger/my-escrow`) || { projects: [], totals: { project: 0, audit: 0, dispute: 0, total: 0 } };
  }

  /**
   * Changing a password ends every other session. The server hands this one a
   * fresh token, kept here so the person who changed it stays signed in.
   */
  function changePassword(userId, currentPassword, newPassword) {
    const result = _write('POST', `${API}/users/${userId}/password`, { currentPassword, newPassword });
    try {
      if (result && result.token) localStorage.setItem('lannent_token', result.token);
      const session = JSON.parse(localStorage.getItem('lannent_session') || '{}');
      if (session.mustChangePassword) {
        session.mustChangePassword = false;
        localStorage.setItem('lannent_session', JSON.stringify(session));
      }
    } catch {}
    return result;
  }

  /** Re-reads one user (e.g. the signed-in one after a balance change). */
  function refreshUser(userId) { return _refreshUser(userId); }

  /** Re-reads everything a page may depend on after a write. */
  function refresh(...keys) {
    const paths = {
      users: '/users', tasks: '/tasks', milestones: '/milestones', proposals: '/proposals',
      auditRequests: '/audit-requests', auditReports: '/audit-reports', disputes: '/disputes',
      transactions: '/transactions', notifications: '/notifications', messages: '/messages',
    };
    for (const k of keys) {
      if (!paths[k]) continue;
      const data = _syncFetch(API + paths[k]);
      if (data) _cache[k] = data;
    }
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
  // The server decides which side an offer comes from (the caller), so
  // `offeredBy` is no longer sent.
  function makeAuditOffer(id, { amount, note }) {
    const r = _write('POST', `${API}/audit-requests/${id}/offers`, { amount, note });
    _refreshAuditRequests();
    return r;
  }
  function acceptAuditOffer(id, offerId) {
    const r = _write('POST', `${API}/audit-requests/${id}/offers/${offerId}/accept`, {});
    _refreshAuditRequests();
    return r;
  }
  function fundAuditEscrow(id) {
    const r = _write('POST', `${API}/audit-requests/${id}/fund`, {});
    _refreshAuditRequests(); _refreshUser(_sessionUserId()); _refreshTransactions();
    return r;
  }
  /** After a decline: ask a different reviewer, with a fresh opening offer. */
  function reassignAudit(id, expertId, openingOffer) {
    const r = _write('POST', `${API}/audit-requests/${id}/reassign`, { expertId, openingOffer });
    _refreshAuditRequests();
    refresh('disputes');
    return r;
  }
  function acceptAuditEngagement(id) {
    const r = _write('POST', `${API}/audit-requests/${id}/accept`, {});
    _refreshAuditRequests();
    const tasks = _syncFetch(`${API}/tasks`);
    if (tasks) _cache.tasks = tasks;
    return r;
  }
  function declineAuditEngagement(id, reason) {
    const r = _write('POST', `${API}/audit-requests/${id}/decline`, { reason });
    _refreshAuditRequests(); _refreshUser(_sessionUserId());
    return r;
  }
  /** Withdraws a request the reviewer has not accepted; any funded fee comes back. */
  function cancelAuditRequest(id) {
    const r = _write('POST', `${API}/audit-requests/${id}/cancel`, {});
    refresh('auditRequests', 'disputes', 'milestones', 'transactions');
    _refreshUser(_sessionUserId());
    return r;
  }
  function cancelDraftTask(taskId) {
    const r = _write('POST', `${API}/tasks/${taskId}/cancel-draft`, {});
    refresh('tasks', 'auditRequests', 'transactions');
    _refreshUser(_sessionUserId());
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
  function updateFeeConfig(patch)   { return _write('PATCH', `${API}/revenue/fee-config`, patch); }

  // ─── FEE PREVIEW ──────────────────────────────────────────────────────────
  // Mirrors back-end/src/modules/ledger/fee-config.ts so forms can show the
  // charge before it is committed. The server always recomputes authoritatively.
  // Defaults until init() reads the server's current rates.
  let FEES = {
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

  /** Replaces the preview rates with the server's current ones. */
  function _applyRates(r) {
    try {
      const inf = t => t.map(x => ({ ...x, upTo: x.upTo == null ? Infinity : x.upTo }));
      if (r.deposit) FEES.deposit = r.deposit;
      if (r.clientMarketplace) FEES.clientMarketplace = r.clientMarketplace;
      if (Array.isArray(r.contractInitiation)) FEES.contractInitiation = inf(r.contractInitiation);
      if (Array.isArray(r.workerService)) FEES.workerService = inf(r.workerService);
      if (r.expertService) FEES.expertService = r.expertService;
      if (r.withdrawal) FEES.withdrawal = r.withdrawal;
    } catch (e) { /* keep the defaults */ }
  }

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
    /** Hiring: the budget is already held, so only the contract fees are charged. */
    projectFunding(budget) {
      const marketplace = _round2(budget * (FEES.clientMarketplace.percent / 100));
      const initiation = _tier(FEES.contractInitiation, budget).fee;
      return { budget, marketplace, initiation, fees: _round2(marketplace + initiation), total: _round2(budget + marketplace + initiation) };
    },
    rates() { return FEES; },
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

  // Posting a project moves its budget into escrow, and cancelling or
  // deleting one returns it — so each of these refreshes the wallet.
  function createTask(data) {
    const result = _write('POST', `${API}/tasks`, data);
    _cache.tasks.push(result);
    _refreshUser(result.clientId);
    _refreshTransactions();
    refresh('auditRequests');
    return result;
  }

  function updateTask(id, updates) {
    const result = _write('PATCH', `${API}/tasks/${id}`, updates);
    const idx = _cache.tasks.findIndex(t => t.id === id);
    if (idx >= 0) _cache.tasks[idx] = result;
    _refreshUser(result.clientId);
    _refreshTransactions();
    return result;
  }

  function deleteTask(id) {
    const task = _cache.tasks.find(t => t.id === id);
    const result = _write('DELETE', `${API}/tasks/${id}`);
    _cache.tasks = _cache.tasks.filter(t => t.id !== id);
    _cache.milestones = _cache.milestones.filter(m => m.taskId !== id);
    if (task) _refreshUser(task.clientId);
    _refreshTransactions();
    return result;
  }

  /** What cancelling (or deleting) a project would cost and refund, from the server. */
  function getCancellationQuote(id) {
    return _write('GET', `${API}/tasks/${id}/cancellation-quote`);
  }

  /** Cancels an open project nobody was hired for; the server keeps the fee and refunds the rest. */
  function cancelTask(id) {
    const result = _write('PATCH', `${API}/tasks/${id}`, { status: 'cancelled' });
    const { cancellation: _cancellation, ...task } = result || {};
    const idx = _cache.tasks.findIndex(t => t.id === id);
    if (idx >= 0) _cache.tasks[idx] = task;
    refresh('auditRequests', 'proposals');
    _refreshUser(task.clientId);
    _refreshTransactions();
    return result;
  }


  // ─── MILESTONES ───────────────────────────────────────────────────────────
  function getMilestones() { return _cache.milestones; }
  function getMilestonesByTask(taskId) { return _cache.milestones.filter(m => m.taskId === taskId); }
  function getMilestoneById(id) { return _cache.milestones.find(m => m.id === id) || null; }

  function createMilestone(data) {
    const result = _write('POST', `${API}/milestones`, data);
    _cache.milestones.push(result);
    return result;
  }

  /**
   * Posts a project with its milestones in one request. The server checks
   * them all before any money moves — the old way posted the project, then
   * deleted it again if a milestone was refused, which could charge a
   * cancellation fee for a project that never really existed.
   */
  function createTaskWithMilestones(taskData, milestones) {
    const task = createTask({ ...taskData, milestones });
    refresh('milestones');
    return task;
  }

  /** Removes a milestone that has not started, before anyone is hired. */
  function deleteMilestone(id) {
    const result = _write('DELETE', `${API}/milestones/${id}`);
    _cache.milestones = _cache.milestones.filter(m => m.id !== id);
    return result;
  }

  /** Whether the client may end the contract because the worker stopped delivering. */
  function getNonDeliveryStatus(taskId) {
    return _syncFetch(`${API}/tasks/${taskId}/non-delivery`) || { eligible: false, reason: '' };
  }

  /** Ends a contract for non-delivery: undelivered milestones are cancelled and refunded. */
  function endForNonDelivery(taskId) {
    const result = _write('POST', `${API}/tasks/${taskId}/end-for-non-delivery`, {});
    refresh('tasks', 'milestones', 'auditRequests', 'transactions');
    _refreshUser(_sessionUserId());
    return result;
  }

  function updateMilestone(id, updates) {
    const result = _write('PATCH', `${API}/milestones/${id}`, updates);
    const idx = _cache.milestones.findIndex(m => m.id === id);
    if (idx >= 0) _cache.milestones[idx] = result;
    return result;
  }

  function _checkTaskCompletion(taskId) {
    const t = _syncFetch(`${API}/tasks/${taskId}`);
    if (t) { const idx = _cache.tasks.findIndex(x => x.id === taskId); if (idx >= 0) _cache.tasks[idx] = t; }
  }

  function submitDeliverable(milestoneId, deliverable) {
    // A refusal surfaces with the server's reason. (Re-sending it as a PATCH
    // once silently dropped the deliverable; keeping a local copy when the
    // server is down would show a submission the client never receives.)
    const result = _write('POST', `${API}/milestones/${milestoneId}/submit`, { deliverable });
    const idx = _cache.milestones.findIndex(m => m.id === milestoneId);
    if (idx >= 0) _cache.milestones[idx] = result;
    return result;
  }

  function approveDeliverable(milestoneId) {
    // No fallback: marking a milestone paid locally when the server refused
    // to release escrow showed money moving that never moved.
    const result = _write('POST', `${API}/milestones/${milestoneId}/approve`, {});
    const idx = _cache.milestones.findIndex(m => m.id === milestoneId);
    if (idx >= 0) _cache.milestones[idx] = result;
    // Refresh tasks, users, and transactions cache to get updated progress/wallet/releases
    const ms = result;
    if (ms.taskId) _checkTaskCompletion(ms.taskId);
    _refreshTransactions();
    // Completing the last milestone returns any unused budget to the client.
    const task = _cache.tasks.find(t => t.id === ms.taskId);
    if (task && task.clientId) _refreshUser(task.clientId);
    return result;
  }

  // ─── APPLICATIONS & INVITATIONS ───────────────────────────────────────────
  // There is no bidding: the client's budget is the price. A worker applies
  // and the client accepts; a client invites and the worker accepts. Either
  // acceptance hires the worker and starts the project.
  function getProposals() { return _cache.proposals; }
  function getProposalsByTask(taskId) { return _cache.proposals.filter(p => p.taskId === taskId); }
  function getApplicationsByWorker(workerId) { return _cache.proposals.filter(p => p.workerId === workerId && p.type === 'application'); }
  function getInvitationsByWorker(workerId) { return _cache.proposals.filter(p => p.workerId === workerId && p.type === 'invitation'); }

  /** Whether someone could be hired onto this project now: open, with milestones adding up to the budget. */
  function isReadyToHire(task) {
    if (!task || task.status !== 'open' || task.workerId) return false;
    const list = _cache.milestones.filter(m => m.taskId === task.id);
    const total = list.reduce((a, m) => a + (Number(m.budget) || 0), 0);
    return list.length > 0 && Math.abs(total - Number(task.budget)) < 0.005;
  }

  function _putProposal(result) {
    const idx = _cache.proposals.findIndex(p => p.id === result.id);
    if (idx >= 0) _cache.proposals[idx] = result; else _cache.proposals.push(result);
    return result;
  }

  /** A worker applies to an open project at its posted budget. */
  function applyToTask(taskId, message) {
    return _putProposal(_write('POST', `${API}/proposals`, { taskId, message }));
  }

  /** A client invites a worker to their open project at its posted budget. */
  function sendInvitation({ taskId, workerId, message }) {
    return _putProposal(_write('POST', `${API}/proposals`, { taskId, workerId, message }));
  }

  /** Whoever sent a pending application or invitation takes it back. */
  function withdrawProposal(id) {
    return _putProposal(_write('PATCH', `${API}/proposals/${id}`, { status: 'withdrawn' }));
  }

  /**
   * The client accepts an application, or the invited worker accepts an
   * invitation. Either hires the worker and moves money, so everything it
   * touches is re-read.
   */
  function acceptProposal(id) {
    const result = _write('POST', `${API}/proposals/${id}/accept`, {});
    refresh('proposals', 'tasks', 'milestones');
    _refreshTransactions();
    _refreshUser(_sessionUserId());
    return result;
  }

  /** The client rejects an application, or the invited worker declines an invitation. */
  function declineProposal(id) {
    return _putProposal(_write('POST', `${API}/proposals/${id}/decline`, {}));
  }

  // ─── AUDIT REQUESTS ──────────────────────────────────────────────────────
  function getAuditRequests() { return _cache.auditRequests; }
  function getAuditRequestById(id) { return _cache.auditRequests.find(a => a.id === id) || null; }

  function createAuditRequest(data) {
    const result = _write('POST', `${API}/audit-requests`, data);
    _cache.auditRequests.push(result);
    return result;
  }

  function updateAuditRequest(id, updates) {
    const result = _write('PATCH', `${API}/audit-requests/${id}`, updates);
    const idx = _cache.auditRequests.findIndex(a => a.id === id);
    if (idx >= 0) _cache.auditRequests[idx] = result;
    return result;
  }

  // ─── AUDIT REPORTS ────────────────────────────────────────────────────────
  function getAuditReports() { return _cache.auditReports; }
  /**
   * One engagement now covers every milestone on the project, so a report is
   * identified by the pair. Called with only an engagement id it returns that
   * engagement's first report, which is what the pre-milestone callers expect.
   */
  function getAuditReportByRequest(auditRequestId, milestoneId) {
    if (milestoneId === undefined) {
      return _cache.auditReports.find(r => r.auditRequestId === auditRequestId) || null;
    }
    return _cache.auditReports.find(r =>
      r.auditRequestId === auditRequestId && (r.milestoneId || null) === (milestoneId || null)) || null;
  }

  /** Every report filed under one engagement, newest first. */
  function getReportsByRequest(auditRequestId) {
    return _cache.auditReports.filter(r => r.auditRequestId === auditRequestId);
  }
  function getReportsByTask(taskId) { return _cache.auditReports.filter(r => r.taskId === taskId); }

  function saveAuditReport(data) {
    // No retry and no local fallback (a retry with a forged `role: expert`
    // header, and a fake cached report, were both removed earlier). The
    // request headers — bearer token included — are no longer logged to the
    // console here.
    const result = _write('POST', `${API}/audit-reports`, data);
    const existing = _cache.auditReports.findIndex(r =>
      r.auditRequestId === data.auditRequestId && (r.milestoneId || null) === (data.milestoneId || null));
    if (existing >= 0) _cache.auditReports[existing] = result;
    else _cache.auditReports.push(result);
    // Refresh related caches
    const ar = _syncFetch(`${API}/audit-requests`);
    const ms = _syncFetch(`${API}/milestones`);
    if (ar) _cache.auditRequests = ar;
    if (ms) _cache.milestones = ms;
    return result;
  }

  // ─── DISPUTES ─────────────────────────────────────────────────────────────
  function getDisputes() { return _cache.disputes; }
  function getDisputeById(id) { return _cache.disputes.find(d => d.id === id) || null; }

  function createDispute(data) {
    const result = _write('POST', `${API}/disputes`, data);
    _cache.disputes.push(result);
    refresh('milestones', 'auditRequests');
    return result;
  }

  /** The client withdraws a dispute the reviewer has not accepted yet. */
  function withdrawDispute(id) {
    const result = _write('POST', `${API}/disputes/${id}/withdraw`, {});
    refresh('disputes', 'milestones', 'auditRequests', 'transactions');
    _refreshUser(_sessionUserId());
    return result;
  }

  function resolveDispute(id, { verdict, resolution }) {
    // The server records the caller as the reviewer, so no expertId is sent.
    const result = _write('POST', `${API}/disputes/${id}/resolve`, { verdict, resolution });
    refresh('disputes', 'milestones', 'tasks', 'auditRequests', 'transactions');
    _refreshUser(_sessionUserId());
    return result;
  }

  // ─── TRANSACTIONS ─────────────────────────────────────────────────────────
  function getTransactions() { return _cache.transactions; }
  function getTransactionsByUser(userId) { return _cache.transactions.filter(t => t.fromId === userId || t.toId === userId); }

  // `createTransaction` was removed with its server route. Ledger rows are
  // written by the server alongside the money movement they record.

  // ─── EXPERT APPLICATIONS ──────────────────────────────────────────────────
  function getExpertApplications() { return _cache.expertApplications || []; }
  function getExpertApplicationById(id) { return (_cache.expertApplications || []).find(a => a.id === id) || null; }
  function getExpertApplicationByEmail(email) { return (_cache.expertApplications || []).find(a => a.email.toLowerCase() === email.toLowerCase()) || null; }

  function saveExpertApplication(data) {
    // The server rejects a duplicate email itself; this cache is empty for
    // anyone who is not intake staff, so a local check never caught one.
    try {
      const result = _write('POST', `${API}/expert-applications`, data);
      if (_cache.expertApplications) _cache.expertApplications.push(result);
      return { success: true, application: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function updateExpertApplicationStatus(id, status) {
    const result = _write('PATCH', `${API}/expert-applications/${id}/status`, { status });
    const idx = _cache.expertApplications.findIndex(a => a.id === id);
    if (idx >= 0) _cache.expertApplications[idx] = result;
    // Refresh users (auto-created on approval)
    if (status === 'approved') {
      const users = _syncFetch(`${API}/users`);
      if (users) _cache.users = users;
    }
    return result;
  }

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  function getNotifications(userId) { return (_cache.notifications || []).filter(n => n.userId === userId); }

  function markNotificationsRead(userId) {
    try { _write('PATCH', `${API}/notifications/${userId}/read-all`, {}); } catch (e) { console.warn('[Store]', e.message); }
    // Update local cache
    (_cache.notifications || []).forEach(n => {
      if (n.userId === userId) n.read = true;
    });
  }

  // ─── MESSAGES ──────────────────────────────────────────────────────────────
  function getMessagesByTask(taskId) { return (_cache.messages || []).filter(m => m.taskId === taskId); }
  function getMessagesByUser(userId) { return (_cache.messages || []).filter(m => m.senderId === userId || m.receiverId === userId); }

  /** Sends a chat message (the server notifies the receiver). `attachment` is a stored file reference. */
  function sendMessage({ taskId, receiverId, content, attachment }) {
    const result = _write('POST', `${API}/messages`, { taskId, receiverId, content, ...(attachment ? { attachment } : {}) });
    _cache.messages.push(result);
    return result;
  }

  /** Re-reads the signed-in user's conversations. */
  function refreshMessages() {
    const data = _syncFetch(`${API}/messages`);
    if (data) _cache.messages = data;
    return _cache.messages;
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────
  return {
    init, initAsync, resetToSeed, isOnline,
    getUsers, getUserById, getUserByEmail, createUser, updateUser, deleteUser, addToWallet, withdrawFromWallet, Fees, getLedgerSummary, getEscrowForTask,
    getRevenueSummary, getRevenueByFeeType, getRevenueTimeseries, getRevenueByUser,
    getRevenueDistribution, getRevenueByProject, getProjectBreakdown, getFeeConfig, updateFeeConfig,
    getTasks, getTaskById, getTasksByClient, getTasksByWorker, getOpenTasks, createTask, updateTask, deleteTask,
    getCancellationQuote, cancelTask,
    getMilestones, getMilestonesByTask, getMilestoneById, createMilestone, updateMilestone, deleteMilestone, submitDeliverable, approveDeliverable,
    getNonDeliveryStatus, endForNonDelivery,
    getProposals, getProposalsByTask, getApplicationsByWorker, getInvitationsByWorker, isReadyToHire,
    applyToTask, sendInvitation, withdrawProposal, acceptProposal, declineProposal,
    getAuditRequests, getAuditRequestById, createAuditRequest, updateAuditRequest,
    getAuditPreview, getAuditRequestsByTask, makeAuditOffer, acceptAuditOffer, fundAuditEscrow,
    acceptAuditEngagement, declineAuditEngagement, cancelDraftTask, cancelAuditRequest, getExperts,
    uploadFile, fileUrl, downloadFile, deleteFile,
    getAuditReports, getAuditReportByRequest, getReportsByRequest, getReportsByTask, saveAuditReport,
    getDisputes, getDisputeById, createDispute, resolveDispute, withdrawDispute,
    getTransactions, getTransactionsByUser,
    getNotifications, markNotificationsRead, markNotificationRead, refreshNotifications,
    getMessagesByTask, getMessagesByUser, sendMessage, refreshMessages,
    getMyEscrow, changePassword,
    refreshUser, refresh, reassignAudit, createTaskWithMilestones,
    getExpertApplications, getExpertApplicationById, getExpertApplicationByEmail, saveExpertApplication, updateExpertApplicationStatus,
  };
})();


const StoreContext = createContext(Store);

/** Makes the Store available to every component below it. */
export function StoreProvider({ children }) {
  return <StoreContext.Provider value={Store}>{children}</StoreContext.Provider>;
}

/** The app's Store (same API as the original global `Store`). */
export function useStore() {
  return useContext(StoreContext);
}
