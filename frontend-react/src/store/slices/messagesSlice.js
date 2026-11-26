/**
 * messages slice — project chat between client, worker and reviewer.
 *
 * CRUD: fetchMessages (re-read the signed-in user's conversations), sendMessage.
 */
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiGet, apiPost } from '../api';
import { addCollectionReducers, initialEntityState, makeAdapter } from '../entity';

const adapter = makeAdapter();

export const fetchMessages = createAsyncThunk('messages/fetchAll', () => apiGet('/messages'));

/** Sends a chat message (the server notifies the receiver). `attachment` is a stored file reference. */
export const sendMessage = createAsyncThunk('messages/send',
  ({ taskId, receiverId, content, attachment }) =>
    apiPost('/messages', { taskId, receiverId, content, ...(attachment ? { attachment } : {}) }));

const messagesSlice = createSlice({
  name: 'messages',
  initialState: initialEntityState(adapter),
  reducers: {},
  extraReducers: builder => {
    builder.addCase(sendMessage.fulfilled, (state, action) => { adapter.upsertOne(state, action.payload); });
    addCollectionReducers(builder, adapter, 'messages', fetchMessages);
  },
});

export default messagesSlice.reducer;

const selectors = adapter.getSelectors(state => state.messages);
export const selectAllMessages = selectors.selectAll;
export const selectMessagesByTask = createSelector(
  [selectAllMessages, (state, taskId) => taskId],
  (list, taskId) => list.filter(m => m.taskId === taskId),
);
export const selectMessagesByUser = createSelector(
  [selectAllMessages, (state, userId) => userId],
  (list, userId) => list.filter(m => m.senderId === userId || m.receiverId === userId),
);
