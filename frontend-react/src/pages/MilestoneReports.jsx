/**
 * LANNENT — MilestoneReports
 * Converted from front-end/pages/milestone-reports.html.
 *
 * Technical-audit reports and dispute resolutions for a project
 * (?taskId=<id>&role=client|worker), or for everything when no task is given.
 * Filter by report type or milestone and open any report.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useStore } from '../context/StoreContext';
import { escapeHtml } from '../utils/helpers';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './MilestoneReports.css?raw';

const NBSP_DOT = ' ·  ';   // "&nbsp;·&nbsp; " separator
const TYPE_FILTERS = [
  { val: 'all', icon: 'layout-grid', label: 'All Types' },
  { val: 'technical-audit', icon: 'file-search', label: 'Technical Audit' },
  { val: 'dispute-resolution', icon: 'alert-triangle', label: 'Dispute Resolution' },
];
const VERDICTS = {
  'pass':          { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', label: 'Passed audit' },
  'fail':          { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', label: 'Failed audit' },
  'conditional':   { bg: '#fffbeb', border: '#fde68a', text: '#b45309', label: 'Passed with conditions' },
  'worker-favour': { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', label: 'Resolved for the worker' },
  'client-favour': { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', label: 'Resolved for the client' },
  'split':         { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', label: 'Split decision' },
};

/** Audit reports + disputes (optionally only those belonging to one task). */
function getReports(Store, taskId) {
  const reviewerOf = id => Store.getUserById(id);
  let storeReports = Store.getAuditReports()
    .filter(r => r.createdAt) // only submitted reports
    .map(r => ({
      id: r.id,
      milestoneName: r.milestoneTitle || 'Milestone',
      milestoneId: r.milestoneId,
      taskId: r.taskId,
      type: 'technical-audit',
      reviewer: reviewerOf(r.expertId)?.name || 'Expert Reviewer',
      reviewerInitials: reviewerOf(r.expertId)?.avatar || 'ER',
      reviewerColor: reviewerOf(r.expertId)?.avatarColor || 'linear-gradient(135deg,#a855f7,#7c3aed)',
      date: r.createdAt,
      status: r.verdict === 'pass' ? 'completed' : r.verdict === 'fail' ? 'failed' : 'pending',
      verdict: r.verdict,
      findings: r.findings,
      project: r.projectTitle,
      workerName: r.workerName,
      viewUrl: '/expert-report-audit?id=' + r.auditRequestId,
    }));

  let storeDisputes = Store.getDisputes().map(d => ({
    id: d.id,
    milestoneName: d.milestone || 'Project Dispute',
    milestoneId: d.milestoneId,
    taskId: d.taskId,
    type: 'dispute-resolution',
    reviewer: reviewerOf(d.expertId)?.name || 'Expert Reviewer',
    reviewerInitials: reviewerOf(d.expertId)?.avatar || 'ER',
    reviewerColor: 'linear-gradient(135deg,#f59e0b,#d97706)',
    date: d.createdAt,
    status: d.status === 'resolved' ? 'completed' : d.status === 'open' ? 'in-progress' : 'pending',
    verdict: d.verdict,
    findings: d.resolution,
    project: d.project,
    workerName: d.againstName,
    viewUrl: '/expert-report-dispute?id=' + d.id,
  }));

  // ── PROJECT-LEVEL FILTERING ──
  if (taskId) {
    const milestoneIds = new Set(Store.getMilestonesByTask(taskId).map(m => m.id));
    storeReports = storeReports.filter(r => r.taskId === taskId || milestoneIds.has(r.milestoneId));
    storeDisputes = storeDisputes.filter(d => d.taskId === taskId || milestoneIds.has(d.milestoneId));
  }
  return [...storeReports, ...storeDisputes];
}

/**
 * Trims a report finding for a card. The original escaped the text first and
 * trimmed the escaped string, so the length is measured the same way here.
 */
