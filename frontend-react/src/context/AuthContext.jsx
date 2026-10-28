/**
 * LANNENT — AuthContext
 * Ported from front-end/js/auth.js, and shared with the app through React Context.
 * Session management: login via backend API, logout, getCurrentUser, role guards.
 *
 *   const Auth = useAuth();
 *   Auth.getCurrentUser();  Auth.login(email, password);   // same API as before
 *
 * The session lives in localStorage exactly as before (other code reads and
 * writes it directly), so the context provides the same functions rather than
 * a copy of the session in React state.
 *
 * The only difference from the original: URLs are React Router paths
 * ("/client-dashboard") instead of HTML files ("client-dashboard.html").
 */
import { createContext, useContext, useMemo } from 'react';
import { LANNENT_API, useStore } from './StoreContext';

/** Builds the Auth API on top of the given Store (used as a fallback for login). */
function createAuth(Store) {
  const SESSION_KEY = 'lannent_session';
  const TOKEN_KEY = 'lannent_token';
  const API = LANNENT_API;

  /** `identifier` is an email, or a phone number with its country code ("+919876543210"). */
  function login(identifier, password) {
    // Synchronous wrapper: try API first, fall back to Store
    try {
      const xhr = new XMLHttpRequest();
      // /auth/login returns a bearer token alongside the session.
      xhr.open('POST', `${API}/auth/login`, false); // synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      const who = String(identifier).startsWith('+') ? { phone: identifier } : { email: identifier };
      xhr.send(JSON.stringify({ ...who, password }));

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
      // No offline fallback. It compared the typed password with the cached
      // user's — which the API never sends — so it could only ever fail, and
      // it would have created a session with no token behind it.
      return { success: false, error: 'The server could not be reached. Please try again.' };
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
    // An account created by someone else must choose its own password before
    // anything else (the server refuses every other request until it has).
    if (user.mustChangePassword) return '/change-password';
    if (!roles.flat().includes(user.role)) return getDashboardUrl(user.role);
    return null;
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  return { login, logout, getToken, getCurrentUser, isLoggedIn, getRoleRedirect, getDashboardUrl };
}

const AuthContext = createContext(null);

/** Makes Auth available to every component below it. Must sit inside <StoreProvider>. */
export function AuthProvider({ children }) {
  const Store = useStore();
  const auth = useMemo(() => createAuth(Store), [Store]);
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

/** The Auth API (same functions as the original global `Auth`). */
export function useAuth() {
  return useContext(AuthContext);
}
