/**
 * LANNENT — PerformanceAnalytics
 * Converted from front-end/pages/performance-analytics.html.
 *
 * The worker's performance, derived from real data: earnings, project
 * performance, milestone velocity, client feedback and invitations,
 * with three Chart.js charts.
 */
import { useState } from 'react';
import ChartCanvas from '../components/ChartCanvas';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './PerformanceAnalytics.css?raw';

const DONE_MS = ['completed', 'approved'];
const isDone = m => DONE_MS.indexOf(m.status) !== -1;
const fmtMoney = n => '₹' + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN');

/** Year and month, so last year's March is not counted as this year's. */
function monthKey(d) {
  const dt = new Date(d);
  return isNaN(dt) ? null : `${dt.getFullYear()}-${dt.getMonth()}`;
}

/** Everything on the page, derived from the Store — not hardcoded. */
function buildPerformance(Store, workerId) {
  const myTasks = Store.getTasksByWorker(workerId);
  let myMilestones = [];
  myTasks.forEach(t => {
    myMilestones = myMilestones.concat(Store.getMilestonesByTask(t.id).filter(m => !m.workerId || m.workerId === workerId));
  });
  const myReleases = Store.getTransactions().filter(t => t.type === 'milestone-release' && t.toId === workerId);

  // Trailing twelve months, oldest first.
  const months12 = [];
  const now = new Date();
  for (let k = 11; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    months12.push({ key: monthKey(d), label: d.toLocaleString('en-US', { month: 'short' }) });
  }

  const totalEarnings = myReleases.reduce((a, t) => a + (t.amount || 0), 0);
  const doneMsCount = myMilestones.filter(isDone).length;
  const overviewStats = {
    totalEarnings,
    projectsCompleted: myTasks.filter(t => t.status === 'completed').length,
    activeProjects: myTasks.filter(t => t.status === 'in-progress').length,
    successRate: myMilestones.length ? Math.round((doneMsCount / myMilestones.length) * 100) : 0,
  };

  const earningsData = months12.map(m => ({
    month: m.label,
    earnings: myReleases.filter(t => monthKey(t.createdAt) === m.key).reduce((a, t) => a + (t.amount || 0), 0),
  }));

  const projectPerformance = myTasks.map(t => {
    const ms = Store.getMilestonesByTask(t.id);
    const client = t.clientId ? Store.getUserById(t.clientId) : null;
    return {
      id: t.id,
      project: t.title,
      client: client ? client.name : 'Unknown client',
      initials: client ? client.avatar : '??',
      milestonesCompleted: ms.filter(isDone).length,
      totalMilestones: ms.length,
      payment: myReleases.filter(tx => tx.taskId === t.id).reduce((a, tx) => a + (tx.amount || 0), 0),
      status: t.status,
    };
  });

  // Velocity = days between a milestone being submitted and approved.
  const turnarounds = myMilestones
    .filter(m => m.submittedAt && m.approvedAt)
    .map(m => ({ month: monthKey(m.approvedAt), days: Math.max((new Date(m.approvedAt) - new Date(m.submittedAt)) / 86400000, 0) }))
    .filter(x => !isNaN(x.days));
  const milestoneVelocityData = months12.slice(-6).map(m => {
    const inMonth = turnarounds.filter(x => x.month === m.key);
    const avg = inMonth.length ? inMonth.reduce((a, x) => a + x.days, 0) / inMonth.length : 0;
    return { month: m.label, avgDays: +avg.toFixed(1) };
  });
  const avgDaysAll = turnarounds.length ? turnarounds.reduce((a, x) => a + x.days, 0) / turnarounds.length : 0;
  const lateDeliveries = myMilestones.filter(m => m.dueDate && m.submittedAt && new Date(m.submittedAt) > new Date(m.dueDate)).length;
  const velocityStats = {
    avgCompletionTime: turnarounds.length ? avgDaysAll.toFixed(1) + ' days' : 'No data yet',
    onTimeDeliveryRate: myMilestones.length ? Math.round(((myMilestones.length - lateDeliveries) / myMilestones.length) * 100) : 0,
    lateDeliveries,
  };

  // Applications the worker sent, at the clients' posted budgets (there is no bidding).
  const invitations = Store.getApplicationsByWorker(workerId);
  const accepted = invitations.filter(p => p.status === 'hired').length;
  const rejected = invitations.filter(p => ['rejected', 'withdrawn', 'closed'].includes(p.status)).length;
  const pending = invitations.filter(p => p.status === 'pending').length;
  const proposalStats = { sent: invitations.length, accepted, rejected, pending, successRate: invitations.length ? Math.round((accepted / invitations.length) * 100) : 0 };

  return {
    overviewStats, earningsData, projectPerformance, milestoneVelocityData, velocityStats,
    proposalStats, hasProposals: invitations.length > 0,
  };
}

