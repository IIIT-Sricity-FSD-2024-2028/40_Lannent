/**
 * LANNENT — API client used by every Redux thunk.
 *
 * Replaces the synchronous XHR helpers that lived inside the old
 * StoreContext. Every call is async; thunks await these and put the result in
 * the Redux store. The request contract with the back end is unchanged: the
 * same URLs, the same JSON bodies, and the same `role` / `user-id` /
 * `Authorization` headers read from the session in localStorage.
 */

/**
 * Where the API lives.
 *
 * During development Vite proxies /api to the NestJS server on port 3000
 * (see vite.config.js), so requests stay same-origin. Set VITE_API_URL to
 * point somewhere else, e.g. VITE_API_URL=http://localhost:3000/api.
 */
export const LANNENT_API = import.meta.env.VITE_API_URL || '/api';
const API = LANNENT_API;

export const SESSION_KEY = 'lannent_session';
export const TOKEN_KEY = 'lannent_token';

// ─── Session persistence ───────────────────────────────────────────────────
// The session and token are kept in localStorage (they must survive a reload
// and are sent with every request). The auth slice mirrors them in Redux.

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function readToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export function writeSession(session, token) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } catch { /* storage unavailable */ }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
}

/** The request headers for the signed-in user. */
export function authHeaders({ json = true } = {}) {
  const h = json ? { 'Content-Type': 'application/json' } : {};
  const session = readSession() || {};
  if (session.role) h['role'] = session.role;
  if (session.userId) h['user-id'] = session.userId;
  // The bearer token is authoritative server-side and overrides the two
  // headers above; they stay for sessions created before tokens existed.
  const token = readToken();
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

/**
 * The server no longer accepts our token — it expired (12h), or a dev
 * server restarted with a fresh secret. Sign out and go to the login page,
 * rather than rendering every page as if it were offline.
 */
export function handleUnauthorized(status) {
  if (status !== 401) return;
  if (!readToken()) return;
  clearSession();
  // The password-reset pages are for people who cannot sign in, so a dead
  // token must not bounce them off the link they followed.
  const stay = ['/login', '/forgot-password', '/reset-password'];
  if (typeof window !== 'undefined' && !stay.includes(window.location.pathname)) {
    window.location.href = '/login';
  }
}

function unwrapData(json) {
  return json && json.data !== undefined ? json.data : json;
}

/**
 * Sends one request and resolves to the server's `data`, or throws an Error
 * carrying the server's own message (so a refused write fails visibly).
 */
export async function apiRequest(method, path, body) {
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers: authHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(method === 'GET'
      ? 'The server could not be reached.'
      : 'The server could not be reached, so nothing was saved.');
  }
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (res.ok) return unwrapData(json);
  handleUnauthorized(res.status);
  throw new Error((json && json.message) || `The server refused this request (${res.status}).`);
}

export const apiGet = (path) => apiRequest('GET', path);
export const apiPost = (path, body = {}) => apiRequest('POST', path, body);
export const apiPatch = (path, body = {}) => apiRequest('PATCH', path, body);
export const apiDelete = (path) => apiRequest('DELETE', path);

/**
 * The compliance audit log's read, exactly as that page always sent it: the
 * session headers without a Content-Type, and null for anything but a 200.
 */
export async function apiGetAuditLog(path) {
  try {
    const res = await fetch(API + path, { headers: authHeaders({ json: false }) });
    if (res.status !== 200) return null;
    return (await res.json()).data || null;
  } catch { return null; }
}

/** A GET that resolves to null instead of throwing — for page-load reads. */
export async function apiGetOrNull(path) {
  try { return await apiGet(path); } catch { return null; }
}

/**
 * POSTs without the session headers — for routes used by someone who is not
 * signed in (login, forgot / reset password, expert applications).
 */
export async function apiPostPublic(path, body) {
  let res;
  try {
    res = await fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('The server could not be reached. Please try again.');
  }
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (res.status === 429) throw new Error('Too many attempts. Wait a minute and try again.');
  if (!res.ok || (json && json.success === false)) {
    throw new Error((json && json.message) || `Something went wrong (${res.status}).`);
  }
  return unwrapData(json);
}

// ─── Files ─────────────────────────────────────────────────────────────────

/** Absolute URL for a stored file, for links and download buttons. */
export function fileUrl(ref) {
  if (!ref) return '';
  const path = typeof ref === 'string' ? ref : ref.url;
  if (!path) return '';
  return /^https?:\/\//i.test(path) ? path : API.replace(/\/api$/, '') + path;
}

