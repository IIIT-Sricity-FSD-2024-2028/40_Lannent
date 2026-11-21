/**
 * revenue slice — the revenue desk's reports and the editable fee configuration.
 *
 * Reads: fetchRevenueSummary, fetchRevenueByFeeType, fetchRevenueTimeseries(period),
 *        fetchRevenueByUser, fetchRevenueDistribution, fetchRevenueByProject,
 *        fetchProjectBreakdown(taskId), fetchFeeConfig.
 * Update: updateFeeConfig(patch).
 *
 * A report the server cannot provide falls back to the same empty value the
 * old Store returned (null, or [] for lists).
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiGetOrNull, apiPatch } from '../api';
import { fetchFeeRates } from './feesSlice';

export const fetchRevenueSummary = createAsyncThunk('revenue/fetchSummary',
  () => apiGetOrNull('/revenue/summary'));
export const fetchRevenueByFeeType = createAsyncThunk('revenue/fetchByFeeType',
  async () => (await apiGetOrNull('/revenue/by-fee-type')) || []);
export const fetchRevenueTimeseries = createAsyncThunk('revenue/fetchTimeseries', async (period = 'day') => ({
  period, series: (await apiGetOrNull(`/revenue/timeseries?period=${period || 'day'}`)) || [],
}));
export const fetchRevenueByUser = createAsyncThunk('revenue/fetchByUser',
  async () => (await apiGetOrNull('/revenue/by-user')) || []);
export const fetchRevenueDistribution = createAsyncThunk('revenue/fetchDistribution',
  () => apiGetOrNull('/revenue/distribution'));
export const fetchRevenueByProject = createAsyncThunk('revenue/fetchByProject',
  async () => (await apiGetOrNull('/revenue/by-project')) || []);
export const fetchProjectBreakdown = createAsyncThunk('revenue/fetchProjectBreakdown', async (taskId) => ({
  taskId, breakdown: await apiGetOrNull(`/revenue/project/${taskId}`),
}));
export const fetchFeeConfig = createAsyncThunk('revenue/fetchFeeConfig', () => apiGetOrNull('/revenue/fee-config'));

/** Saves new rates, then re-reads the preview rates every form uses. */
export const updateFeeConfig = createAsyncThunk('revenue/updateFeeConfig', async (patch, { dispatch }) => {
  const result = await apiPatch('/revenue/fee-config', patch);
  dispatch(fetchFeeRates());
  return result;
});

const revenueSlice = createSlice({
  name: 'revenue',
  initialState: {
    summary: null,
    byFeeType: [],
    timeseries: {},          // { [period]: [...] }
    byUser: [],
    distribution: null,
    byProject: [],
    projectBreakdowns: {},   // { [taskId]: breakdown | null }
    feeConfig: null,
    status: 'idle',
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchRevenueSummary.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchRevenueSummary.fulfilled, (state, a) => { state.summary = a.payload; state.status = 'succeeded'; })
      .addCase(fetchRevenueByFeeType.fulfilled, (state, a) => { state.byFeeType = a.payload; })
      .addCase(fetchRevenueTimeseries.fulfilled, (state, a) => { state.timeseries[a.payload.period] = a.payload.series; })
      .addCase(fetchRevenueByUser.fulfilled, (state, a) => { state.byUser = a.payload; })
      .addCase(fetchRevenueDistribution.fulfilled, (state, a) => { state.distribution = a.payload; })
      .addCase(fetchRevenueByProject.fulfilled, (state, a) => { state.byProject = a.payload; })
      .addCase(fetchProjectBreakdown.fulfilled, (state, a) => { state.projectBreakdowns[a.payload.taskId] = a.payload.breakdown; })
      .addCase(fetchFeeConfig.fulfilled, (state, a) => { state.feeConfig = a.payload; })
      .addCase(updateFeeConfig.fulfilled, (state, a) => { if (a.payload) state.feeConfig = a.payload; });
  },
});

export default revenueSlice.reducer;

export const selectRevenueSummary = s => s.revenue.summary;
export const selectRevenueByFeeType = s => s.revenue.byFeeType;
export const selectRevenueTimeseries = (s, period) => s.revenue.timeseries[period];
export const selectRevenueByUser = s => s.revenue.byUser;
export const selectRevenueDistribution = s => s.revenue.distribution;
export const selectRevenueByProject = s => s.revenue.byProject;
export const selectProjectBreakdown = (s, taskId) => s.revenue.projectBreakdowns[taskId];
export const selectFeeConfig = s => s.revenue.feeConfig;
