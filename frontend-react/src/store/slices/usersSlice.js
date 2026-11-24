/**
 * users slice — every account the signed-in user may see, plus wallet actions.
 *
 * CRUD: fetchUsers, fetchUser, createUser, updateUser, deleteUser.
 * Wallet: addToWallet, withdrawFromWallet (each re-reads the user and the ledger).
 */
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiDelete, apiGet, apiPatch, apiPost } from '../api';
import { addCollectionReducers, initialEntityState, makeAdapter } from '../entity';
import { fetchTransactions } from './transactionsSlice';

const adapter = makeAdapter();

// ─── Thunks ────────────────────────────────────────────────────────────────

export const fetchUsers = createAsyncThunk('users/fetchAll', () => apiGet('/users'));

/** Re-reads one user (e.g. the signed-in one after a balance change). Resolves to null on failure. */
export const fetchUser = createAsyncThunk('users/fetchOne', async (id) => {
  if (!id) return null;
  try { return await apiGet(`/users/${id}`); } catch { return null; }
});

/**
 * Creates an account. A superuser's accounts go through the staff route,
 * which records who made them and makes the owner choose their own password.
 */
export const createUser = createAsyncThunk('users/create', (data, { getState }) => {
  const session = getState().auth.session;
  const endpoint = session && session.role === 'superuser' ? '/users/staff' : '/users';
  return apiPost(endpoint, data);
});

export const updateUser = createAsyncThunk('users/update', ({ id, updates }) => apiPatch(`/users/${id}`, updates));

export const deleteUser = createAsyncThunk('users/delete', async (id) => {
  await apiDelete(`/users/${id}`);
  return id;
});

/** Deposits into a wallet. Resolves to the fee breakdown `{ gross, fee, net, balance }`. */
export const addToWallet = createAsyncThunk('users/addToWallet', async ({ userId, amount }, { dispatch }) => {
  const result = await apiPost(`/users/${userId}/wallet/add`, { amount });
  await Promise.all([dispatch(fetchUser(userId)), dispatch(fetchTransactions())]);
  return result;
});

/** Withdraws to an external account. Resolves to `{ gross, fee, net, balance }`. */
export const withdrawFromWallet = createAsyncThunk('users/withdrawFromWallet', async ({ userId, amount }, { dispatch }) => {
  const result = await apiPost(`/users/${userId}/wallet/withdraw`, { amount });
  await Promise.all([dispatch(fetchUser(userId)), dispatch(fetchTransactions())]);
  return result;
});

// ─── Slice ─────────────────────────────────────────────────────────────────

const usersSlice = createSlice({
  name: 'users',
  initialState: initialEntityState(adapter),
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchUser.fulfilled, (state, action) => {
        if (action.payload && action.payload.id) adapter.upsertOne(state, action.payload);
      })
      .addCase(createUser.fulfilled, (state, action) => { adapter.addOne(state, action.payload); })
      .addCase(updateUser.fulfilled, (state, action) => {
        if (action.payload && state.entities[action.payload.id]) adapter.setOne(state, action.payload);
      })
      .addCase(deleteUser.fulfilled, (state, action) => { adapter.removeOne(state, action.payload); });
    addCollectionReducers(builder, adapter, 'users', fetchUsers);
  },
});

export default usersSlice.reducer;

// ─── Selectors ─────────────────────────────────────────────────────────────
const selectors = adapter.getSelectors(state => state.users);
export const selectAllUsers = selectors.selectAll;
export const selectUserEntities = selectors.selectEntities;
export const selectUserById = (state, id) => (id ? state.users.entities[id] || null : null);

/** The signed-in user's full record (balance, profile …), or null. */
export const selectCurrentUserRecord = (state) =>
  state.auth.session ? state.users.entities[state.auth.session.userId] || null : null;

export const selectUserByEmail = createSelector(
  [selectAllUsers, (state, email) => email],
  (users, email) => users.find(u => (u.email || '').toLowerCase() === String(email || '').toLowerCase()) || null,
);

/** Active Expert Reviewers. */
export const selectExperts = createSelector([selectAllUsers],
  users => users.filter(u => u.role === 'expert' && u.status === 'active'));
