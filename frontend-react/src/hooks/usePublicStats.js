/**
 * Live platform figures for the public landing pages (GET /api/stats/public).
 * Returns null until they arrive, or if the API cannot be reached — callers
 * then show no number rather than an invented one.
 */
import { useEffect, useState } from 'react';
import { LANNENT_API } from '../context/StoreContext';

export default function usePublicStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`${LANNENT_API}/stats/public`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => { if (!cancelled && json) setStats(json.data || json); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return stats;
}

/** "₹1,234" / "₹12.5k" for the big metric tiles. */
export function compactMoney(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return '₹' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 10_000) return '₹' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
