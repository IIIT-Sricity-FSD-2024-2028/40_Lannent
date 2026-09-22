/**
 * LANNENT — AuthContext  (src/context/AuthContext.jsx)
 *
 * Global auth state. Provides { currentUser, isLoggedIn, login, logout }
 * to the entire component tree via the useAuth() hook.
 *
 * Reads localStorage on mount so a hard refresh never logs the user out.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, setSession, clearSession, getDashboardRoute } from '../lib/auth';
import { apiPost } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  // null  = still loading from localStorage
  // false = loaded, not authenticated
  // {...} = session object
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);

  // ── Hydrate from localStorage on first render ──────────────────────────
  useEffect(() => {
    const session = getSession();
    setCurrentUser(session ?? false);
    setLoading(false);
  }, []);

  // ── login ──────────────────────────────────────────────────────────────
  /**
   * Calls POST /auth/login, persists the session, and navigates to the
   * role-specific dashboard.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  const login = useCallback(async (email, password) => {
    try {
      const result = await apiPost('/auth/login', { email, password });
      const data    = result.data || result;
      const { user, session, token } = data;

      if (user && session) {
        setSession(session, token);
        setCurrentUser(session);
        navigate(getDashboardRoute(session.role), { replace: true });
        return { success: true };
      }

      return { success: false, error: 'Login failed. Unexpected server response.' };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed. Please try again.' };
    }
  }, [navigate]);

  // ── logout ─────────────────────────────────────────────────────────────
  /**
   * Clears the session and navigates to /login.
   */
  const logout = useCallback(() => {
    clearSession();
    setCurrentUser(false);
    navigate('/login', { replace: true });
  }, [navigate]);

  // ── Context value ──────────────────────────────────────────────────────
  const value = {
    currentUser,                             // session object | false | null(loading)
    isLoggedIn: !!currentUser,               // boolean
    loading,                                 // true while reading localStorage
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Internal export consumed only by useAuth.js
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
