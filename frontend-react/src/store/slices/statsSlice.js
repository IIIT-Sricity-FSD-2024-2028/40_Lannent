/**
 * stats slice — live platform figures for the public landing pages
 * (GET /api/stats/public). `public` stays null until they arrive, or if the
 * API cannot be reached — pages then show no number rather than an invented one.
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { LANNENT_API } from '../api';

export const fetchPublicStats = createAsyncThunk('stats/fetchPublic', async () => {
  const res = await fetch(`${LANNENT_API}/stats/public`);
  if (!res.ok) return null;
  const json = await res.json();
  return json ? (json.data || json) : null;
});

const statsSlice = createSlice({
  name: 'stats',
  initialState: { public: null },
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchPublicStats.fulfilled, (state, a) => { if (a.payload) state.public = a.payload; });
  },
});

export default statsSlice.reducer;

export const selectPublicStats = s => s.stats.public;
