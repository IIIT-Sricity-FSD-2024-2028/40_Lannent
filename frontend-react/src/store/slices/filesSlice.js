/**
 * files slice — uploads, deletes and authenticated downloads of stored files.
 *
 *   const ref = await dispatch(uploadFile({ file, meta: { taskId, purpose } })).unwrap();
 *
 * The slice tracks how many uploads are in flight, so any component can show
 * that something is still uploading.
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiDelete, downloadFileRequest, uploadFileRequest } from '../api';

/** Uploads one file; resolves to `{ id, name, size, mime, url }`. */
export const uploadFile = createAsyncThunk('files/upload', ({ file, meta }) => uploadFileRequest(file, meta || {}));

/** Deletes a file you uploaded (refused once it is part of a submitted deliverable). */
export const deleteFile = createAsyncThunk('files/delete', async (id) => {
  await apiDelete(`/files/${id}`);
  return id;
});

/** Downloads a stored file with the session's credentials. */
export const downloadFile = createAsyncThunk('files/download',
  ({ ref, filename }) => downloadFileRequest(ref, filename));

const filesSlice = createSlice({
  name: 'files',
  initialState: { uploading: 0, lastError: null },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(uploadFile.pending, (state) => { state.uploading += 1; state.lastError = null; })
      .addCase(uploadFile.fulfilled, (state) => { state.uploading = Math.max(0, state.uploading - 1); })
      .addCase(uploadFile.rejected, (state, a) => {
        state.uploading = Math.max(0, state.uploading - 1);
        state.lastError = a.error.message;
      });
  },
});

export default filesSlice.reducer;

export const selectUploadsInFlight = s => s.files.uploading;
export { fileUrl } from '../api';
