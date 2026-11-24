/**
 * auditReports slice — the reports Expert Reviewers file on audited milestones.
 *
 * One engagement covers every milestone on the project, so a report is
 * identified by (auditRequestId, milestoneId).
 *
 * CRUD: fetchAuditReports, saveAuditReport (create or replace).
 */
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiGet, apiPost } from '../api';
import { addCollectionReducers, initialEntityState, makeAdapter } from '../entity';
import { refreshEntities } from '../thunks/loadAppData';

const adapter = makeAdapter();

export const fetchAuditReports = createAsyncThunk('auditReports/fetchAll', () => apiGet('/audit-reports'));

/** Files (or re-files) a report. Re-reads the engagements and milestones it affects. */
export const saveAuditReport = createAsyncThunk('auditReports/save', async (data, { dispatch }) => {
  const result = await apiPost('/audit-reports', data);
  await dispatch(refreshEntities(['auditRequests', 'milestones']));
  return { data, result };
});

const auditReportsSlice = createSlice({
  name: 'auditReports',
  initialState: initialEntityState(adapter),
  reducers: {},
  extraReducers: builder => {
    builder.addCase(saveAuditReport.fulfilled, (state, action) => {
      const { data, result } = action.payload;
      // Replace the report for the same (engagement, milestone) pair, if any.
      const existing = Object.values(state.entities).find(r =>
        r.auditRequestId === data.auditRequestId && (r.milestoneId || null) === (data.milestoneId || null));
      if (existing && existing.id !== result.id) adapter.removeOne(state, existing.id);
      adapter.upsertOne(state, result);
    });
    addCollectionReducers(builder, adapter, 'auditReports', fetchAuditReports);
  },
});

export default auditReportsSlice.reducer;

// ─── Selectors ─────────────────────────────────────────────────────────────
const selectors = adapter.getSelectors(state => state.auditReports);
export const selectAllAuditReports = selectors.selectAll;

/**
 * The report for one engagement + milestone. Called without a milestone id it
 * returns that engagement's first report.
 */
export function findAuditReport(reports, auditRequestId, milestoneId) {
  if (milestoneId === undefined) return reports.find(r => r.auditRequestId === auditRequestId) || null;
  return reports.find(r =>
    r.auditRequestId === auditRequestId && (r.milestoneId || null) === (milestoneId || null)) || null;
}

export const selectAuditReportByRequest = (state, auditRequestId, milestoneId) =>
  findAuditReport(selectAllAuditReports(state), auditRequestId, milestoneId);

export const selectReportsByRequest = createSelector(
  [selectAllAuditReports, (state, auditRequestId) => auditRequestId],
  (reports, id) => reports.filter(r => r.auditRequestId === id),
);
export const selectReportsByTask = createSelector(
  [selectAllAuditReports, (state, taskId) => taskId],
  (reports, taskId) => reports.filter(r => r.taskId === taskId),
);
