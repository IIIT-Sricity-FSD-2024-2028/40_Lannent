/**
 * LANNENT — Auth Module
 * Session management: login, logout, getCurrentUser, role guards.
 * Depends on store.js being loaded first.
 */

const Auth = (() => {
  const SESSION_KEY = 'lannent_session';

  function login(email, password) {
    const user = Store.getUserByEmail(email);
    if (!user) return { success: false, error: 'No account found with this email address.' };
    if (user.password !== password) return { success: false, error: 'Incorrect password. Please try again.' };
    if (user.status === 'suspended') return { success: false, error: 'This account has been suspended. Contact support.' };

    const session = { userId: user.id, role: user.role, name: user.name, email: user.email, avatar: user.avatar, avatarColor: user.avatarColor };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch(e) {}
    return { success: true, user, session };
  }

  function logout() {
    try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
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
      const map = { client: 'client-dashboard.html', worker: 'worker-dashboard.html', expert: 'expert-dashboard.html', superuser: 'superuser-dashboard.html' };
      window.location.href = _getRoot() + 'pages/' + (map[user.role] || 'login.html');
      return false;
    }
    return true;
  }

  function getDashboardUrl(role) {
    const map = { client: 'client-dashboard.html', worker: 'worker-dashboard.html', expert: 'expert-dashboard.html', superuser: 'superuser-dashboard.html' };
    return map[role] || 'login.html';
  }

  return { login, logout, getCurrentUser, isLoggedIn, requireAuth, requireRole, getDashboardUrl };
})();
