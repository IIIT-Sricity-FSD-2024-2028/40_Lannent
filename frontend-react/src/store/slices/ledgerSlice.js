/**
 * ledger slice — authoritative escrow and revenue totals from the server.
 *
 * Escrow is never re-derived from transaction rows: milestone-release rows
 * carry the NET paid to the worker, so summing them under-counts what left
 * escrow by the service fee.
 *
 * Reads: fetchLedgerSummary, fetchEscrowForTask(taskId), fetchMyEscrow.
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiGetOrNull } from '../api';

const EMPTY_SUMMARY = { totalHeld: 0, totalRevenue: 0, escrowByTask: {}, revenueEntries: [] };
const EMPTY_TASK_ESCROW = { projectHeld: 0, auditHeld: 0 };
const EMPTY_MY_ESCROW = { projects: [], totals: { project: 0, audit: 0, dispute: 0, total: 0 } };

export const fetchLedgerSummary = createAsyncThunk('ledger/fetchSummary',
  async () => (await apiGetOrNull('/ledger/summary')) || EMPTY_SUMMARY);

export const fetchEscrowForTask = createAsyncThunk('ledger/fetchEscrowForTask', async (taskId) => ({
  taskId, escrow: (await apiGetOrNull(`/ledger/escrow/${taskId}`)) || EMPTY_TASK_ESCROW,
}));

/** Escrow held on the signed-in user's projects, bucket by bucket. */
export const fetchMyEscrow = createAsyncThunk('ledger/fetchMyEscrow',
  async () => (await apiGetOrNull('/ledger/my-escrow')) || EMPTY_MY_ESCROW);

const ledgerSlice = createSlice({
  name: 'ledger',
  initialState: {
    summary: null,        // null until fetched
    escrowByTask: {},     // { [taskId]: { projectHeld, auditHeld } }
    myEscrow: null,       // null until fetched
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchLedgerSummary.fulfilled, (state, a) => { state.summary = a.payload; })
      .addCase(fetchEscrowForTask.fulfilled, (state, a) => { state.escrowByTask[a.payload.taskId] = a.payload.escrow; })
      .addCase(fetchMyEscrow.fulfilled, (state, a) => { state.myEscrow = a.payload; });
  },
});

export default ledgerSlice.reducer;

export const selectLedgerSummary = s => s.ledger.summary;
export const selectEscrowForTask = (s, taskId) => s.ledger.escrowByTask[taskId] || null;
export const selectMyEscrow = s => s.ledger.myEscrow;
export { EMPTY_SUMMARY, EMPTY_MY_ESCROW, EMPTY_TASK_ESCROW };
