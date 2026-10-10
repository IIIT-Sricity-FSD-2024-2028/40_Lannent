/**
 * LANNENT — Auth Module (API-backed)
 * Ported from front-end/js/auth.js.
 * Session management: login via backend API, logout, getCurrentUser, role guards.
 *
 * The only difference from the original: URLs are React Router paths
 * ("/client-dashboard") instead of HTML files ("client-dashboard.html").
 */
import Store, { LANNENT_API } from './store';

const Auth = (() => {
  const SESSION_KEY = 'lannent_session';
  const TOKEN_KEY = 'lannent_token';
  const API = LANNENT_API;

  function login(email, password) {
    // Synchronous wrapper: try API first, fall back to Store
    try {
      const xhr = new XMLHttpRequest();
      // /auth/login returns a bearer token alongside the session.
      xhr.open('POST', `${API}/auth/login`, false); // synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ email, password }));

      if (xhr.status === 200 || xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        const data = result.data || result;
        const user = data.user;
        const session = data.session;
        if (user && session) {
          try {
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            // Store.js reads this on every request. Kept beside the session so
            // signing out clears both.
            if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
          } catch (e) {}
          return { success: true, user, session, token: data.token };
        }
      } else {
        const err = JSON.parse(xhr.responseText);
        return { success: false, error: err.message || 'Login failed.' };
      }
    } catch (e) {
      // API unavailable — fall back to Store lookup
      const user = Store.getUserByEmail(email);
      if (!user) return { success: false, error: 'No account found with this email address.' };
      if (user.password !== password) return { success: false, error: 'Incorrect password. Please try again.' };
      if (user.status === 'suspended') return { success: false, error: 'This account has been suspended. Contact support.' };

      const session = { userId: user.id, role: user.role, name: user.name, email: user.email, avatar: user.avatar, avatarColor: user.avatarColor };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e2) {}
      return { success: true, user, session };
    }

    return { success: false, error: 'Login failed. Please try again.' };
  }

  function logout() {
    // The token has to go with the session, or the next sign-in inherits the
    // previous person's credentials.
    try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    // A full page load (as before) so no state from the old session survives.
    window.location.href = '/';
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function isLoggedIn() { return getCurrentUser() !== null; }

  // Single source of truth for where each role lands after signing in.
  const DASHBOARDS = {
    client:    '/client-dashboard',
    worker:    '/worker-dashboard',
    expert:    '/expert-dashboard',
    superuser: '/superuser-dashboard',
    'revenue-admin':    '/admin-revenue',
    'intake-admin':     '/admin-expert-applications',
    'compliance-admin': '/compliance-dashboard',
  };

  function getDashboardUrl(role) {
    return DASHBOARDS[role] || '/login';
  }

  /**
   * Returns null when the current user may see a page restricted to `roles`,
   * otherwise the path they should be sent to instead (login, or their own
   * dashboard). Used by <RequireRole>, which replaces Auth.requireRole().
   */
  function getRoleRedirect(roles) {
    const user = getCurrentUser();
    if (!user) return '/login';
    if (!roles.flat().includes(user.role)) return getDashboardUrl(user.role);
    return null;
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  return { login, logout, getToken, getCurrentUser, isLoggedIn, getRoleRedirect, getDashboardUrl };
})();

export default Auth;
