/**
 * app slice — page-load status and API reachability.
 *
 * `online` is true once at least one endpoint answered on the last page
 * load. Pages use it to tell "the API is down" apart from "there is
 * genuinely no data yet".
 */
import { createSlice } from '@reduxjs/toolkit';
import { loadAppData } from '../thunks/loadAppData';

const appSlice = createSlice({
  name: 'app',
  initialState: { online: false, loading: false, loadCount: 0 },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadAppData.pending, (state) => { state.loading = true; })
      .addCase(loadAppData.fulfilled, (state, action) => {
        state.loading = false;
        state.online = action.payload.online;
        state.loadCount += 1;
      })
      .addCase(loadAppData.rejected, (state) => { state.loading = false; state.online = false; state.loadCount += 1; });
  },
});

export default appSlice.reducer;

export const selectIsOnline = s => s.app.online;
export const selectAppLoading = s => s.app.loading;
