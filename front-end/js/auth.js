/**
 * LANNENT — Auth Module (API-backed)
 * Session management: login via backend API, logout, getCurrentUser, role guards.
 */

const Auth = (() => {
  const SESSION_KEY = 'lannent_session';
  const TOKEN_KEY = 'lannent_token';
  const API = (typeof LANNENT_API !== 'undefined')
    ? LANNENT_API
    : 'http://localhost:3000/api';

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
          } catch(e) {}
          return { success: true, user, session, token: data.token };
        }
      } else {
        const err = JSON.parse(xhr.responseText);
        return { success: false, error: err.message || 'Login failed.' };
      }
    } catch(e) {
      // API unavailable — fall back to Store lookup
      const user = Store.getUserByEmail(email);
      if (!user) return { success: false, error: 'No account found with this email address.' };
      if (user.password !== password) return { success: false, error: 'Incorrect password. Please try again.' };
      if (user.status === 'suspended') return { success: false, error: 'This account has been suspended. Contact support.' };

      const session = { userId: user.id, role: user.role, name: user.name, email: user.email, avatar: user.avatar, avatarColor: user.avatarColor };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch(e2) {}
      return { success: true, user, session };
    }

    return { success: false, error: 'Login failed. Please try again.' };
  }

  function logout() {
    // The token has to go with the session, or the next sign-in inherits the
    // previous person's credentials.
    try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(TOKEN_KEY); } catch(e) {}
    window.location.href = _getRoot() + 'index.html';
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch(e) { return null; }
  }

  function isLoggedIn() { return getCurrentUser() !== null; }

  function _getRoot() {
    // Detect whether we're in pages/ subdirectory or root
    const path = window.location.pathname;
    return path.includes('/pages/') ? '../' : './';
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = _getRoot() + 'pages/login.html';
      return false;
    }
    return true;
  }

  function requireRole(...roles) {
    const user = getCurrentUser();
    if (!user) { window.location.href = _getRoot() + 'pages/login.html'; return false; }
    const allowed = roles.flat();
    if (!allowed.includes(user.role)) {
      // Redirect to their correct dashboard
      window.location.href = _getRoot() + 'pages/' + getDashboardUrl(user.role);
      return false;
    }
    return true;
  }

  // Single source of truth for where each role lands after signing in.
  const DASHBOARDS = {
    client:    'client-dashboard.html',
    worker:    'worker-dashboard.html',
    expert:    'expert-dashboard.html',
    superuser: 'superuser-dashboard.html',
    'revenue-admin':    'admin-revenue.html',
    'intake-admin':     'admin-expert-applications.html',
    'compliance-admin': 'compliance-dashboard.html',
  };

  function getDashboardUrl(role) {
    return DASHBOARDS[role] || 'login.html';
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch(e) { return ''; }
  }

  return { login, logout, getToken, getCurrentUser, isLoggedIn, requireAuth, requireRole, getDashboardUrl };
})();
