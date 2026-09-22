/**
 * LANNENT — Auth Utilities  (src/lib/auth.js)
 *
 * Pure localStorage helpers — no React, no side effects.
 * Safe to import in any component, hook, or utility.
 *
 * Keys are identical to the vanilla JS app so localStorage sessions survive
 * side-by-side use during the migration window.
 */

const SESSION_KEY = 'lannent_session';
const TOKEN_KEY   = 'lannent_token';

// ─── Getters ─────────────────────────────────────────────────────────────────

/**
 * Returns the current session object, or null if none is stored.
 * Session shape: { userId, role, name, email, avatar, avatarColor }
 * @returns {object|null}
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Returns the stored JWT string, or an empty string if none.
 * @returns {string}
 */
export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

/**
 * Returns true if a valid session exists in localStorage.
 * @returns {boolean}
 */
export function isLoggedIn() {
  return getSession() !== null;
}

// ─── Setters / clearers ───────────────────────────────────────────────────────

/**
 * Persists a session + token pair to localStorage.
 * Called by AuthContext after a successful login response.
 *
 * @param {object} session - Session object from the API
 * @param {string} [token] - JWT returned alongside the session
 */
export function setSession(session, token) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Private/incognito mode — silently ignore
  }
}

/**
 * Removes both the session and token from localStorage.
 * Call this on logout — never remove them individually.
 */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // noop
  }
}

// ─── Role → route mapping ─────────────────────────────────────────────────────

/**
 * Maps every role to its React-Router dashboard path.
 * This is the single source of truth for post-login redirects.
 * Must stay in sync with the <Route> definitions in App.jsx.
 */
const DASHBOARD_ROUTES = {
  client:              '/client/dashboard',
  worker:              '/worker/dashboard',
  expert:              '/expert/dashboard',
  superuser:           '/superuser/dashboard',
  'revenue-admin':     '/admin/revenue',
  'intake-admin':      '/admin/expert-applications',
  'compliance-admin':  '/admin/compliance',
};

/**
 * Returns the React-Router path for the given role's dashboard.
 * @param {string} role
 * @returns {string}
 */
export function getDashboardRoute(role) {
  return DASHBOARD_ROUTES[role] || '/login';
}
