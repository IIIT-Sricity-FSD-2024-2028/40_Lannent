/**
 * auditRequests slice — Expert Reviewer audit engagements.
 *
 * An audit is a hired, negotiated, escrow-paid engagement:
 *   preview-sent → negotiating → agreed → escrow-funded
 *                → in-progress → report-submitted → paid
 *
 * CRUD: fetchAuditRequests, createAuditRequest, updateAuditRequest,
 *       cancelAuditRequest.
 * Negotiation: makeAuditOffer, acceptAuditOffer, fundAuditEscrow,
 *       acceptAuditEngagement, declineAuditEngagement, reassignAudit.
 * Reads: fetchAuditPreview (kept per request in `previews`).
 */
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiGet, apiPatch, apiPost } from '../api';
import { addCollectionReducers, initialEntityState, makeAdapter, sessionUserId } from '../entity';
import { refreshEntities } from '../thunks/loadAppData';
import { fetchUser } from './usersSlice';
import { fetchTransactions } from './transactionsSlice';
import { fetchTasks } from './tasksSlice';

const adapter = makeAdapter();

// ─── Thunks ────────────────────────────────────────────────────────────────

export const fetchAuditRequests = createAsyncThunk('auditRequests/fetchAll', () => apiGet('/audit-requests'));

export const createAuditRequest = createAsyncThunk('auditRequests/create', (data) => apiPost('/audit-requests', data));

export const updateAuditRequest = createAsyncThunk('auditRequests/update',
  ({ id, updates }) => apiPatch(`/audit-requests/${id}`, updates));

/** What the reviewer sees before accepting: project, milestones, proposed fee. Null when unavailable. */
export const fetchAuditPreview = createAsyncThunk('auditRequests/fetchPreview', async (id) => {
  let preview = null;
  try { preview = await apiGet(`/audit-requests/${id}/preview`); } catch { preview = null; }
  return { id, preview };
});

/** Either side proposes a fee. The server decides which side the offer comes from (the caller). */
export const makeAuditOffer = createAsyncThunk('auditRequests/makeOffer', async ({ id, amount, note }, { dispatch }) => {
  const result = await apiPost(`/audit-requests/${id}/offers`, { amount, note });
  await dispatch(fetchAuditRequests());
  return result;
});

export const acceptAuditOffer = createAsyncThunk('auditRequests/acceptOffer', async ({ id, offerId }, { dispatch }) => {
  const result = await apiPost(`/audit-requests/${id}/offers/${offerId}/accept`, {});
  await dispatch(fetchAuditRequests());
  return result;
});

/** The client moves the agreed fee into escrow. */
export const fundAuditEscrow = createAsyncThunk('auditRequests/fund', async (id, { dispatch, getState }) => {
  const result = await apiPost(`/audit-requests/${id}/fund`, {});
  await Promise.all([
    dispatch(fetchAuditRequests()),
    dispatch(fetchUser(sessionUserId(getState))),
    dispatch(fetchTransactions()),
  ]);
  return result;
});

/** After a decline: ask a different reviewer, with a fresh opening offer. */
export const reassignAudit = createAsyncThunk('auditRequests/reassign',
  async ({ id, expertId, openingOffer }, { dispatch }) => {
    const result = await apiPost(`/audit-requests/${id}/reassign`, { expertId, openingOffer });
    await dispatch(refreshEntities(['auditRequests', 'disputes']));
    return result;
  });

/** The reviewer accepts a funded engagement and starts work. */
export const acceptAuditEngagement = createAsyncThunk('auditRequests/acceptEngagement', async (id, { dispatch }) => {
  const result = await apiPost(`/audit-requests/${id}/accept`, {});
  await Promise.all([dispatch(fetchAuditRequests()), dispatch(fetchTasks())]);
  return result;
});

export const declineAuditEngagement = createAsyncThunk('auditRequests/declineEngagement',
  async ({ id, reason }, { dispatch, getState }) => {
    const result = await apiPost(`/audit-requests/${id}/decline`, { reason });
    await Promise.all([dispatch(fetchAuditRequests()), dispatch(fetchUser(sessionUserId(getState)))]);
    return result;
  });

/** Withdraws a request the reviewer has not accepted; any funded fee comes back. */
export const cancelAuditRequest = createAsyncThunk('auditRequests/cancel', async (id, { dispatch, getState }) => {
  const result = await apiPost(`/audit-requests/${id}/cancel`, {});
  await Promise.all([
    dispatch(refreshEntities(['auditRequests', 'disputes', 'milestones', 'transactions'])),
    dispatch(fetchUser(sessionUserId(getState))),
  ]);
  return result;
});

// ─── Slice ─────────────────────────────────────────────────────────────────

const auditRequestsSlice = createSlice({
  name: 'auditRequests',
  initialState: initialEntityState(adapter, { previews: {} }),
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(createAuditRequest.fulfilled, (state, action) => { adapter.addOne(state, action.payload); })
      .addCase(updateAuditRequest.fulfilled, (state, action) => {
        if (state.entities[action.payload.id]) adapter.setOne(state, action.payload);
      })
      .addCase(fetchAuditPreview.fulfilled, (state, action) => {
        state.previews[action.payload.id] = action.payload.preview;
      });
    addCollectionReducers(builder, adapter, 'auditRequests', fetchAuditRequests);
  },
});

export default auditRequestsSlice.reducer;

// ─── Selectors ─────────────────────────────────────────────────────────────
const selectors = adapter.getSelectors(state => state.auditRequests);
export const selectAllAuditRequests = selectors.selectAll;
export const selectAuditRequestEntities = selectors.selectEntities;
export const selectAuditRequestById = (state, id) => (id ? state.auditRequests.entities[id] || null : null);

export const selectAuditRequestsByTask = createSelector(
  [selectAllAuditRequests, (state, taskId) => taskId],
  (list, taskId) => list.filter(a => a.taskId === taskId),
);

/** The preview for one request: undefined while not fetched, null when unavailable. */
export const selectAuditPreview = (state, id) => state.auditRequests.previews[id];
