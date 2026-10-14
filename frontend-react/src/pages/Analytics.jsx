/**
 * LANNENT — Analytics (Project Insights)
 * Converted from front-end/pages/analytics.html.
 *
 * The client's project insights, all derived from real data: KPI tiles,
 * milestone velocity and revenue charts, worker performance, project health
 * and a timeline of recent events.
 */
import { useState } from 'react';
import ChartCanvas from '../components/ChartCanvas';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './Analytics.css?raw';

const DONE_MS = ['completed', 'approved', 'audit-passed', 'done'];

function monthKey(d) {
  const dt = new Date(d);
  return isNaN(dt) ? null : dt.toLocaleString('en-US', { month: 'short' });
}

function ago(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return 'Recently';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return days + ' days ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function riskBadge(risk) {
  if (risk === 'low') return { label: 'Low Risk', bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' };
  if (risk === 'medium') return { label: 'Medium Risk', bg: '#fffbeb', border: '#fde68a', text: '#b45309' };
  return { label: 'High Risk', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' };
}
const healthColor = s => (s >= 90 ? '#16a34a' : s >= 70 ? '#ca8a04' : '#dc2626');
const healthBarColor = s => (s >= 90 ? '#22c55e' : s >= 70 ? '#eab308' : '#ef4444');

/** Everything on the page, derived from the Store — not hardcoded. */
function buildInsights(Store, clientId) {
  const myTasks = Store.getTasksByClient(clientId);
  const myTaskIds = {};
  myTasks.forEach(t => { myTaskIds[t.id] = true; });
  let myMilestones = [];
  myTasks.forEach(t => { myMilestones = myMilestones.concat(Store.getMilestonesByTask(t.id)); });
  const myTxs = Store.getTransactions().filter(t => myTaskIds[t.taskId]);

  // Last six calendar months, oldest first — the buckets both charts share.
  const months = [];
  const now = new Date();
  for (let k = 5; k >= 0; k--) {
    months.push(new Date(now.getFullYear(), now.getMonth() - k, 1).toLocaleString('en-US', { month: 'short' }));
  }

  const milestoneData = months.map(m => ({
    month: m,
    completed: myMilestones.filter(ms => DONE_MS.indexOf(ms.status) !== -1 && monthKey(ms.approvedAt) === m).length,
  }));

  const sumOf = (type, m) => myTxs.filter(t => t.type === type && monthKey(t.createdAt) === m).reduce((a, t) => a + (t.amount || 0), 0);
  const revenueData = months.map(m => {
    const locked = sumOf('escrow-lock', m);
    const released = sumOf('milestone-release', m);
    return { month: m, escrow: locked, released, pending: Math.max(locked - released, 0) };
  });

  // Workers who have actually worked for this client.
  const byWorker = {};
  myTasks.forEach(t => {
    if (!t.workerId) return;
    if (!byWorker[t.workerId]) byWorker[t.workerId] = { tasks: [], done: 0 };
    byWorker[t.workerId].tasks.push(t);
    if (t.status === 'completed') byWorker[t.workerId].done++;
  });
  const workerPerformance = Object.keys(byWorker).map(wid => {
    const u = Store.getUserById(wid) || {};
    const msForWorker = myMilestones.filter(ms => ms.workerId === wid);
    const doneMs = msForWorker.filter(ms => DONE_MS.indexOf(ms.status) !== -1).length;
    const rate = msForWorker.length ? Math.round((doneMs / msForWorker.length) * 100) : 0;
    return {
      id: wid,
      name: u.name || 'Unknown worker',
      avatar: u.avatar || '??',
      projectsCompleted: u.completedProjects || byWorker[wid].done,
      successRate: rate,
      rating: u.rating || 0,
      onTimeDelivery: rate,
      top: false,
    };
  });
  workerPerformance.sort((a, b) => b.projectsCompleted - a.projectsCompleted);
  if (workerPerformance.length) workerPerformance[0].top = true;

  // Health = milestone completion rate, discounted when a dispute is open.
  const openDisputeTaskIds = {};
  Store.getDisputes().forEach(d => { if (d.status === 'open') openDisputeTaskIds[d.taskId] = true; });
  const projectHealth = myTasks
    .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
    .map(t => {
      const ms = Store.getMilestonesByTask(t.id);
      const done = ms.filter(m => DONE_MS.indexOf(m.status) !== -1).length;
      const pct = ms.length ? Math.round((done / ms.length) * 100) : (t.progress || 0);
      let score = pct;
      if (openDisputeTaskIds[t.id]) score = Math.max(score - 35, 0);
      const worker = t.workerId ? Store.getUserById(t.workerId) : null;
      return {
        id: t.id,
        name: t.title,
        healthScore: score,
        progress: t.progress != null ? t.progress : pct,
        risk: score >= 80 ? 'low' : score >= 60 ? 'medium' : 'high',
        worker: worker ? worker.name : 'Unassigned',
      };
    });

  // Recent real events, newest first.
  const events = [];
  myTxs.forEach(t => {
    if (t.type === 'milestone-release') {
      events.push({ at: t.createdAt, icon: 'dollar-sign', title: 'Escrow Released', desc: '$' + (t.amount || 0).toLocaleString() + ' — ' + (t.description || 'Milestone payment'), time: ago(t.createdAt), color: '#7c3aed', bg: '#faf5ff' });
    } else if (t.type === 'escrow-lock') {
      events.push({ at: t.createdAt, icon: 'users', title: 'Escrow Funded', desc: '$' + (t.amount || 0).toLocaleString() + ' — ' + (t.description || 'Project funded'), time: ago(t.createdAt), color: '#2563eb', bg: '#eff6ff' });
    }
  });
  myMilestones.forEach(ms => {
    if (ms.submittedAt) events.push({ at: ms.submittedAt, icon: 'check-circle', title: 'Milestone Submitted', desc: ms.title, time: ago(ms.submittedAt), color: '#16a34a', bg: '#f0fdf4' });
  });
  Store.getAuditReports().forEach(r => {
    if (!myTaskIds[r.taskId]) return;
    events.push({ at: r.createdAt, icon: 'shield', title: 'Expert Audit Completed', desc: (r.milestoneTitle || 'Milestone') + ' — verdict: ' + (r.verdict || 'n/a'), time: ago(r.createdAt), color: '#d97706', bg: '#fffbeb' });
  });
  events.sort((a, b) => new Date(b.at) - new Date(a.at));

  return {
    milestoneData, revenueData, workerPerformance, projectHealth,
    activityTimeline: events.slice(0, 5),
    kpi: {
      total: myTasks.length,
      active: myTasks.filter(t => t.status === 'in-progress').length,
      completed: myTasks.filter(t => t.status === 'completed').length,
      delayed: myTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.deadline && new Date(t.deadline) < new Date()).length,
    },
  };
}

/* ── Chart.js configuration (shared look) ── */
const FONT = { family: "'Geist','Inter',-apple-system,sans-serif", size: 12 };
const GRID = { color: '#e5e7eb', drawBorder: false };
const TICK_COLOR = '#9ca3af';
const TOOLTIP = {
  backgroundColor: '#fff',
  borderColor: '#e5e7eb',
  borderWidth: 1,
  titleColor: '#111827',
  bodyColor: '#374151',
  padding: 10,
  cornerRadius: 8,
  titleFont: { family: "'Geist','Inter',-apple-system,sans-serif", size: 12, weight: '500' },
  bodyFont: { family: "'Geist','Inter',-apple-system,sans-serif", size: 12 },
};

/** Milestone velocity — line chart */
function milestoneChartConfig(milestoneData) {
  return {
    type: 'line',
    data: {
      labels: milestoneData.map(d => d.month),
      datasets: [{
        label: 'Completed',
        data: milestoneData.map(d => d.completed),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,.10)',
        borderWidth: 2,
        pointBackgroundColor: '#8b5cf6',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: TOOLTIP },
      scales: {
        x: { grid: GRID, ticks: { color: TICK_COLOR, font: FONT } },
        y: { grid: GRID, ticks: { color: TICK_COLOR, font: FONT } },
      },
    },
  };
}

/** Revenue analytics — bar chart */
function revenueChartConfig(revenueData) {
  return {
    type: 'bar',
    data: {
      labels: revenueData.map(d => d.month),
      datasets: [
        { label: 'Escrow', data: revenueData.map(d => d.escrow), backgroundColor: '#3b82f6', borderRadius: 4 },
        { label: 'Released', data: revenueData.map(d => d.released), backgroundColor: '#10b981', borderRadius: 4 },
        { label: 'Pending', data: revenueData.map(d => d.pending), backgroundColor: '#f59e0b', borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: FONT, color: '#374151', usePointStyle: true, pointStyleWidth: 10, padding: 16 } },
        tooltip: TOOLTIP,
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: TICK_COLOR, font: FONT } },
        y: { grid: GRID, ticks: { color: TICK_COLOR, font: FONT, callback: v => '$' + (v / 1000) + 'k' } },
      },
    },
  };
}

