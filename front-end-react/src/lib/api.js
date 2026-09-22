/**
 * LANNENT — API Client  (src/lib/api.js)
 *
 * Standard fetch wrappers used by every team member.
 * Automatically attaches:
 *   Authorization: Bearer <lannent_token>
 *   x-lannent-session: <lannent_session JSON>
 *
 * Base URL:  import.meta.env.VITE_API_URL  (e.g. http://localhost:3000/api)
 * The Vite dev-server also proxies /api → localhost:3000 so relative paths work.
 *
 * Exports:
 *   apiGet, apiPost, apiPatch, apiDelete  — JSON CRUD helpers
 *   uploadFile                            — multipart/form-data upload
 *   fileUrl                               — builds a full URL to a stored file
 *   downloadFile                          — triggers a browser download
 */

const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY   = 'lannent_token';
const SESSION_KEY = 'lannent_session';

// ─── Header builders ─────────────────────────────────────────────────────────

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

function getSessionRaw() {
  try { return localStorage.getItem(SESSION_KEY) || ''; } catch { return ''; }
}

/**
 * Builds common request headers.
 * @param {boolean} [hasJson=false]  - add Content-Type: application/json
 * @returns {Record<string,string>}
 */
function buildHeaders(hasJson = false) {
  const h = {};
  if (hasJson) h['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;

  // The backend also accepts the raw session string as a fallback identifier
  // during the migration window (AUTH_HEADER_FALLBACK=1 in .env).
  const session = getSessionRaw();
  if (session) h['x-lannent-session'] = session;

  return h;
}

// ─── Core fetch ──────────────────────────────────────────────────────────────

/**
 * Base fetch wrapper — throws an enriched Error on non-2xx responses.
 * @param {string}      url
 * @param {RequestInit} options
 * @returns {Promise<any>}
 */
async function request(url, options = {}) {
  const res = await fetch(url, options);

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      message = body.message || message;
    } catch { /* body wasn't JSON */ }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;       // No Content
  return res.json();
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────

/**
 * GET  /api/<path>
 * @param {string} path  - relative path, e.g. '/tasks' or '/tasks/123'
 * @returns {Promise<any>}
 */
export async function apiGet(path) {
  return request(`${BASE}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
}

/**
 * POST  /api/<path>
 * @param {string} path
 * @param {object} [body={}]
 * @returns {Promise<any>}
 */
export async function apiPost(path, body = {}) {
  return request(`${BASE}${path}`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });
}

/**
 * PATCH  /api/<path>
 * @param {string} path
 * @param {object} [body={}]
 * @returns {Promise<any>}
 */
export async function apiPatch(path, body = {}) {
  return request(`${BASE}${path}`, {
    method: 'PATCH',
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });
}

/**
 * DELETE  /api/<path>
 * @param {string} path
 * @returns {Promise<any>}
 */
export async function apiDelete(path) {
  return request(`${BASE}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
}

// ─── File helpers ─────────────────────────────────────────────────────────────

/**
 * Uploads a file via multipart/form-data.
 *
 * @param {string}   path       - API path, e.g. '/milestones/123/deliverable'
 * @param {File}     file       - The File object from an <input type="file">
 * @param {string}   [fieldName='file'] - Form field name expected by the server
 * @param {object}   [extra={}] - Additional string fields to include in the form
 * @returns {Promise<any>}      - The parsed JSON response
 *
 * @example
 *   const result = await uploadFile('/milestones/abc/deliverable', fileInput.files[0]);
 */
export async function uploadFile(path, file, fieldName = 'file', extra = {}) {
  const form = new FormData();
  form.append(fieldName, file);
  for (const [key, val] of Object.entries(extra)) {
    form.append(key, val);
  }

  // Do NOT set Content-Type — the browser sets it with the boundary automatically.
  const headers = buildHeaders(false);

  return request(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: form,
  });
}

/**
 * Builds the full URL to a file stored on the backend.
 * Useful for <img src>, <video src>, or anchor href downloads.
 *
 * @param {string} storedPath - The path/key returned by the backend (e.g. 'uploads/abc.pdf')
 * @returns {string}  Full URL
 *
 * @example
 *   <img src={fileUrl(deliverable.filePath)} alt="Deliverable" />
 */
export function fileUrl(storedPath) {
  if (!storedPath) return '';
  // Already absolute (e.g. a CDN URL) → return as-is
  if (/^https?:\/\//i.test(storedPath)) return storedPath;
  // Strip /api suffix from base so file paths don't become /api/uploads/…
  const serverRoot = import.meta.env.VITE_API_URL.replace(/\/api$/, '');
  return `${serverRoot}/${storedPath.replace(/^\//, '')}`;
}

/**
 * Fetches a file from the API and triggers a browser download.
 *
 * @param {string} path       - API path to the file endpoint
 * @param {string} filename   - The filename the browser should save as
 * @returns {Promise<void>}
 *
 * @example
 *   await downloadFile('/reports/abc/pdf', 'milestone-report.pdf');
 */
export async function downloadFile(path, filename) {
  const headers = buildHeaders();
  const res = await fetch(`${BASE}${path}`, { method: 'GET', headers });
  if (!res.ok) {
    const err = new Error(`Download failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
