/**
 * auth slice — the signed-in session.
 *
 * Replaces AuthContext. The session (and bearer token) still persist in
 * localStorage so they survive a reload and go out with every request; this
 * slice mirrors them so components read the session from the Redux store.
 *
 *   const user = useSelector(selectCurrentUser);   // was Auth.getCurrentUser()
 *   await dispatch(login({ identifier, password })).unwrap();
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  LANNENT_API, apiPost, apiPostPublic, clearSession, readSession, readToken, writeSession,
} from '../api';
import { updateUser } from './usersSlice';

// Single source of truth for where each role lands after signing in.
const DASHBOARDS = {
  client: '/client-dashboard',
  worker: '/worker-dashboard',
  expert: '/expert-dashboard',
  superuser: '/superuser-dashboard',
  'revenue-admin': '/admin-revenue',
  'intake-admin': '/admin-expert-applications',
  'compliance-admin': '/compliance-dashboard',
};

export function getDashboardUrl(role) {
  return DASHBOARDS[role] || '/login';
}

/**
 * Null when `session` may see a page restricted to `roles`, otherwise the path
 * to send them to instead (login, the change-password page, or their own dashboard).
 */
export function getRoleRedirect(session, roles) {
  if (!session) return '/login';
  // An account created by someone else must choose its own password first.
  if (session.mustChangePassword) return '/change-password';
  if (!roles.flat().includes(session.role)) return getDashboardUrl(session.role);
  return null;
}

// ─── Thunks ────────────────────────────────────────────────────────────────

/** `identifier` is an email, or a phone number with its country code ("+919876543210"). */
export const login = createAsyncThunk('auth/login', async ({ identifier, password }) => {
  const who = String(identifier).startsWith('+') ? { phone: identifier } : { email: identifier };
  // Same handling as before: 200/201 with a user and session signs in; any
  // other status shows the server's message (or "Login failed.").
  let res;
  let json;
  try {
    res = await fetch(`${LANNENT_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...who, password }),
    });
    json = await res.json();
  } catch {
    throw new Error('The server could not be reached. Please try again.');
  }
  if (res.status !== 200 && res.status !== 201) throw new Error(json.message || 'Login failed.');
  const data = json.data || json;
  const { user, session, token } = data || {};
  if (!user || !session) throw new Error('Login failed. Please try again.');
  writeSession(session, token);
  return { user, session, token: token || '' };
});

/** Signs out. A full page load follows so no state from the old session survives. */
export const logout = createAsyncThunk('auth/logout', async () => {
  clearSession();
  window.location.href = '/';
});

/**
 * Changing a password ends every other session. The server hands this one a
 * fresh token, kept so the person who changed it stays signed in.
 */
export const changePassword = createAsyncThunk('auth/changePassword', async ({ userId, currentPassword, newPassword }) => {
  const result = await apiPost(`/users/${userId}/password`, { currentPassword, newPassword });
  if (result && result.token) writeSession(null, result.token);
  const session = readSession() || {};
  if (session.mustChangePassword) {
    session.mustChangePassword = false;
    writeSession(session);
  }
  return { session, token: (result && result.token) || readToken() };
});

/** Emails a reset link (if the address has an account). */
export const requestPasswordReset = createAsyncThunk('auth/requestPasswordReset',
  (email) => apiPostPublic('/auth/forgot-password', { email }));

/** Whether a reset link's token is still valid. */
export const checkResetToken = createAsyncThunk('auth/checkResetToken',
  (token) => apiPostPublic('/auth/reset-password/check', { token }));

/** Sets a new password from a reset link. Any session on this device is ended. */
export const resetPassword = createAsyncThunk('auth/resetPassword', async ({ token, password }) => {
  const result = await apiPostPublic('/auth/reset-password', { token, password });
  clearSession();
  return result;
});

// ─── Slice ─────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    session: readSession(),
    token: readToken(),
    status: 'idle',
    error: null,
  },
  reducers: {
    /** The session was replaced from outside (e.g. after a 401). */
    sessionCleared(state) {
      clearSession();
      state.session = null;
      state.token = '';
    },
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.session = action.payload.session;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; })
      .addCase(logout.fulfilled, (state) => { state.session = null; state.token = ''; })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.session = action.payload.session;
        state.token = action.payload.token;
      })
      .addCase(resetPassword.fulfilled, (state) => { state.session = null; state.token = ''; })
      // Saving your own profile (the settings pages pass `syncSession: true`,
      // where they used to call syncSessionFromUser) keeps the session's
      // name / avatar in step.
      .addCase(updateUser.fulfilled, (state, action) => {
        const user = action.payload;
        if (!action.meta.arg.syncSession) return;
        if (!user || !state.session || state.session.userId !== user.id) return;
        state.session = {
          ...state.session, name: user.name, email: user.email, avatar: user.avatar, avatarColor: user.avatarColor,
        };
        writeSession(state.session);
      });
  },
});

export const { sessionCleared } = authSlice.actions;
export default authSlice.reducer;

// ─── Selectors ─────────────────────────────────────────────────────────────
export const selectCurrentUser = (state) => state.auth.session;
export const selectCurrentUserId = (state) => (state.auth.session ? state.auth.session.userId : null);
export const selectCurrentRole = (state) => (state.auth.session ? state.auth.session.role : null);
export const selectIsLoggedIn = (state) => state.auth.session !== null;
export const selectAuthStatus = (state) => state.auth.status;
