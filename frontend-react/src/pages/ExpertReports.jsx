/**
 * LANNENT — ExpertReports (My Reports)
 * Converted from front-end/pages/expert-reports.html.
 *
 * Every technical-audit report and dispute resolution the expert has filed,
 * with counts, a type filter, a search box and a link to each report.
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
    verdict: r.verdict === 'pass' ? 'Pass' : r.verdict === 'fail' ? 'Fail' : 'Pending',
    worker: r.workerName || 'Worker',
    summary: r.findings ? r.findings.substring(0, 100) + '...' : 'Report pending.',
    status: 'Published',
    raw: r,
  }));

  const disputeReports = Store.getDisputes().filter(d => d.status === 'resolved' && d.expertId === userId).map(d => ({
    id: 'dr-' + d.id,
    type: 'Dispute Resolution',
    project: d.project || 'Unknown Project',
    milestone: d.milestone || 'Dispute',
    reportId: 'DIS-' + d.id.toUpperCase(),
    generatedDate: d.resolvedAt ? formatDate(d.resolvedAt) : 'Recent',
    verdict: d.verdict === 'worker-favour' ? 'Worker Favour' : d.verdict === 'client-favour' ? 'Client Favour' : 'Split',
    worker: d.againstName || 'Worker',
    summary: d.resolution ? d.resolution.substring(0, 100) + '...' : 'Resolution issued.',
    status: 'Published',
    raw: d,
  }));

  return [...auditReports, ...disputeReports];
}

function verdictBadge(v) {
  if (v === 'Pass') return 'badge-green';
  if (v === 'Fail') return 'badge-red';
  if (v === 'Worker Favour') return 'badge-green';
  if (v === 'Client Favour') return 'badge-blue';
  return 'badge-gray';
}

/** One table row. */
function ReportRow({ r }) {
  // Build the correct link for the report type
  const viewUrl = r.type === 'Technical Audit'
    ? '/expert-report-audit?id=' + (r.auditRequestId || (r.raw ? r.raw.auditRequestId : ''))
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
  const [searchQuery, setSearchQuery] = useState('');
  const shownRows = useRef([]);   // when nothing matches, the hidden table keeps its last rows (as before)

  const q = searchQuery.toLowerCase();
  const list = reports.filter(r => {
    const matchQ = !q || r.project.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    const matchF = activeFilter === 'All' || r.type === activeFilter;
    return matchQ && matchF;
  });
  if (list.length) shownRows.current = list;

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
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No reports yet</div>
            <div style={{ fontSize: 14 }}>Complete audit requests and dispute resolutions to see reports here.</div>
          </div>
          <div id="reportsTableWrap" style={{ overflowX: 'auto', ...(list.length ? {} : { display: 'none' }) }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                  {['Report ID', 'Type', 'Project / Milestone', 'Worker', 'Verdict', 'Date', 'Status', 'Actions'].map(h => <th key={h} style={TH_STYLE}>{h}</th>)}
                </tr>
              </thead>
              <tbody id="reportsTbody">
                {shownRows.current.map(r => <ReportRow key={r.id} r={r} />)}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
