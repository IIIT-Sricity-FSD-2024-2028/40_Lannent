/**
 * notifications slice — written by the server whenever something happens to you.
 *
 * CRUD: fetchNotifications (polled by the bell), markNotificationRead,
 *       markAllNotificationsRead. Marking is optimistic: the dot clears at
 *       once, and a failed request is only logged (as before).
 */
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiGet, apiPatch } from '../api';
import { addCollectionReducers, initialEntityState, makeAdapter } from '../entity';

const adapter = makeAdapter();

export const fetchNotifications = createAsyncThunk('notifications/fetchAll', () => apiGet('/notifications'));

export const markNotificationRead = createAsyncThunk('notifications/markRead', async (id) => {
  try { await apiPatch(`/notifications/${id}/read`, {}); } catch (e) { console.warn('[notifications]', e.message); }
  return id;
});

export const markAllNotificationsRead = createAsyncThunk('notifications/markAllRead', async (userId) => {
  try { await apiPatch(`/notifications/${userId}/read-all`, {}); } catch (e) { console.warn('[notifications]', e.message); }
  return userId;
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: initialEntityState(adapter),
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(markNotificationRead.pending, (state, action) => {
        const n = state.entities[action.meta.arg];
        if (n) n.read = true;
      })
      .addCase(markAllNotificationsRead.pending, (state, action) => {
        Object.values(state.entities).forEach(n => { if (n.userId === action.meta.arg) n.read = true; });
      });
    addCollectionReducers(builder, adapter, 'notifications', fetchNotifications);
  },
});

export default notificationsSlice.reducer;

const selectors = adapter.getSelectors(state => state.notifications);
export const selectAllNotifications = selectors.selectAll;
export const selectNotificationsByUser = createSelector(
  [selectAllNotifications, (state, userId) => userId],
  (list, userId) => list.filter(n => n.userId === userId),
);
