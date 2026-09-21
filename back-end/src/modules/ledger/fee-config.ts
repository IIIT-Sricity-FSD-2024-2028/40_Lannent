/**
 * Platform fee configuration — the single source of truth for every rate.
 *
 * Rates follow published 2026 marketplace pricing:
 *   - client marketplace fee + contract initiation fee ...... Upwork
 *   - worker service fee, tiered by lifetime billings ....... Upwork
 *   - card processing on deposit ............................ Stripe (2.9% + $0.30)
 *   - payout fee on withdrawal ............................. Stripe Connect (0.25% + $0.25)
 *
 * Every amount in the system is USD and rounded to cents at the point a fee is
 * computed, so a fee and its net never disagree by a floating-point crumb.
 */

export type FeeType =
  | 'deposit-processing'
  | 'client-marketplace'
  | 'contract-initiation'
  | 'worker-service'
  | 'expert-service'
  | 'withdrawal-processing';

export interface AmountTier {
  /** Inclusive upper bound of this tier. */
  upTo: number;
  percent?: number;
  fee?: number;
}

export const FEE_CONFIG = {
  /** Card processing when a client tops up their wallet. */
  deposit: { percent: 2.9, fixed: 0.3 },

  /** Charged to the client when project escrow is funded. */
  clientMarketplace: { percent: 5.0 },

  /** One-time fee per funded contract, banded by project budget. */
  contractInitiation: [
    { upTo: 500, fee: 0.99 },
    { upTo: 2000, fee: 4.99 },
    { upTo: 10000, fee: 9.99 },
    { upTo: Infinity, fee: 14.99 },
  ] as AmountTier[],

  /**
   * Worker service fee. The tier is chosen by the worker's lifetime billings
   * with *that client* before this release, then applied as a flat rate to the
   * whole release — long relationships get cheaper.
   */
  workerService: [
    { upTo: 500, percent: 20 },
    { upTo: 10000, percent: 10 },
    { upTo: Infinity, percent: 5 },
  ] as AmountTier[],

  /** Commission on an expert's audit or dispute payout. */
  expertService: { percent: 10 },

  /** Payout fee when a user withdraws to an external account. */
  withdrawal: { percent: 0.25, fixed: 0.25, min: 0.25 },
};

/**
 * A pristine copy taken at load, so `resetFeeConfig()` can restore the
 * documented rates. Without it a tuned rate outlives a seed reset and the app
 * cannot be returned to a known state.
 */
const DEFAULT_FEE_CONFIG = JSON.parse(JSON.stringify(FEE_CONFIG, (k, v) =>
  v === Infinity ? '__Infinity__' : v,
));

export function resetFeeConfig(): void {
  const restored = JSON.parse(JSON.stringify(DEFAULT_FEE_CONFIG), (k, v) =>
    v === '__Infinity__' ? Infinity : v,
  );
  FEE_CONFIG.deposit.percent = restored.deposit.percent;
  FEE_CONFIG.deposit.fixed = restored.deposit.fixed;
  FEE_CONFIG.clientMarketplace.percent = restored.clientMarketplace.percent;
  FEE_CONFIG.expertService.percent = restored.expertService.percent;
  FEE_CONFIG.withdrawal.percent = restored.withdrawal.percent;
  FEE_CONFIG.withdrawal.fixed = restored.withdrawal.fixed;
  FEE_CONFIG.withdrawal.min = restored.withdrawal.min;
  FEE_CONFIG.workerService.forEach((t, i) => { t.percent = restored.workerService[i].percent; });
  FEE_CONFIG.contractInitiation.forEach((t, i) => { t.fee = restored.contractInitiation[i].fee; });
}

/** Rounds to whole cents. Every fee and net amount passes through this. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function pickTier(tiers: AmountTier[], amount: number): AmountTier {
  return tiers.find((t) => amount <= t.upTo) ?? tiers[tiers.length - 1];
}

export function depositFee(gross: number): number {
  return round2(gross * (FEE_CONFIG.deposit.percent / 100) + FEE_CONFIG.deposit.fixed);
}

export function withdrawalFee(gross: number): number {
  const raw = gross * (FEE_CONFIG.withdrawal.percent / 100) + FEE_CONFIG.withdrawal.fixed;
  return round2(Math.max(raw, FEE_CONFIG.withdrawal.min));
}

export function marketplaceFee(budget: number): number {
  return round2(budget * (FEE_CONFIG.clientMarketplace.percent / 100));
}

export function initiationFee(budget: number): number {
  return round2(pickTier(FEE_CONFIG.contractInitiation, budget).fee ?? 0);
}

/** Percent rate a worker pays, given their prior lifetime billings with this client. */
export function workerServiceRate(lifetimeBillings: number): number {
  return pickTier(FEE_CONFIG.workerService, lifetimeBillings).percent ?? 0;
}

export function workerServiceFee(amount: number, lifetimeBillings: number): number {
  return round2(amount * (workerServiceRate(lifetimeBillings) / 100));
}

export function expertServiceFee(amount: number): number {
  return round2(amount * (FEE_CONFIG.expertService.percent / 100));
}
