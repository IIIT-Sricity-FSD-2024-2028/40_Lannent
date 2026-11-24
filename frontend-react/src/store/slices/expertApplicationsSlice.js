/**
 * expertApplications slice — applications to become an Expert Reviewer.
 * Readable by the intake / compliance desks only.
 *
 * CRUD: fetchExpertApplications, saveExpertApplication (public submit),
 *       updateExpertApplicationStatus (approving creates the reviewer's account).
 */
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiGet, apiPatch, apiPost } from '../api';
import { addCollectionReducers, initialEntityState, makeAdapter } from '../entity';
import { fetchUsers } from './usersSlice';

const adapter = makeAdapter();

export const fetchExpertApplications = createAsyncThunk('expertApplications/fetchAll',
  () => apiGet('/expert-applications'));

/** Submits an application. The server rejects a duplicate email itself. */
export const saveExpertApplication = createAsyncThunk('expertApplications/create',
  (data) => apiPost('/expert-applications', data));

export const updateExpertApplicationStatus = createAsyncThunk('expertApplications/updateStatus',
  async ({ id, status }, { dispatch }) => {
    const result = await apiPatch(`/expert-applications/${id}/status`, { status });
    // Approval creates the reviewer's account.
    if (status === 'approved') await dispatch(fetchUsers());
    return result;
  });

const expertApplicationsSlice = createSlice({
  name: 'expertApplications',
  initialState: initialEntityState(adapter),
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(saveExpertApplication.fulfilled, (state, action) => {
        if (action.payload && action.payload.id) adapter.upsertOne(state, action.payload);
      })
      .addCase(updateExpertApplicationStatus.fulfilled, (state, action) => {
        if (state.entities[action.payload.id]) adapter.setOne(state, action.payload);
      });
    addCollectionReducers(builder, adapter, 'expertApplications', fetchExpertApplications);
  },
});

export default expertApplicationsSlice.reducer;

const selectors = adapter.getSelectors(state => state.expertApplications);
export const selectAllExpertApplications = selectors.selectAll;
export const selectExpertApplicationById = (state, id) =>
  (id ? state.expertApplications.entities[id] || null : null);
export const selectExpertApplicationByEmail = createSelector(
  [selectAllExpertApplications, (state, email) => email],
  (apps, email) => apps.find(a => (a.email || '').toLowerCase() === String(email || '').toLowerCase()) || null,
);