/* ── Chart.js configuration ── */
const TOOLTIP = {
  backgroundColor: '#fff',
  borderColor: '#e5e7eb',
  borderWidth: 1,
  titleColor: '#111827',
  bodyColor: '#374151',
  padding: 10,
  cornerRadius: 8,
  titleFont: { family: "'Geist','Inter',sans-serif", size: 12, weight: '500' },
  bodyFont: { family: "'Geist','Inter',sans-serif", size: 12 },
};
const TICKS = { color: '#9ca3af', font: { family: "'Geist','Inter',sans-serif", size: 12 } };
const GRID = { color: '#e5e7eb', drawBorder: false };

const earningsChartConfig = earningsData => ({
  type: 'line',
  data: {
    labels: earningsData.map(d => d.month),
    datasets: [{
      label: 'Earnings',
      data: earningsData.map(d => d.earnings),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34,197,94,.10)',
      borderWidth: 2,
      pointBackgroundColor: '#22c55e',
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true,
      tension: 0.35,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...TOOLTIP, callbacks: { label: ctx => ' ₹' + ctx.parsed.y.toLocaleString('en-IN') } },
    },
    scales: {
      x: { grid: GRID, ticks: TICKS },
      y: { grid: GRID, beginAtZero: true, ticks: { ...TICKS, callback: v => (v >= 1000 ? '₹' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '₹' + v) } },
    },
  },
});

const velocityChartConfig = velocityData => ({
  type: 'bar',
  data: {
    labels: velocityData.map(d => d.month),
    datasets: [{ label: 'Avg. Days', data: velocityData.map(d => d.avgDays), backgroundColor: '#3b82f6', borderRadius: 8 }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...TOOLTIP, callbacks: { label: ctx => ' ' + ctx.parsed.y + ' days' } },
    },
    scales: {
      x: { grid: { display: false }, ticks: TICKS },
      y: { grid: GRID, ticks: TICKS, beginAtZero: true, suggestedMax: 7 },
    },
  },
});

