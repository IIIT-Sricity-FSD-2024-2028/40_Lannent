/**
 * Page-load and refresh thunks shared by every entity slice.
 *
 *   loadAppData()            — the router dispatches this on every navigation
 *                              (the React version of the old full page load):
 *                              every collection the signed-in role may read,
 *                              plus the fee rates, fetched in parallel.
 *   refreshEntities(...keys) — re-reads some collections after a write that
 *                              changed them on the server.
 *
 * Both fulfil with `{ [key]: data | null }`. Each entity slice replaces its
 * items when its key is present and non-null, and keeps what it has otherwise
 * (one failing endpoint must not blank the page).
 */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiGetOrNull, readSession, readToken, LANNENT_API } from '../api';

export const ENDPOINTS = {
  users: '/users',
  tasks: '/tasks',
  milestones: '/milestones',
  proposals: '/proposals',
  auditRequests: '/audit-requests',
  auditReports: '/audit-reports',
  disputes: '/disputes',
  transactions: '/transactions',
  expertApplications: '/expert-applications',
  notifications: '/notifications',
  messages: '/messages',
};

/** Which collections a page load reads, for the signed-in role. Null when nothing should be read. */
function initPlan() {
  const session = readSession() || {};
  const role = session.role;
  const token = readToken();
  // Nobody is signed in (login, landing, signup), or an account that must
  // first choose its own password: it can read nothing until it has.
  if ((!role && !token) || session.mustChangePassword) return null;
  // Expert applications hold applicants' contact details and are admin-only.
  return Object.keys(ENDPOINTS).filter(key =>
    key !== 'expertApplications' || role === 'intake-admin' || role === 'compliance-admin');
}

export const loadAppData = createAsyncThunk('app/load', async () => {
  const plan = initPlan();
  if (!plan) {
    // Reachability for visitors who are not signed in — one public endpoint.
    let online = false;
    try { online = (await fetch(LANNENT_API + '/stats/public')).ok; } catch { online = false; }
    return { online, data: {} };
  }
  const results = await Promise.all([
    ...plan.map(key => apiGetOrNull(ENDPOINTS[key])),
    apiGetOrNull('/ledger/fee-rates'),
  ]);
  const data = {};
  let reached = 0;
  plan.forEach((key, i) => {
    data[key] = results[i];
    if (results[i]) reached++;
  });
  data.feeRates = results[results.length - 1];
  return { online: reached > 0, data };
});

export const refreshEntities = createAsyncThunk('app/refresh', async (keys) => {
  const wanted = (Array.isArray(keys) ? keys : [keys]).filter(k => ENDPOINTS[k]);
  const results = await Promise.all(wanted.map(k => apiGetOrNull(ENDPOINTS[k])));
  const data = {};
  wanted.forEach((k, i) => { data[k] = results[i]; });
  return { data };
});

/** Matcher helper: the fresh array for `key` carried by a load/refresh action, or null. */
export function freshCollection(action, key) {
  const data = action.payload && action.payload.data;
  const value = data ? data[key] : null;
  return Array.isArray(value) ? value : null;
}
