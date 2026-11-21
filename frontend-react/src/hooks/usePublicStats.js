/**
 * Live platform figures for the public landing pages, from the Redux store
 * (stats slice). Returns null until they arrive, or if the API cannot be
 * reached — callers then show no number rather than an invented one.
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPublicStats, selectPublicStats } from '../store/slices/statsSlice';

export default function usePublicStats() {
  const dispatch = useDispatch();
  const stats = useSelector(selectPublicStats);
  useEffect(() => { dispatch(fetchPublicStats()); }, [dispatch]);
  return stats;
}

/** "₹1,234" / "₹12.5k" for the big metric tiles. */
export function compactMoney(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return '₹' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 10_000) return '₹' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