const proposalChartConfig = stats => ({
  type: 'doughnut',
  data: {
    labels: ['Hired', 'Not selected', 'Pending'],
    datasets: [{
      // An empty ring still needs a value to draw; grey it out.
      data: stats.sent ? [stats.accepted, stats.rejected, stats.pending] : [0, 0, 1],
      backgroundColor: ['#22c55e', '#ef4444', stats.sent ? '#f59e0b' : '#e5e7eb'],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: { legend: { display: false }, tooltip: { ...TOOLTIP, enabled: !!stats.sent } },
  },
});

/** One of the four stat cards at the top. */
function PaStat({ icon, iconColor, bg, border, trendIcon, value, label }) {
  return (
    <div className="pa-stat">
      <div className="pa-stat-top">
        <div className="pa-stat-icon" style={{ background: bg, border: `1px solid ${border}` }}>
          <Icon name={icon} style={{ width: 20, height: 20, color: iconColor }} />
        </div>
        <Icon name={trendIcon} style={{ width: 16, height: 16, color: iconColor }} />
      </div>
      <div className="pa-stat-val">{value}</div>
      <div className="pa-stat-label">{label}</div>
    </div>
  );
}

/** One project row of "Project Performance". */
function ProjectRow({ p }) {
  const pct = p.totalMilestones ? Math.round((p.milestonesCompleted / p.totalMilestones) * 100) : 0;
  const STATUS = { completed: ['pa-badge-green', 'Completed'], cancelled: ['pa-badge-red', 'Cancelled'] };
  const [badgeClass, badgeText] = STATUS[p.status] || ['pa-badge-blue', 'In Progress'];
  return (
    <div className="pa-project-item">
      <div className="pa-project-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{p.project}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="pa-avatar" style={{ width: 20, height: 20, fontSize: 9 }}>{p.initials}</div>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{p.client}</span>
          </div>
        </div>
      </div>
      <div className="pa-project-meta">
        <div>
          <div className="pa-project-meta-label">Milestones</div>
          <div className="pa-project-meta-val">{`${p.milestonesCompleted}/${p.totalMilestones}`}</div>
          <div className="pa-progress-bg"><div className="pa-progress-fill" style={{ width: `${pct}%`, background: '#16a34a' }}></div></div>
        </div>
        <div>
          <div className="pa-project-meta-label">Payment</div>
          <div className="pa-project-meta-val" style={{ color: '#16a34a' }}>{fmtMoney(p.payment)}</div>
        </div>
        <div>
          <div className="pa-project-meta-label">Status</div>
          <span className={'pa-badge ' + badgeClass}>{badgeText}</span>
        </div>
      </div>
    </div>
  );
}

/** A small tile in "Milestone Velocity". */
function MiniCard({ icon, iconColor, label, value, valueColor }) {
  return (
    <div className="pa-mini-card">
      <div className="pa-mini-card-label">
        <Icon name={icon} style={{ width: 16, height: 16, color: iconColor }} />
        {label}
      </div>
      <div className="pa-mini-card-val" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
    </div>
  );
}

export default function PerformanceAnalytics() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Performance Analytics — Lannent');
  const session = Auth.getCurrentUser();
  const [data] = useState(() => buildPerformance(Store, session.userId));
  const { overviewStats, velocityStats, proposalStats } = data;
  const share = n => (proposalStats.sent ? Math.round((n / proposalStats.sent) * 100) : 0);
  const avgMonthly = Math.round(data.earningsData.reduce((s, d) => s + d.earnings, 0) / data.earningsData.length);

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="worker" activePath="/performance-analytics" pageTitle="Performance Analytics" pageSubtitle="Track your earnings, project performance, and success rate.">
        {/* ── 1. Stat Cards ── */}
        <div className="pa-grid-4" style={{ marginBottom: 24 }}>
          <PaStat icon="indian-rupee" iconColor="#16a34a" bg="#f0fdf4" border="#bbf7d0" trendIcon="trending-up" value={fmtMoney(overviewStats.totalEarnings)} label="Total Earnings" />
          <PaStat icon="check-circle" iconColor="#2563eb" bg="#eff6ff" border="#bfdbfe" trendIcon="award" value={overviewStats.projectsCompleted} label="Projects Completed" />
          <PaStat icon="activity" iconColor="#ea580c" bg="#fff7ed" border="#fed7aa" trendIcon="trending-up" value={overviewStats.activeProjects} label="Active Projects" />
          <PaStat icon="target" iconColor="#7c3aed" bg="#faf5ff" border="#ddd6fe" trendIcon="star" value={`${overviewStats.successRate}%`} label="Success Rate" />
        </div>

        {/* ── 2. Earnings Over Time ── */}
        <div className="pa-card" style={{ marginBottom: 24 }}>
          <div className="pa-card-header">
            <div>
              <div className="pa-card-title">Earnings Over Time</div>
              <div className="pa-card-subtitle" style={{ marginBottom: 0 }}>Monthly earnings trend for the past 12 months</div>
            </div>
            <div className="pa-earnings-avg">
              <div className="pa-earnings-avg-label">Average Monthly</div>
              <div className="pa-earnings-avg-val">{fmtMoney(avgMonthly)}</div>
            </div>
          </div>
          <div className="pa-chart-tall"><ChartCanvas id="earningsChart" config={earningsChartConfig(data.earningsData)} /></div>
        </div>

        <div className="pa-grid-3">
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* ── 3. Project Performance ── */}
              <div className="pa-card" style={{ marginBottom: 24 }}>
                <div className="pa-card-title">Project Performance</div>
                <div style={{ height: 12 }}></div>
                {data.projectPerformance.length
                  ? data.projectPerformance.map(p => <ProjectRow key={p.id} p={p} />)
                  : <div style={{ padding: '18px 4px', color: 'var(--muted-foreground)', fontSize: 13 }}>No projects yet — once a client hires you, each project's progress and payments show here.</div>}
              </div>

              {/* ── 4. Milestone Velocity ── */}
              <div className="pa-card" style={{ marginBottom: 24 }}>
                <div className="pa-card-title">Milestone Velocity</div>
                <div style={{ height: 16 }}></div>
                <div className="pa-grid-3col" style={{ marginBottom: 20 }}>
                  <MiniCard icon="clock" iconColor="#2563eb" label="Avg. Completion" value={velocityStats.avgCompletionTime} />
                  <MiniCard icon="check-circle" iconColor="#16a34a" label="On-Time Rate" value={`${velocityStats.onTimeDeliveryRate}%`} valueColor="#16a34a" />
                  <MiniCard icon="calendar" iconColor="#ea580c" label="Late Deliveries" value={velocityStats.lateDeliveries} />
                </div>
                <div className="pa-chart-mid"><ChartCanvas id="velocityChart" config={velocityChartConfig(data.milestoneVelocityData)} /></div>
              </div>
            </div>
          </div>

          {/* ── 6. Applications (right sidebar) ── */}
          <div>
            <div className="pa-card">
              <div className="pa-card-title" style={{ marginBottom: 20 }}>Application Success Rate</div>
              <div className="pa-proposal-row">
                <div className="pa-proposal-icon-label">
                  <Icon name="send" style={{ width: 16, height: 16, color: '#2563eb' }} />
                  Applications Sent
                </div>
                <div className="pa-proposal-val">{proposalStats.sent}</div>
              </div>
              <div className="pa-proposal-row">
                <div className="pa-proposal-icon-label">
                  <Icon name="check-circle" style={{ width: 16, height: 16, color: '#16a34a' }} />
                  Hired
                </div>
                <div className="pa-proposal-val" style={{ color: '#16a34a' }}>{proposalStats.accepted}</div>
              </div>
              <div className="pa-proposal-divider"></div>
              <div className="pa-proposal-row">
                <div className="pa-proposal-icon-label" style={{ fontWeight: 500, color: 'var(--foreground)' }}>
                  <Icon name="target" style={{ width: 16, height: 16, color: '#7c3aed' }} />
                  Acceptance Rate
                </div>
                <div className="pa-proposal-val" style={{ fontSize: 24, color: '#7c3aed' }}>{`${proposalStats.successRate}%`}</div>
              </div>
              <div className="pa-chart-donut" style={{ marginTop: 8 }}><ChartCanvas id="proposalChart" config={proposalChartConfig(proposalStats)} /></div>
              <div className="pa-legend">
                <div className="pa-legend-row">
                  <div className="pa-legend-dot-label">
                    <div className="pa-legend-dot" style={{ background: '#22c55e' }}></div>
                    <span className="pa-legend-text">Hired</span>
                  </div>
                  <span className="pa-legend-val">{`${proposalStats.accepted} (${share(proposalStats.accepted)}%)`}</span>
                </div>
                <div className="pa-legend-row">
                  <div className="pa-legend-dot-label">
                    <div className="pa-legend-dot" style={{ background: '#ef4444' }}></div>
                    <span className="pa-legend-text">Not selected</span>
                  </div>
                  <span className="pa-legend-val">{`${proposalStats.rejected} (${share(proposalStats.rejected)}%)`}</span>
                </div>
                <div className="pa-legend-row">
                  <div className="pa-legend-dot-label">
                    <div className="pa-legend-dot" style={{ background: '#f59e0b' }}></div>
                    <span className="pa-legend-text">Pending</span>
                  </div>
                  <span className="pa-legend-val">{`${proposalStats.pending} (${share(proposalStats.pending)}%)`}</span>
                </div>
              </div>
              <div className="pa-insight-box">
                <div className="pa-insight-inner">
                  <Icon name="trending-up" style={{ width: 16, height: 16, color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div className="pa-insight-title">{!data.hasProposals ? 'No applications yet' : `${proposalStats.accepted} of ${proposalStats.sent} hired`}</div>
                    <div className="pa-insight-body">
                      {!data.hasProposals
                        ? 'Apply to open projects from Browse Tasks. Clients can also invite you directly.'
                        : `Clients hired you on ${proposalStats.successRate}% of your applications. An application closes when the client hires someone else.`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
