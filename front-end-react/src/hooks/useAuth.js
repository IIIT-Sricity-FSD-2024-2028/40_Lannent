/**
 * LANNENT — useAuth hook  (src/hooks/useAuth.js)
 *
 * The ONLY import Members 2–5 need for authentication.
 * Never import AuthContext or useAuthContext directly in page components.
 *
 * @returns {{ currentUser, isLoggedIn, loading, login, logout }}
 *
 * @example
 *   import { useAuth } from '../hooks/useAuth';
 *   const { currentUser, logout } = useAuth();
 */

import { useAuthContext } from '../context/AuthContext';

export function useAuth() {
  return useAuthContext();
}
