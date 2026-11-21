/**
 * proposals slice — applications (worker → project) and invitations (client → worker).
 *
 * There is no bidding: the client's budget is the price. A worker applies and
 * the client accepts; a client invites and the worker accepts. Either
 * acceptance hires the worker and starts the project.
 *
 * CRUD: fetchProposals, applyToTask / sendInvitation (create),
 *       withdrawProposal (update), acceptProposal, declineProposal.
 */
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiGet, apiPatch, apiPost } from '../api';
import { addCollectionReducers, initialEntityState, makeAdapter, sessionUserId } from '../entity';
import { refreshEntities } from '../thunks/loadAppData';
import { fetchUser } from './usersSlice';
import { fetchTransactions } from './transactionsSlice';

const adapter = makeAdapter();

// ─── Thunks ────────────────────────────────────────────────────────────────

export const fetchProposals = createAsyncThunk('proposals/fetchAll', () => apiGet('/proposals'));

/** A worker applies to an open project at its posted budget. */
export const applyToTask = createAsyncThunk('proposals/apply',
  ({ taskId, message }) => apiPost('/proposals', { taskId, message }));

/** A client invites a worker to their open project at its posted budget. */
export const sendInvitation = createAsyncThunk('proposals/invite',
  ({ taskId, workerId, message }) => apiPost('/proposals', { taskId, workerId, message }));

/** Whoever sent a pending application or invitation takes it back. */
export const withdrawProposal = createAsyncThunk('proposals/withdraw',
  (id) => apiPatch(`/proposals/${id}`, { status: 'withdrawn' }));

/**
 * The client accepts an application, or the invited worker accepts an
 * invitation. Either hires the worker and moves money, so everything it
 * touches is re-read.
 */
export const acceptProposal = createAsyncThunk('proposals/accept', async (id, { dispatch, getState }) => {
  const result = await apiPost(`/proposals/${id}/accept`, {});
  await Promise.all([
    dispatch(refreshEntities(['proposals', 'tasks', 'milestones'])),
    dispatch(fetchTransactions()),
    dispatch(fetchUser(sessionUserId(getState))),
  ]);
  return result;
});

/** The client rejects an application, or the invited worker declines an invitation. */
export const declineProposal = createAsyncThunk('proposals/decline',
  (id) => apiPost(`/proposals/${id}/decline`, {}));

// ─── Slice ─────────────────────────────────────────────────────────────────

const upsert = (state, action) => { if (action.payload) adapter.upsertOne(state, action.payload); };

const proposalsSlice = createSlice({
  name: 'proposals',
  initialState: initialEntityState(adapter),
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(applyToTask.fulfilled, upsert)
      .addCase(sendInvitation.fulfilled, upsert)
      .addCase(withdrawProposal.fulfilled, upsert)
      .addCase(declineProposal.fulfilled, upsert);
    addCollectionReducers(builder, adapter, 'proposals', fetchProposals);
  },
});

export default proposalsSlice.reducer;

// ─── Selectors ─────────────────────────────────────────────────────────────
const selectors = adapter.getSelectors(state => state.proposals);
export const selectAllProposals = selectors.selectAll;

export const selectProposalsByTask = createSelector(
  [selectAllProposals, (state, taskId) => taskId],
  (list, taskId) => list.filter(p => p.taskId === taskId),
);
export const selectApplicationsByWorker = createSelector(
  [selectAllProposals, (state, workerId) => workerId],
  (list, workerId) => list.filter(p => p.workerId === workerId && p.type === 'application'),
);
export const selectInvitationsByWorker = createSelector(
  [selectAllProposals, (state, workerId) => workerId],
  (list, workerId) => list.filter(p => p.workerId === workerId && p.type === 'invitation'),
);
