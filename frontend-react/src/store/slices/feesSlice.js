/**
 * fees slice — the platform's current fee rates, for previews.
 *
 * Mirrors back-end/src/modules/ledger/fee-config.ts so forms can show a
 * charge before it is committed; the server always recomputes it. The rates
 * are read on every page load (GET /ledger/fee-rates), so a change the
 * revenue desk makes shows up in every preview.
 *
 *   const Fees = useSelector(selectFees);
 *   Fees.deposit(100)  // { gross, fee, net }
 *
 * Open-ended tiers are stored with `upTo: null` (JSON-safe) and read as Infinity.
 */
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiGet } from '../api';
import { loadAppData } from '../thunks/loadAppData';

const DEFAULT_RATES = {
  deposit: { percent: 2.9, fixed: 0.30 },
  clientMarketplace: { percent: 5.0 },
  contractInitiation: [
    { upTo: 500, fee: 0.99 }, { upTo: 2000, fee: 4.99 },
    { upTo: 10000, fee: 9.99 }, { upTo: null, fee: 14.99 },
  ],
  workerService: [
    { upTo: 500, percent: 20 }, { upTo: 10000, percent: 10 },
    { upTo: null, percent: 5 },
  ],
  expertService: { percent: 10 },
  withdrawal: { percent: 0.25, fixed: 0.25, min: 0.25 },
};

export const fetchFeeRates = createAsyncThunk('fees/fetchRates', () => apiGet('/ledger/fee-rates'));

/** Merges the server's rates over the current ones, keeping a default for anything missing. */
function applyRates(state, r) {
  if (!r || typeof r !== 'object') return;
  const tiers = t => t.map(x => ({ ...x, upTo: x.upTo == null || x.upTo === Infinity ? null : x.upTo }));
  if (r.deposit) state.rates.deposit = r.deposit;
  if (r.clientMarketplace) state.rates.clientMarketplace = r.clientMarketplace;
  if (Array.isArray(r.contractInitiation)) state.rates.contractInitiation = tiers(r.contractInitiation);
  if (Array.isArray(r.workerService)) state.rates.workerService = tiers(r.workerService);
  if (r.expertService) state.rates.expertService = r.expertService;
  if (r.withdrawal) state.rates.withdrawal = r.withdrawal;
}

const feesSlice = createSlice({
  name: 'fees',
  initialState: { rates: DEFAULT_RATES, status: 'idle' },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchFeeRates.fulfilled, (state, action) => { state.status = 'succeeded'; applyRates(state, action.payload); })
      .addCase(loadAppData.fulfilled, (state, action) => {
        const r = action.payload.data && action.payload.data.feeRates;
        if (r) { state.status = 'succeeded'; applyRates(state, r); }
      });
  },
});

export default feesSlice.reducer;

// ─── Fee calculator ────────────────────────────────────────────────────────

const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const tier = (tiers, amount) => tiers.find(t => amount <= t.upTo) || tiers[tiers.length - 1];
const withInfinity = t => t.map(x => ({ ...x, upTo: x.upTo == null ? Infinity : x.upTo }));

/** The fee calculator for a set of rates (same API as the old Store.Fees). */
export function makeFees(stored) {
  const FEES = {
    ...stored,
    contractInitiation: withInfinity(stored.contractInitiation),
    workerService: withInfinity(stored.workerService),
  };
  return {
    round2,
    deposit(gross) {
      const fee = round2(gross * (FEES.deposit.percent / 100) + FEES.deposit.fixed);
      return { gross, fee, net: round2(gross - fee) };
    },
    withdrawal(gross) {
      const raw = gross * (FEES.withdrawal.percent / 100) + FEES.withdrawal.fixed;
      const fee = round2(Math.max(raw, FEES.withdrawal.min));
      return { gross, fee, net: round2(gross - fee) };
    },
    /** Hiring: the budget is already held, so only the contract fees are charged. */
    projectFunding(budget) {
      const marketplace = round2(budget * (FEES.clientMarketplace.percent / 100));
      const initiation = tier(FEES.contractInitiation, budget).fee;
      return { budget, marketplace, initiation, fees: round2(marketplace + initiation), total: round2(budget + marketplace + initiation) };
    },
    rates() { return FEES; },
    workerRelease(amount, lifetimeBillings) {
      const rate = tier(FEES.workerService, lifetimeBillings || 0).percent;
      const fee = round2(amount * (rate / 100));
      return { amount, rate, fee, net: round2(amount - fee) };
    },
    expertPayout(amount) {
      const fee = round2(amount * (FEES.expertService.percent / 100));
      return { amount, fee, net: round2(amount - fee) };
    },
  };
}

export const selectFeeRates = state => state.fees.rates;
/** The fee calculator for the current rates (memoized). */
export const selectFees = createSelector([selectFeeRates], makeFees);
