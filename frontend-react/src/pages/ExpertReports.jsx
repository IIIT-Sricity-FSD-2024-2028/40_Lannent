/**
 * LANNENT — ExpertReports (My Reports)
 * Converted from front-end/pages/expert-reports.html.
 *
 * Every technical-audit report and dispute resolution the expert has filed,
 * with counts, a type filter, a search box and a link to each report.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ExpertReports.css?raw';

const FILTERS = ['All', 'Technical Audit', 'Dispute Resolution'];
const TH_STYLE = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const CELL = { padding: '14px 16px' };
const formatDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const AUDIT_VERDICT = { pass: 'Pass', fail: 'Fail', conditional: 'Conditional' };
const DISPUTE_VERDICT = { 'worker-favour': 'Worker Favour', 'client-favour': 'Client Favour' };
const clip = (text, n = 100) => (text.length > n ? text.substring(0, n) + '…' : text);

/** The expert's audit reports and resolved disputes, as table rows. */
function loadReports(Store, userId) {
  const auditReports = Store.getAuditReports().filter(r => r.verdict && r.expertId === userId).map(r => ({
    id: r.id,
    auditRequestId: r.auditRequestId,
    type: 'Technical Audit',
    project: r.projectTitle || 'Unknown Project',
    milestone: r.milestoneTitle || 'Milestone',
    reportId: 'AUD-' + r.id.toUpperCase(),
    generatedDate: r.createdAt ? formatDate(r.createdAt) : 'Recent',
    sortKey: r.createdAt || '',
    verdict: AUDIT_VERDICT[r.verdict] || r.verdict,
    worker: r.workerName || 'Worker',
    summary: r.findings ? clip(r.findings) : '',
    status: 'Published',
    raw: r,
  }));

  // A dispute settled by an operations override was not this reviewer's verdict.
  const disputeReports = Store.getDisputes().filter(d => d.status === 'resolved' && d.expertId === userId && !d.overriddenBy).map(d => ({
    id: 'dr-' + d.id,
    type: 'Dispute Resolution',
    project: d.project || 'Unknown Project',
    milestone: d.milestone || 'Dispute',
    reportId: 'DIS-' + d.id.toUpperCase(),
    generatedDate: d.resolvedAt ? formatDate(d.resolvedAt) : 'Recent',
    sortKey: d.resolvedAt || '',
    verdict: DISPUTE_VERDICT[d.verdict] || d.verdict,
    worker: [d.raisedByName, d.againstName].filter(Boolean).join(' vs ') || 'Parties',
    summary: d.resolution ? clip(d.resolution) : '',
    status: 'Published',
    raw: d,
  }));

  return [...auditReports, ...disputeReports].sort((a, b) => String(b.sortKey).localeCompare(String(a.sortKey)));
}

function verdictBadge(v) {
  if (v === 'Pass') return 'badge-green';
  if (v === 'Fail') return 'badge-red';
  if (v === 'Worker Favour') return 'badge-green';
  if (v === 'Client Favour') return 'badge-blue';
  if (v === 'Conditional') return 'badge-orange';
  return 'badge-gray';
}

/** One table row. */
function ReportRow({ r }) {
  // Build the correct link for the report type
  const viewUrl = r.type === 'Technical Audit'
    ? `/expert-report-audit?id=${r.auditRequestId}${r.raw.milestoneId ? `&milestoneId=${r.raw.milestoneId}` : ''}`
    : '/expert-report-dispute?id=' + (r.raw ? r.raw.id : '');
  const isAudit = r.type === 'Technical Audit';
  return (
    <tr>
      <td style={{ ...CELL, fontWeight: 600, fontSize: 13 }}>{r.reportId}</td>
      <td style={CELL}>
        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, fontWeight: 500, background: isAudit ? '#eef2ff' : '#faf5ff', color: isAudit ? '#4f46e5' : '#7c3aed' }}>{r.type}</span>
      </td>
      <td style={CELL}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{r.project}</div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{r.milestone}</div>
      </td>
      <td style={{ ...CELL, fontSize: 13, color: 'var(--muted-foreground)' }}>{r.worker}</td>
      <td style={CELL}><span className={`badge ${verdictBadge(r.verdict)}`}>{r.verdict}</span></td>
      <td style={{ ...CELL, fontSize: 13, color: 'var(--muted-foreground)' }}>{r.generatedDate}</td>
      <td style={CELL}><span className={`badge ${r.status === 'Published' ? 'badge-green' : 'badge-gray'}`}>{r.status}</span></td>
      <td style={CELL}>
        <Link to={viewUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12, fontWeight: 500, color: 'var(--foreground)', textDecoration: 'none', cursor: 'pointer', transition: 'background 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--secondary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)'; }}>
          <Icon name="eye" style={{ width: 13, height: 13 }} /> View Report
        </Link>
      </td>
    </tr>
  );
}

