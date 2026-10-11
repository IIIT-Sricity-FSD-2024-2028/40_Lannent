/**
 * LANNENT — ComplianceDashboard (Audit Log)
 * Converted from front-end/pages/compliance-dashboard.html.
 *
 * Read-only audit log for the compliance desk: every financial read and
 * every value-moving change, with the actor who asked. Filterable by kind
 * and exportable as CSV.
 */
import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { LANNENT_API } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ComplianceDashboard.css?raw';

const API = LANNENT_API;
const KIND_LABEL = {
  'money': 'money', 'fee.change': 'fee change',
  'admin.change': 'admin change', 'admin.read': 'admin read',
};
const KIND_CLASS = {
  'money': 'kind-money', 'fee.change': 'kind-fee',
  'admin.change': 'kind-admin-change', 'admin.read': 'kind-admin-read',
};

/** Reads the audit log (optionally one kind) — null when it cannot be read. */
function fetchLog(kind) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', `${API}/audit-log?limit=200${kind ? '&kind=' + encodeURIComponent(kind) : ''}`, false);
  const token = localStorage.getItem('lannent_token');
  if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  const s = JSON.parse(localStorage.getItem('lannent_session') || '{}');
  if (s.role) xhr.setRequestHeader('role', s.role);
  if (s.userId) xhr.setRequestHeader('user-id', s.userId);
  try { xhr.send(); } catch (e) { return null; }
  if (xhr.status !== 200) return null;
  try { return (JSON.parse(xhr.responseText).data) || null; } catch (e) { return null; }
}

/** A rate change is the one event whose detail is worth reading inline. */
function detailText(e) {
  if (e.kind === 'fee.change' && e.detail && e.detail.changed) {
    const rows = Object.entries(e.detail.changed);
    if (!rows.length) return 'no rates changed';
    return rows.map(([k, v]) => `${k}: ${v.before} → ${v.after}`).join(', ');
  }
  if (e.detail && e.detail.durationMs != null) return e.detail.durationMs + 'ms';
  return '';
}

/** The table body for one log response. */
function AuditRows({ data }) {
  if (!data) return <tr><td colSpan="6" style={{ padding: 28, textAlign: 'center', color: 'var(--muted-foreground)' }}>The audit log could not be read.</td></tr>;
  if (!data.events.length) return <tr><td colSpan="6" style={{ padding: 28, textAlign: 'center', color: 'var(--muted-foreground)' }}>No events recorded yet.</td></tr>;
  return data.events.map((e, i) => (
    <tr key={i}>
      <td className="mono" style={{ whiteSpace: 'nowrap' }}>{e.at.slice(0, 19).replace('T', ' ')}</td>
      <td><span className={`kind ${KIND_CLASS[e.kind] || 'kind-admin-read'}`}>{KIND_LABEL[e.kind] || e.kind}</span></td>
      <td>
        {e.actorId || '—'}
        <div style={{ color: 'var(--muted-foreground)', fontSize: 11.5 }}>{e.actorRole || ''}</div>
      </td>
      <td className="mono">{(e.method || '') + ' ' + (e.path || '')}</td>
      <td className={e.outcome === 'refused' ? 'outcome-refused' : ''}>
        {(e.outcome || '') + ' '}
        {e.status ? <span style={{ color: 'var(--muted-foreground)' }}>{e.status}</span> : ''}
      </td>
      <td style={{ color: 'var(--muted-foreground)' }}>{detailText(e)}</td>
    </tr>
  ));
}

export default function ComplianceDashboard() {
  const Auth = useAuth();
  usePageTitle('Audit Log — Lannent');

  // The summary line is computed once on load; the filter only swaps the rows.
  const [initialData] = useState(() => fetchLog(''));
  const [data, setData] = useState(initialData);
  const note = initialData
    ? `${initialData.total} event${initialData.total === 1 ? '' : 's'} matching · ${initialData.stored} stored${initialData.droppedFromCapacity ? ' · ' + initialData.droppedFromCapacity + ' dropped at capacity' : ''}`
    : 'unavailable';

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={(Auth.getCurrentUser() || {}).role} activePath="/compliance-dashboard" pageTitle="Audit Log" pageSubtitle="Every financial read and every value-moving change, with the actor who asked.">
        <div className="filters">
          <select id="kindFilter" onChange={ev => setData(fetchLog(ev.target.value))}>
            <option value="">All events</option>
            <option value="money">Money movements</option>
            <option value="fee.change">Fee changes</option>
            <option value="admin.change">Admin changes</option>
            <option value="admin.read">Admin reads</option>
          </select>
          {' '}
          <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>{note}</span>
          {' '}
          <a href={`${API}/audit-log/export`} style={{ marginLeft: 'auto', fontSize: 13, color: '#4f46e5', textDecoration: 'none' }}>Export CSV</a>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="audit-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Event</th>
                  <th>Actor</th>
                  <th>Route</th>
                  <th>Outcome</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody id="auditRows">
                <AuditRows data={data} />
              </tbody>
            </table>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
