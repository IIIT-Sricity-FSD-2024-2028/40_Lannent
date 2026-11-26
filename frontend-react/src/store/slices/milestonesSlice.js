/**
 * milestones slice — the payable steps of every project.
 *
 * CRUD: fetchMilestones, createMilestone, updateMilestone, deleteMilestone.
 * Workflow: submitDeliverable (worker), approveDeliverable (client — releases escrow).
 */
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiDelete, apiGet, apiPatch, apiPost } from '../api';
import { addCollectionReducers, initialEntityState, makeAdapter } from '../entity';
import { deleteTask, fetchTask } from './tasksSlice';
import { fetchUser } from './usersSlice';
import { fetchTransactions } from './transactionsSlice';

const adapter = makeAdapter();

// ─── Thunks ────────────────────────────────────────────────────────────────

export const fetchMilestones = createAsyncThunk('milestones/fetchAll', () => apiGet('/milestones'));

export const createMilestone = createAsyncThunk('milestones/create', (data) => apiPost('/milestones', data));

export const updateMilestone = createAsyncThunk('milestones/update',
  ({ id, updates }) => apiPatch(`/milestones/${id}`, updates));

/** Removes a milestone that has not started, before anyone is hired. */
export const deleteMilestone = createAsyncThunk('milestones/delete', async (id) => {
  const result = await apiDelete(`/milestones/${id}`);
  return { id, result };
});

/** The worker submits a deliverable (`deliverable` holds the note, links and stored files). */
export const submitDeliverable = createAsyncThunk('milestones/submitDeliverable',
  ({ milestoneId, deliverable }) => apiPost(`/milestones/${milestoneId}/submit`, { deliverable }));

/**
 * The client approves a submission, releasing the milestone's escrow to the
 * worker. Re-reads the task (progress / completion), the ledger and the
 * client's wallet (completing the last milestone returns unused budget).
 */
export const approveDeliverable = createAsyncThunk('milestones/approveDeliverable',
  async (milestoneId, { dispatch, getState }) => {
    const result = await apiPost(`/milestones/${milestoneId}/approve`, {});
    if (result && result.taskId) await dispatch(fetchTask(result.taskId));
    await dispatch(fetchTransactions());
    const task = result && getState().tasks.entities[result.taskId];
    if (task && task.clientId) await dispatch(fetchUser(task.clientId));
    return result;
  });

// ─── Slice ─────────────────────────────────────────────────────────────────

const replaceIfKnown = (state, action) => {
  if (action.payload && state.entities[action.payload.id]) adapter.setOne(state, action.payload);
};

const milestonesSlice = createSlice({
  name: 'milestones',
  initialState: initialEntityState(adapter),
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(createMilestone.fulfilled, (state, action) => { adapter.addOne(state, action.payload); })
      .addCase(updateMilestone.fulfilled, replaceIfKnown)
      .addCase(submitDeliverable.fulfilled, replaceIfKnown)
      .addCase(approveDeliverable.fulfilled, replaceIfKnown)
      .addCase(deleteMilestone.fulfilled, (state, action) => { adapter.removeOne(state, action.payload.id); })
      // A deleted project takes its milestones with it.
      .addCase(deleteTask.fulfilled, (state, action) => {
        const ids = Object.values(state.entities).filter(m => m.taskId === action.payload.id).map(m => m.id);
        adapter.removeMany(state, ids);
      });
    addCollectionReducers(builder, adapter, 'milestones', fetchMilestones);
  },
});

export default milestonesSlice.reducer;

// ─── Selectors ─────────────────────────────────────────────────────────────
const selectors = adapter.getSelectors(state => state.milestones);
export const selectAllMilestones = selectors.selectAll;
export const selectMilestoneEntities = selectors.selectEntities;
export const selectMilestoneById = (state, id) => (id ? state.milestones.entities[id] || null : null);

export const selectMilestonesByTask = createSelector(
  [selectAllMilestones, (state, taskId) => taskId],
  (milestones, taskId) => milestones.filter(m => m.taskId === taskId),
);

/** Whether someone could be hired onto `task` now: open, with milestones adding up to the budget. */
export function isReadyToHire(task, allMilestones) {
  if (!task || task.status !== 'open' || task.workerId) return false;
  const list = allMilestones.filter(m => m.taskId === task.id);
  const total = list.reduce((a, m) => a + (Number(m.budget) || 0), 0);
  return list.length > 0 && Math.abs(total - Number(task.budget)) < 0.005;
}

const EMPTY = Object.freeze([]);
/** `{ [taskId]: milestones[] }` — for looking up many tasks' milestones in a loop. */
export const selectMilestonesGroupedByTask = createSelector([selectAllMilestones], (milestones) => {
  const map = {};
  milestones.forEach(m => { (map[m.taskId] = map[m.taskId] || []).push(m); });
  return map;
});
/** Milestones of one task from a grouped map (a stable empty array when none). */
export const milestonesOf = (grouped, taskId) => grouped[taskId] || EMPTY;
