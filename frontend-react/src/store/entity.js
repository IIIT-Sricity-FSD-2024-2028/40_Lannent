/**
 * Shared plumbing for the entity slices (users, tasks, milestones, …).
 *
 * Each collection is stored with an entity adapter (`{ ids, entities }`), so
 * reads by id are O(1) and the server's ordering is kept. `status` / `error`
 * track the slice's own fetch-all thunk.
 */
import { createEntityAdapter, isAnyOf } from '@reduxjs/toolkit';
import { loadAppData, refreshEntities, freshCollection } from './thunks/loadAppData';

export function makeAdapter() {
  return createEntityAdapter();
}

export function initialEntityState(adapter, extra = {}) {
  return adapter.getInitialState({ status: 'idle', error: null, ...extra });
}

/**
 * Adds the reducers every entity slice shares:
 *  - page load / refresh replaces the collection when the server answered;
 *  - the slice's own fetch-all thunk tracks status and replaces the collection.
 */
export function addCollectionReducers(builder, adapter, key, fetchAll) {
  builder
    .addCase(fetchAll.pending, (state) => { state.status = 'loading'; state.error = null; })
    .addCase(fetchAll.fulfilled, (state, action) => {
      state.status = 'succeeded';
      if (Array.isArray(action.payload)) adapter.setAll(state, action.payload);
    })
    .addCase(fetchAll.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; })
    .addMatcher(isAnyOf(loadAppData.fulfilled, refreshEntities.fulfilled), (state, action) => {
      const fresh = freshCollection(action, key);
      if (fresh) { adapter.setAll(state, fresh); state.status = 'succeeded'; }
    });
}

/** The signed-in user's id, from the auth slice. */
export function sessionUserId(getState) {
  const s = getState().auth.session;
  return s ? s.userId : null;
}
