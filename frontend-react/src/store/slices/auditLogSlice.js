/**
 * auditLog slice — the compliance desk's read-only audit log.
 *
 * Reads: fetchAuditLog(kind) — the latest 200 events, optionally of one kind.
 * Export: exportAuditLog(kind) — downloads the CSV with the session's credentials
 *         (a plain link carried no token and saved the 401 page as the CSV).
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiGetAuditLog, downloadAuthenticated } from '../api';

const kindQuery = (kind, sep) => (kind ? `${sep}kind=${encodeURIComponent(kind)}` : '');

export const fetchAuditLog = createAsyncThunk('auditLog/fetch', async (kind = '') => ({
  kind, data: await apiGetAuditLog(`/audit-log?limit=200${kindQuery(kind, '&')}`),
}));

export const exportAuditLog = createAsyncThunk('auditLog/export', (kind = '') =>
  downloadAuthenticated(`/audit-log/export${kindQuery(kind, '?')}`,
    `lannent-audit-${new Date().toISOString().slice(0, 10)}${kind ? '-' + kind : ''}.csv`));

const auditLogSlice = createSlice({
  name: 'auditLog',
  initialState: { kind: '', data: null, status: 'idle' },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchAuditLog.pending, (state, a) => { state.status = 'loading'; state.kind = a.meta.arg || ''; })
      .addCase(fetchAuditLog.fulfilled, (state, a) => {
        // Ignore a slower response for a filter the user already changed.
        if ((a.payload.kind || '') !== state.kind) return;
        state.status = 'succeeded';
        state.data = a.payload.data;
      });
  },
});

export default auditLogSlice.reducer;

export const selectAuditLog = s => s.auditLog.data;
export const selectAuditLogKind = s => s.auditLog.kind;
export const selectAuditLogStatus = s => s.auditLog.status;