/** One KPI tile. */
function KpiTile({ icon, iconColor, bg, border, label, value }) {
  return (
    <div className="pi-stat">
      <div className="pi-stat-top">
        <div className="pi-stat-icon" style={{ background: bg, border: `1px solid ${border}` }}>
          <Icon name={icon} style={{ width: 18, height: 18, color: iconColor }} />
        </div>
      </div>
      <div className="pi-stat-label">{label}</div>
      <div className="pi-stat-val">{value}</div>
    </div>
  );
}

export default function Analytics() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Project Insights — Lannent');
  const session = Auth.getCurrentUser();
  const [data] = useState(() => buildInsights(Store, session ? session.userId : 'u1'));
  const { kpi } = data;

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="client" activePath="/analytics" pageTitle="Project Insights" pageSubtitle="Track project progress, milestone velocity, worker performance, and revenue analytics.">
        {/* ── STAT CARDS ── */}
        <div className="pi-grid-4" style={{ marginBottom: 24 }}>
          <KpiTile icon="activity" iconColor="#2563eb" bg="#eff6ff" border="#bfdbfe" label="Total Projects" value={kpi.total} />
          <KpiTile icon="clock" iconColor="#16a34a" bg="#f0fdf4" border="#bbf7d0" label="Active Projects" value={kpi.active} />
          <KpiTile icon="check-circle" iconColor="#7c3aed" bg="#faf5ff" border="#ddd6fe" label="Completed Projects" value={kpi.completed} />
          <KpiTile icon="alert-circle" iconColor="#dc2626" bg="#fef2f2" border="#fecaca" label="Delayed Projects" value={kpi.delayed} />
        </div>

        {/* ── CHARTS ROW ── */}
        <div className="pi-grid-2" style={{ marginBottom: 24 }}>
          <div className="pi-card">
            <div className="pi-card-title">Milestone Velocity</div>
            <div className="pi-card-subtitle">Milestones completed over time</div>
            <div className="pi-chart-wrap"><ChartCanvas id="milestoneChart" config={milestoneChartConfig(data.milestoneData)} /></div>
          </div>
          <div className="pi-card">
            <div className="pi-card-title">Revenue Analytics</div>
            <div className="pi-card-subtitle">Escrow and released funds breakdown</div>
            <div className="pi-chart-wrap"><ChartCanvas id="revenueChart" config={revenueChartConfig(data.revenueData)} /></div>
          </div>
        </div>

        {/* ── WORKER PERFORMANCE TABLE ── */}
        <div className="pi-card" style={{ marginBottom: 24 }}>
          <div className="pi-card-title">Worker Performance</div>
          <div className="pi-card-subtitle">Top performing workers ranked by success metrics</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="pi-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th className="center">Projects Completed</th>
                  <th className="center">Success Rate</th>
                  <th className="center">Average Rating</th>
                  <th className="center">On-Time Delivery</th>
                </tr>
              </thead>
              <tbody>
                {data.workerPerformance.map(w => (
                  <tr key={w.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="pi-avatar">{w.avatar}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{w.name}</div>
                          {w.top ? <div className="top-badge"><Icon name="award" style={{ width: 12, height: 12 }} /> Top Performer</div> : ''}
                        </div>
                      </div>
                    </td>
                    <td className="center" style={{ fontWeight: 500 }}>{w.projectsCompleted}</td>
                    <td className="center">
                      <div className="pi-bar-wrap">
                        <div className="pi-bar-bg"><div className="pi-bar-fill" style={{ width: `${w.successRate}%` }}></div></div>
                        <span style={{ fontWeight: 500 }}>{`${w.successRate}%`}</span>
                      </div>
                    </td>
                    <td className="center">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Icon name="star" style={{ width: 14, height: 14, fill: '#facc15', color: '#facc15' }} />
                        <span style={{ fontWeight: 500 }}>{w.rating}</span>
                      </div>
                    </td>
                    <td className="center" style={{ fontWeight: 500 }}>{`${w.onTimeDelivery}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── PROJECT HEALTH + ACTIVITY TIMELINE ── */}
        <div className="pi-grid-2">
          <div className="pi-card">
            <div className="pi-card-title">Project Health</div>
            <div className="pi-card-subtitle">Current project health indicators</div>
            {data.projectHealth.map(p => {
              const rb = riskBadge(p.risk);
              return (
                <div key={p.id} className="pi-health-item">
                  <div className="pi-health-row">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{p.worker}</div>
                    </div>
                    <span className="pi-risk-badge" style={{ background: rb.bg, borderColor: rb.border, color: rb.text }}>
                      <Icon name="alert-circle" style={{ width: 12, height: 12 }} />
                      {rb.label}
                    </span>
                  </div>
                  <div className="pi-prog-grid">
                    <div>
                      <div className="pi-prog-label">
                        <span style={{ color: 'var(--muted-foreground)' }}>Health Score</span>
                        <span style={{ color: healthColor(p.healthScore) }}>{`${p.healthScore}/100`}</span>
                      </div>
                      <div className="pi-prog-bg"><div className="pi-prog-fill" style={{ width: `${p.healthScore}%`, background: healthBarColor(p.healthScore) }}></div></div>
                    </div>
                    <div>
                      <div className="pi-prog-label">
                        <span style={{ color: 'var(--muted-foreground)' }}>Progress</span>
                        <span>{`${p.progress}%`}</span>
                      </div>
                      <div className="pi-prog-bg"><div className="pi-prog-fill" style={{ width: `${p.progress}%`, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)' }}></div></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pi-card">
            <div className="pi-card-title">Activity Timeline</div>
            <div className="pi-card-subtitle">Recent project events and updates</div>
            {data.activityTimeline.map((a, i) => (
              <div key={i} className="pi-timeline-item">
                <div className="pi-tl-icon" style={{ background: a.bg }}>
                  <Icon name={a.icon} style={{ width: 16, height: 16, color: a.color }} />
                </div>
                <div>
                  <div className="pi-tl-title">{a.title}</div>
                  <div className="pi-tl-desc">{a.desc}</div>
                  <div className="pi-tl-time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
