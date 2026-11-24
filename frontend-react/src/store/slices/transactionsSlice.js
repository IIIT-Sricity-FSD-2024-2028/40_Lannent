/**
 * transactions slice — the ledger rows the signed-in user may see.
 *
 * Read-only on the client: the server writes a row alongside every money
 * movement it records, so there are no create/update thunks here. Writes in
 * other slices that move money re-fetch this collection.
 */
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiGet } from '../api';
import { addCollectionReducers, initialEntityState, makeAdapter } from '../entity';

const adapter = makeAdapter();

export const fetchTransactions = createAsyncThunk('transactions/fetchAll', () => apiGet('/transactions'));

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState: initialEntityState(adapter),
  reducers: {},
  extraReducers: builder => {
    addCollectionReducers(builder, adapter, 'transactions', fetchTransactions);
  },
});

export default transactionsSlice.reducer;

const selectors = adapter.getSelectors(state => state.transactions);
export const selectAllTransactions = selectors.selectAll;

export const selectTransactionsByUser = createSelector(
  [selectAllTransactions, (state, userId) => userId],
  (txs, userId) => txs.filter(t => t.fromId === userId || t.toId === userId),
);