function excerpt(text, max = 160) {
  const unescape = s => s.replace(/&(amp|lt|gt|quot|#39);/g, (m, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[e]));
  const t = escapeHtml(String(text || '').trim());
  if (t.length <= max) return unescape(t);
  const cut = t.slice(0, max);
  const stop = cut.lastIndexOf(' ');
  return unescape((stop > 60 ? cut.slice(0, stop) : cut) + '…');
}

/** Store dates are ISO slices; the cards read better in the page's format. */
function fmtDate(d) {
  if (!d) return 'Unknown date';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusConfig(status) {
  switch (status) {
    case 'completed': return { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669', dot: '#10b981', label: 'Completed' };
    case 'in-progress': return { bg: '#eff6ff', border: '#bae6fd', text: '#0284c7', dot: '#38bdf8', label: 'In Progress' };
    case 'failed': return { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', dot: '#ef4444', label: 'Failed' };
    case 'pending': return { bg: '#fffbeb', border: '#fde68a', text: '#b45309', dot: '#f59e0b', label: 'Pending' };
    default: return { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280', dot: '#9ca3af', label: status };
  }
}

function typeConfig(type) {
  if (type === 'technical-audit') return { bg: '#eff6ff', color: '#2563eb', icon: 'file-search', label: 'Technical Audit Report' };
  return { bg: '#fff7ed', color: '#ea580c', icon: 'alert-triangle', label: 'Dispute Resolution Report' };
}

/** The outcome, stated plainly — a client should not have to open the report to see it. */
function VerdictChip({ r }) {
  const v = VERDICTS[r.verdict];
  if (!v) {
    return (
      <div className="report-verdict" style={{ background: 'var(--secondary)', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
        {r.type === 'dispute-resolution' ? 'Awaiting a verdict' : 'Awaiting review'}
      </div>
    );
  }
  return <div className="report-verdict" style={{ background: v.bg, borderColor: v.border, color: v.text }}>{v.label}</div>;
}

/** Small toast in the bottom-right corner (this page's own variant). */
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  const bg = type === 'success' ? '#10b981' : type === 'info' ? '#6366f1' : '#ef4444';
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${bg};color:white;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:500;z-index:300;box-shadow:0 8px 24px rgba(0,0,0,0.15);animation:fadeUp 0.4s ease;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/** One report card. */
function ReportCard({ r, index, role }) {
  const sc = statusConfig(r.status);
  const tc = typeConfig(r.type);
  return (
    <div className="report-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="report-left">
        <div className="report-type-icon" style={{ background: tc.bg }}>
          <Icon name={tc.icon} style={{ width: 18, height: 18, color: tc.color }} />
        </div>
        <div className="report-info">
          <div className="report-milestone-name">{r.milestoneName}</div>
          <div className="report-type-label">
            {tc.label + ' ' + (r.project ? NBSP_DOT + r.project : '') + ' ' + NBSP_DOT}<span style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.id}</span>
          </div>
          <VerdictChip r={r} />
          {r.findings ? <div className="report-findings">{excerpt(r.findings)}</div> : ''}
          <div className="report-meta-row">
            <span className="status-pill" style={{ background: sc.bg, borderColor: sc.border, color: sc.text }}>
              <span className="status-dot" style={{ background: sc.dot }}></span>
              {sc.label}
            </span>
            <div className="report-meta-item">
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: r.reviewerColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{r.reviewerInitials}</div>
              <strong>{r.reviewer}</strong>
            </div>
            {r.workerName ? (
              <div className="report-meta-item">
                <Icon name="user" style={{ width: 13, height: 13 }} />
                <strong>{r.workerName}</strong>
              </div>
            ) : ''}
            <div className="report-meta-item">
              <Icon name="calendar" style={{ width: 13, height: 13 }} />
              <strong>{fmtDate(r.date)}</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="report-actions">
        <Link to={r.viewUrl + (r.viewUrl.includes('?') ? '&' : '?') + 'role=' + role} className="btn-view">
          <Icon name="eye" style={{ width: 14, height: 14 }} />
          View Report
        </Link>
        <button className="btn-download" onClick={() => showToast('Downloading PDF…', 'info')}>
          <Icon name="download" style={{ width: 14, height: 14 }} />
          Download PDF
        </button>
      </div>
    </div>
  );
}

/** One summary tile at the top. */
function SummaryCard({ id, icon, iconBg, iconColor, value, valueColor, label }) {
  return (
    <div className="summary-card">
      <div className="summary-icon" style={{ background: iconBg }}>
        <Icon name={icon} style={{ width: 18, height: 18, color: iconColor }} />
      </div>
      <div>
        <div className="summary-val" style={valueColor ? { color: valueColor } : undefined} id={id}>{value}</div>
        <div className="summary-label">{label}</div>
      </div>
    </div>
  );
}

export default function MilestoneReports() {
  const Store = useStore();
  usePageTitle('Milestone Reports — Lannent');
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId') || null;
  const role = searchParams.get('role') || 'client';

  const [reports] = useState(() => getReports(Store, taskId));
  const [typeFilter, setTypeFilter] = useState('all');
  const [milestoneFilter, setMilestoneFilter] = useState('all');

  // Resolve project name for subtitle
  let projectName = 'All Projects';
  if (taskId) {
    const task = Store.getTaskById(taskId);
    if (task) projectName = task.title;
  }
  const backUrl = (role === 'worker' ? '/worker-milestone-board' : '/project-milestone-board') + (taskId ? '?id=' + taskId : '');
  const milestoneNames = [...new Set(reports.map(r => r.milestoneName))];

  const list = reports.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (milestoneFilter !== 'all' && r.milestoneName !== milestoneFilter) return false;
    return true;
  });

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={role} activePath={role === 'worker' ? '/worker-milestone-board' : '/client-my-projects'} pageTitle="Milestone Reports" pageSubtitle={projectName}>
        {/* Back + Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <Link to={backUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--muted-foreground)', transition: 'color 0.15s', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--foreground)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
            <Icon name="arrow-left" style={{ width: 16, height: 16 }} />
            Milestone Board
          </Link>
          <span style={{ color: 'var(--border)' }}>›</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>Milestone Reports</span>
        </div>

        {/* Summary stats */}
        <div className="reports-summary">
          <SummaryCard id="sum-total" icon="file-text" iconBg="#eef2ff" iconColor="#6366f1" value={list.length} label="Total Reports" />
          <SummaryCard id="sum-done" icon="check-circle" iconBg="#ecfdf5" iconColor="#10b981" value={list.filter(r => r.status === 'completed').length} valueColor="#10b981" label="Completed" />
          <SummaryCard id="sum-prog" icon="loader" iconBg="#eff6ff" iconColor="#2563eb" value={list.filter(r => r.status === 'in-progress').length} valueColor="#2563eb" label="In Progress" />
          <SummaryCard id="sum-audit" icon="file-search" iconBg="#fff7ed" iconColor="#ea580c" value={list.filter(r => r.type === 'technical-audit').length} label="Audit Reports" />
        </div>

        {/* Filters */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="sliders-horizontal" style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Filters</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Type filter buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {TYPE_FILTERS.map(f => (
                <button key={f.val} className={'filter-btn type-filter-btn' + (typeFilter === f.val ? ' active' : '')} data-val={f.val} onClick={() => setTypeFilter(f.val)}>
                  <Icon name={f.icon} style={{ width: 13, height: 13 }} />{' ' + f.label}
                </button>
              ))}
            </div>
            {/* Milestone select */}
            <div className="select-wrap" style={{ marginLeft: 'auto' }}>
              <select value={milestoneFilter} onChange={e => setMilestoneFilter(e.target.value)}>
                <option value="all">All Milestones</option>
                {milestoneNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <Icon name="chevron-down" className="chev" style={{ width: 14, height: 14 }} />
            </div>
          </div>
        </div>

        {/* Reports list */}
        <div className="section-header">
          <span className="section-title">
            Reports <span className="count-badge" id="reports-count">{list.length}</span>
          </span>
        </div>
        <div id="reports-list">
          {list.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <Icon name="file-text" style={{ width: 24, height: 24, color: 'var(--muted-foreground)' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No reports found</h3>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Try adjusting your filters to see more results.</p>
            </div>
          ) : list.map((r, i) => <ReportCard key={r.type + r.id} r={r} index={i} role={role} />)}
        </div>
      </DashboardLayout>
    </>
  );
}