export default function ExpertReports() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Reports — Lannent');
  const session = Auth.getCurrentUser();
  const [reports] = useState(() => loadReports(Store, session.userId));
  const [activeFilter, setActiveFilter] = useState('All');
  // "Reports so far" / "View Reports" on an audit request open this page
  // showing every report filed on that one audit (?audit=<auditRequestId>).
  const [searchParams, setSearchParams] = useSearchParams();
  const auditFilter = searchParams.get('audit') || '';
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const auditReports = auditFilter ? reports.filter(r => r.auditRequestId === auditFilter) : [];
  const auditProject = auditReports[0]?.project
    || (auditFilter ? Store.getAuditRequestById(auditFilter)?.project : '') || 'this project';
  const showAll = () => setSearchParams({});

  const q = searchQuery.trim().toLowerCase();
  const list = reports.filter(r => {
    const matchQ = !q || [r.project, r.milestone, r.type, r.worker, r.reportId, r.verdict].some(v => String(v).toLowerCase().includes(q));
    const matchF = activeFilter === 'All' || r.type === activeFilter;
    const matchA = !auditFilter || r.auditRequestId === auditFilter;
    return matchQ && matchF && matchA;
  });

  const count = type => reports.filter(r => r.type === type).length;

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="expert" activePath="/expert-reports" pageTitle="My Reports" pageSubtitle="All your technical audit and dispute resolution reports">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
          <StatCard valueId="statTotal" value={reports.length} label="Total Reports" icon="file-text" iconBg="#eef2ff" iconColor="#6366f1" />
          <StatCard valueId="statAudit" value={count('Technical Audit')} label="Technical Audits" icon="clipboard-check" iconBg="#ecfdf5" iconColor="#10b981" />
          <StatCard valueId="statDispute" value={count('Dispute Resolution')} label="Dispute Reports" icon="scale" iconBg="#faf5ff" iconColor="#a855f7" />
          <StatCard valueId="statPublished" value={reports.filter(r => r.status === 'Published').length} valueStyle={{ color: '#10b981' }} label="Published" icon="check-circle" iconBg="#ecfdf5" iconColor="#10b981" />
        </div>

        {auditFilter ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '12px 18px', marginBottom: 16, borderRadius: 12, background: '#eef2ff', border: '1px solid #c7d2fe', fontSize: 14 }}>
            <span>
              <strong>{auditProject}</strong>
              {` · ${auditReports.length} audit report${auditReports.length === 1 ? '' : 's'} filed on this project`}
            </span>
            <button onClick={showAll} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #c7d2fe', background: 'var(--card)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Show all reports
            </button>
          </div>
        ) : null}

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FILTERS.map(f => {
                const on = f === activeFilter;
                return (
                  <button key={f} onClick={() => setActiveFilter(f)}
                          style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid var(--border)', background: on ? 'var(--foreground)' : 'var(--card)', color: on ? 'var(--primary-foreground)' : 'var(--muted-foreground)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {f}
                  </button>
                );
              })}
            </div>
            <div style={{ position: 'relative' }}>
              <Icon name="search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
              <input type="text" placeholder="Search reports..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                     style={{ padding: '7px 12px 7px 32px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', background: 'var(--input-bg)', width: 200 }} />
            </div>
          </div>
          <div id="reportsEmpty" style={{ display: list.length ? 'none' : 'block', padding: '64px 32px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Icon name="file-x" style={{ width: 40, height: 40, opacity: 0.4, margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{reports.length ? 'No reports match' : 'No reports yet'}</div>
            <div style={{ fontSize: 14 }}>{reports.length ? 'Try a different filter or search.' : 'Complete audit requests and dispute resolutions to see reports here.'}</div>
          </div>
          <div id="reportsTableWrap" style={{ overflowX: 'auto', ...(list.length ? {} : { display: 'none' }) }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                  {['Report ID', 'Type', 'Project / Milestone', 'Worker / Parties', 'Verdict', 'Date', 'Status', 'Actions'].map(h => <th key={h} style={TH_STYLE}>{h}</th>)}
                </tr>
              </thead>
              <tbody id="reportsTbody">
                {list.map(r => <ReportRow key={r.id} r={r} />)}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
