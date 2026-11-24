/**
 * disputes slice — a client's dispute over a milestone, decided by an Expert Reviewer.
 *
 * CRUD: fetchDisputes, createDispute, withdrawDispute, resolveDispute.
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiGet, apiPost } from '../api';
import { addCollectionReducers, initialEntityState, makeAdapter, sessionUserId } from '../entity';
import { refreshEntities } from '../thunks/loadAppData';
import { fetchUser } from './usersSlice';

const adapter = makeAdapter();

export const fetchDisputes = createAsyncThunk('disputes/fetchAll', () => apiGet('/disputes'));

export const createDispute = createAsyncThunk('disputes/create', async (data, { dispatch }) => {
  const result = await apiPost('/disputes', data);
  await dispatch(refreshEntities(['milestones', 'auditRequests']));
  return result;
});

/** The client withdraws a dispute the reviewer has not accepted yet. */
export const withdrawDispute = createAsyncThunk('disputes/withdraw', async (id, { dispatch, getState }) => {
  const result = await apiPost(`/disputes/${id}/withdraw`, {});
  await Promise.all([
    dispatch(refreshEntities(['disputes', 'milestones', 'auditRequests', 'transactions'])),
    dispatch(fetchUser(sessionUserId(getState))),
  ]);
  return result;
});

/** The reviewer decides a dispute. The server records the caller as the reviewer. */
export const resolveDispute = createAsyncThunk('disputes/resolve',
  async ({ id, verdict, resolution }, { dispatch, getState }) => {
    const result = await apiPost(`/disputes/${id}/resolve`, { verdict, resolution });
    await Promise.all([
      dispatch(refreshEntities(['disputes', 'milestones', 'tasks', 'auditRequests', 'transactions'])),
      dispatch(fetchUser(sessionUserId(getState))),
    ]);
    return result;
  });

const disputesSlice = createSlice({
  name: 'disputes',
  initialState: initialEntityState(adapter),
  reducers: {},
  extraReducers: builder => {
    builder.addCase(createDispute.fulfilled, (state, action) => { adapter.upsertOne(state, action.payload); });
    addCollectionReducers(builder, adapter, 'disputes', fetchDisputes);
  },
});

export default disputesSlice.reducer;

const selectors = adapter.getSelectors(state => state.disputes);
export const selectAllDisputes = selectors.selectAll;
export const selectDisputeById = (state, id) => (id ? state.disputes.entities[id] || null : null);