/**
 * Uploads one file and resolves to the reference a deliverable stores:
 * `{ id, name, size, mime, url }`. Multipart, so the browser sets the
 * content type (and its boundary) itself.
 */
export async function uploadFileRequest(file, meta = {}) {
  const form = new FormData();
  form.append('file', file);
  if (meta.taskId) form.append('taskId', meta.taskId);
  if (meta.milestoneId) form.append('milestoneId', meta.milestoneId);
  if (meta.purpose) form.append('purpose', meta.purpose);

  // An Expert Reviewer applicant has no account yet, so their résumé goes to
  // the public application route.
  const endpoint = meta.purpose === 'expert-application' ? `${API}/files/application` : `${API}/files`;

  const res = await fetch(endpoint, { method: 'POST', headers: authHeaders({ json: false }), body: form });
  let payload = null;
  try { payload = await res.json(); } catch { /* no body */ }
  if (!res.ok || !payload || payload.success === false) {
    throw new Error((payload && payload.message) || `Upload failed (${res.status})`);
  }
  return unwrapData(payload);
}

/** The filename from `Content-Disposition`, preferring the RFC 5987 form. */
function filenameFromResponse(res) {
  try {
    const cd = res.headers.get('Content-Disposition') || '';
    const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
    if (star) return decodeURIComponent(star[1].trim());
    const plain = /filename="?([^";]+)"?/i.exec(cd);
    if (plain) return plain[1].trim();
  } catch { /* ignore */ }
  return '';
}

/** Hands a blob to the browser to save under `name`. */
export function saveBlob(blob, name) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the save while it is still being read.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
}

/**
 * Downloads a stored file with the session's credentials and saves it.
 * `GET /api/files/:id` needs auth, which a plain `<a download>` would not send.
 */
export async function downloadFileRequest(ref, filename) {
  const url = fileUrl(ref);
  if (!url) throw new Error('That file was never stored on the server.');
  const name = filename || (ref && typeof ref === 'object' && ref.name) || 'download';

  let res;
  try {
    res = await fetch(url, { headers: authHeaders({ json: false }) });
  } catch {
    throw new Error('The server could not be reached, so the file was not downloaded.');
  }
  if (!res.ok) {
    let message = '';
    try { message = ((await res.json()) || {}).message || ''; } catch { /* no body */ }
    if (!message) {
      message = res.status === 401 || res.status === 403
        ? 'You are not signed in with an account that can open this file.'
        : `The file could not be downloaded (${res.status}).`;
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  saveBlob(blob, name !== 'download' ? name : (filenameFromResponse(res) || name));
  return true;
}

/** Downloads an authenticated (non-file) route, e.g. a CSV export. */
export async function downloadAuthenticated(path, filename) {
  // Only the bearer token, as the compliance export always sent.
  const h = {};
  const token = readToken();
  if (token) h.Authorization = 'Bearer ' + token;
  const res = await fetch(API + path, { headers: h });
  if (!res.ok) throw new Error(`The export failed (${res.status}).`);
  saveBlob(await res.blob(), filename);
  return true;
}

/** True when `href` points at a stored file, which is a route that needs credentials. */
function isFileHref(href) {
  if (!href) return false;
  const origin = API.replace(/\/api$/, '');
  return href.indexOf(API + '/files/') === 0 || href.indexOf(origin + '/api/files/') === 0 || href.indexOf('/api/files/') === 0;
}

/** A message the user can actually see, on a page whose CSS we cannot assume. */
function notifyDownloadError(message) {
  try {
    const el = document.createElement('div');
    el.setAttribute('role', 'alert');
    el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;' +
      'max-width:min(460px,92vw);background:#dc2626;color:#fff;padding:12px 16px;border-radius:12px;' +
      'font:500 13.5px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,0.25);';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  } catch {
    console.error('[api] download failed:', message);
  }
}

/**
 * Makes every file link work with credentials: clicks on `<a href="/api/files/...">`
 * are intercepted (capture phase) and downloaded through the authenticated fetch.
 * Installed once from main.jsx.
 */
export function installFileLinkInterceptor() {
  if (typeof document === 'undefined' || document.__lannentFileLinks) return;
  document.__lannentFileLinks = true;
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if (!isFileHref(a.getAttribute('href'))) return;
    e.preventDefault();
    if (a.dataset.downloading === '1') return;
    a.dataset.downloading = '1';
    downloadFileRequest(a.getAttribute('href'), a.getAttribute('download') || '')
      .catch(err => notifyDownloadError(err && err.message ? err.message : 'The file could not be downloaded.'))
      .finally(() => { delete a.dataset.downloading; });
  }, true);
}
