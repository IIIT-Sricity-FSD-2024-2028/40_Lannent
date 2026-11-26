/**
 * tasks slice — projects.
 *
 * CRUD: fetchTasks, fetchTask, createTask, createTaskWithMilestones,
 *       updateTask, deleteTask.
 * Lifecycle: cancelTask, cancelDraftTask, endForNonDelivery.
 * Reads that are not part of the collection: fetchCancellationQuote,
 * fetchNonDeliveryStatus (kept per task in the slice).
 *
 * Posting, cancelling or deleting a project moves its budget in or out of
 * escrow, so those thunks re-read the client's wallet and the ledger.
 */
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiDelete, apiGet, apiPatch, apiPost } from '../api';
import { addCollectionReducers, initialEntityState, makeAdapter, sessionUserId } from '../entity';
import { refreshEntities } from '../thunks/loadAppData';
import { fetchUser } from './usersSlice';
import { fetchTransactions } from './transactionsSlice';

const adapter = makeAdapter();

// ─── Thunks ────────────────────────────────────────────────────────────────

export const fetchTasks = createAsyncThunk('tasks/fetchAll', () => apiGet('/tasks'));

/** Re-reads one task. Resolves to null on failure. */
export const fetchTask = createAsyncThunk('tasks/fetchOne', async (id) => {
  try { return await apiGet(`/tasks/${id}`); } catch { return null; }
});

export const createTask = createAsyncThunk('tasks/create', async (data, { dispatch }) => {
  const result = await apiPost('/tasks', data);
  await Promise.all([
    dispatch(fetchUser(result.clientId)),
    dispatch(fetchTransactions()),
    dispatch(refreshEntities(['auditRequests'])),
  ]);
  return result;
});

/**
 * Posts a project with its milestones in one request. The server checks
 * them all before any money moves.
 */
export const createTaskWithMilestones = createAsyncThunk('tasks/createWithMilestones',
  async ({ task, milestones }, { dispatch }) => {
    const result = await dispatch(createTask({ ...task, milestones })).unwrap();
    await dispatch(refreshEntities(['milestones']));
    return result;
  });

export const updateTask = createAsyncThunk('tasks/update', async ({ id, updates }, { dispatch }) => {
  const result = await apiPatch(`/tasks/${id}`, updates);
  await Promise.all([dispatch(fetchUser(result.clientId)), dispatch(fetchTransactions())]);
  return result;
});

export const deleteTask = createAsyncThunk('tasks/delete', async (id, { dispatch, getState }) => {
  const task = getState().tasks.entities[id];
  const result = await apiDelete(`/tasks/${id}`);
  await Promise.all([
    task ? dispatch(fetchUser(task.clientId)) : null,
    dispatch(fetchTransactions()),
  ]);
  return { id, result };
});

/** What cancelling (or deleting) a project would cost and refund, from the server. */
export const fetchCancellationQuote = createAsyncThunk('tasks/fetchCancellationQuote',
  async (id) => ({ id, quote: await apiGet(`/tasks/${id}/cancellation-quote`) }));

/** Cancels an open project nobody was hired for; the server keeps the fee and refunds the rest. */
export const cancelTask = createAsyncThunk('tasks/cancel', async (id, { dispatch }) => {
  const result = await apiPatch(`/tasks/${id}`, { status: 'cancelled' });
  const { cancellation: _cancellation, ...task } = result || {};
  await Promise.all([
    dispatch(refreshEntities(['auditRequests', 'proposals'])),
    dispatch(fetchUser(task.clientId)),
    dispatch(fetchTransactions()),
  ]);
  return { task, result };
});

/** Cancels a draft project that is waiting on a pre-hire audit. */
export const cancelDraftTask = createAsyncThunk('tasks/cancelDraft', async (taskId, { dispatch, getState }) => {
  const result = await apiPost(`/tasks/${taskId}/cancel-draft`, {});
  await Promise.all([
    dispatch(refreshEntities(['tasks', 'auditRequests', 'transactions'])),
    dispatch(fetchUser(sessionUserId(getState))),
  ]);
  return result;
});

/** Whether the client may end the contract because the worker stopped delivering. */
export const fetchNonDeliveryStatus = createAsyncThunk('tasks/fetchNonDeliveryStatus', async (taskId) => {
  let status = null;
  try { status = await apiGet(`/tasks/${taskId}/non-delivery`); } catch { status = null; }
  return { taskId, status: status || { eligible: false, reason: '' } };
});

/** Ends a contract for non-delivery: undelivered milestones are cancelled and refunded. */
export const endForNonDelivery = createAsyncThunk('tasks/endForNonDelivery', async (taskId, { dispatch, getState }) => {
  const result = await apiPost(`/tasks/${taskId}/end-for-non-delivery`, {});
  await Promise.all([
    dispatch(refreshEntities(['tasks', 'milestones', 'auditRequests', 'transactions'])),
    dispatch(fetchUser(sessionUserId(getState))),
  ]);
  return result;
});

// ─── Slice ─────────────────────────────────────────────────────────────────

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: initialEntityState(adapter, { cancellationQuotes: {}, nonDelivery: {} }),
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchTask.fulfilled, (state, action) => {
        if (action.payload && state.entities[action.payload.id]) adapter.setOne(state, action.payload);
      })
      .addCase(createTask.fulfilled, (state, action) => { adapter.upsertOne(state, action.payload); })
      .addCase(updateTask.fulfilled, (state, action) => {
        if (state.entities[action.payload.id]) adapter.setOne(state, action.payload);
      })
      .addCase(deleteTask.fulfilled, (state, action) => { adapter.removeOne(state, action.payload.id); })
      .addCase(cancelTask.fulfilled, (state, action) => {
        const { task } = action.payload;
        if (task && state.entities[task.id]) adapter.setOne(state, task);
      })
      .addCase(fetchCancellationQuote.fulfilled, (state, action) => {
        state.cancellationQuotes[action.payload.id] = action.payload.quote;
      })
      .addCase(fetchNonDeliveryStatus.fulfilled, (state, action) => {
        state.nonDelivery[action.payload.taskId] = action.payload.status;
      });
    addCollectionReducers(builder, adapter, 'tasks', fetchTasks);
  },
});

export default tasksSlice.reducer;

// ─── Selectors ─────────────────────────────────────────────────────────────
const selectors = adapter.getSelectors(state => state.tasks);
export const selectAllTasks = selectors.selectAll;
export const selectTaskEntities = selectors.selectEntities;
export const selectTaskById = (state, id) => (id ? state.tasks.entities[id] || null : null);

export const selectTasksByClient = createSelector(
  [selectAllTasks, (state, clientId) => clientId],
  (tasks, clientId) => tasks.filter(t => t.clientId === clientId),
);
export const selectTasksByWorker = createSelector(
  [selectAllTasks, (state, workerId) => workerId],
  (tasks, workerId) => tasks.filter(t => t.workerId === workerId),
);
export const selectOpenTasks = createSelector([selectAllTasks], tasks => tasks.filter(t => t.status === 'open'));

export const selectNonDeliveryStatus = (state, taskId) => state.tasks.nonDelivery[taskId] || null;
export const selectCancellationQuote = (state, taskId) => state.tasks.cancellationQuotes[taskId] || null;
