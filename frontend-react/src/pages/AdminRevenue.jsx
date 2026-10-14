/**
 * LANNENT — AdminRevenue (Revenue)
 * Converted from front-end/pages/admin-revenue.html.
 *
 * How the platform earns and what every user receives: summary tiles,
 * revenue over time, revenue by fee type, where escrowed money goes, and a
 * per-project table with a full money-flow breakdown.
 */
import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './AdminRevenue.css?raw';

const money = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = n => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
  return '$' + v.toFixed(0);
};
const prettyFee = t => ({
  'deposit-processing': 'Deposit processing',
  'client-marketplace': 'Client marketplace',
  'contract-initiation': 'Contract initiation',
  'worker-service': 'Worker service',
  'expert-service': 'Reviewer commission',
  'withdrawal-processing': 'Withdrawal payout',
}[t] || t);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const EMPTY_STYLE = { padding: '34px 0', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 };

// ── Tooltip ────────────────────────────────────────────────────────────────
// A single floating box appended to <body>, shown while hovering a chart.
function tip() {
  let el = document.getElementById('vizTip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'vizTip'; el.className = 'viz-tip';
    document.body.appendChild(el);
  }
  return el;
}
function showTip(evt, html) {
  const el = tip();
  el.innerHTML = html;
  el.classList.add('on');
  const pad = 14;
  let x = evt.clientX + pad, y = evt.clientY - pad;
  const r = el.getBoundingClientRect();
  if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - pad;
  if (y < 8) y = evt.clientY + pad;
  el.style.left = x + 'px'; el.style.top = y + 'px';
}
function hideTip() { tip().classList.remove('on'); }

// ── Chart 1: revenue over time (single series, no legend) ────────────────────
function TimeseriesChart({ rows, period }) {
  const [cross, setCross] = useState({ x: 0, visible: false });
  if (!rows.length) return <div style={EMPTY_STYLE}>No revenue recorded yet.</div>;

  const W = 720, H = 250, L = 58, R = 22, T = 26, B = 34;
  const iw = W - L - R, ih = H - T - B;
  const max = Math.max(...rows.map(r => r.revenue), 1);
  const niceMax = Math.ceil(max / 4) * 4 || 4;
  const x = i => (rows.length === 1 ? L + iw / 2 : L + (i / (rows.length - 1)) * iw);
  const y = v => T + ih - (v / niceMax) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => niceMax * f);

  const line = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r.revenue).toFixed(1)}`).join(' ');
  const area = rows.length > 1
    ? `${line} L${x(rows.length - 1).toFixed(1)},${(T + ih).toFixed(1)} L${x(0).toFixed(1)},${(T + ih).toFixed(1)} Z`
    : '';

  // Label the ends only — never a number on every point.
  // Anchor the first and last labels inward so they cannot overrun the viewBox.
  const anchorFor = i => (i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle');
  const isEnd = i => i === 0 || i === rows.length - 1;
  // With many buckets, thin the labels rather than letting them collide.
  const step = Math.ceil(rows.length / 8);
  // Hit targets wider than the marks.
  const hitW = rows.length === 1 ? iw : iw / (rows.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Platform revenue by ${period}`}>
      {ticks.map(t => (
        <g key={t}>
          <line className="viz-grid-line" x1={L} x2={W - R} y1={y(t).toFixed(1)} y2={y(t).toFixed(1)} />
          <text className="viz-tick" x={L - 9} y={(y(t) + 4).toFixed(1)} textAnchor="end">{compact(t)}</text>
        </g>
      ))}
      {area ? <path d={area} fill="var(--series-1)" opacity="0.10" /> : ''}
      <path d={line} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {rows.map((r, i) => (
        <g key={i}>
          <circle cx={x(i).toFixed(1)} cy={y(r.revenue).toFixed(1)} r="4.5" fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth="2" />
          {isEnd(i) ? (
            <text className="viz-value" x={x(i).toFixed(1)} y={Math.max(y(r.revenue) - 12, 12).toFixed(1)} textAnchor={anchorFor(i)}>{compact(r.revenue)}</text>
          ) : ''}
        </g>
      ))}
      <line className="viz-axis-line" x1={L} x2={W - R} y1={T + ih} y2={T + ih} />
      {rows.map((r, i) => (isEnd(i) || i % step === 0
        ? <text key={i} className="viz-tick" x={x(i).toFixed(1)} y={H - 12} textAnchor={anchorFor(i)}>{r.period}</text>
        : null))}
      <line id="tsCross" x1={cross.x} x2={cross.x} y1={T} y2={T + ih} stroke="var(--viz-axis)" strokeWidth="1" strokeDasharray="3 3" opacity={cross.visible ? '1' : '0'} />
      {rows.map((r, i) => (
        <rect key={i} x={(x(i) - hitW / 2).toFixed(1)} y={T} width={hitW.toFixed(1)} height={ih} fill="transparent" data-i={i} className="ts-hit" style={{ cursor: 'crosshair' }}
              onMouseMove={e => {
                setCross({ x: x(i).toFixed(1), visible: true });
                showTip(e, `${esc(r.period)}<br><b>${money(r.revenue)}</b> from ${r.events} fee${r.events === 1 ? '' : 's'}`);
              }}
              onMouseLeave={() => { setCross(c => ({ ...c, visible: false })); hideTip(); }} />
      ))}
    </svg>
  );
}

// ── Chart 2: revenue by fee type (ranked magnitude, one hue) ─────────────────
function FeeTypeChart({ rows }) {
  if (!rows.length) return <div style={EMPTY_STYLE}>No fees charged yet.</div>;
  const rowH = 34, gap = 8, L = 150, R = 74;
  const W = 620, H = rows.length * (rowH + gap) + 8;
  const iw = W - L - R;
  const max = Math.max(...rows.map(r => r.total), 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Revenue by fee type">
      {rows.map((r, i) => {
        const y = i * (rowH + gap) + 4;
        const w = Math.max((r.total / max) * iw, 2);
        return (
          <g key={i}>
            <text className="viz-label" x={L - 12} y={y + rowH / 2 + 4} textAnchor="end">{prettyFee(r.feeType)}</text>
            <rect x={L} y={y} width={w.toFixed(1)} height={rowH} rx="4" fill="var(--series-1)" className="fee-bar" data-i={i} style={{ cursor: 'pointer' }}
                  onMouseMove={e => showTip(e, `${esc(prettyFee(r.feeType))}<br><b>${money(r.total)}</b> · ${r.share}% of revenue<br>${r.count} charge${r.count === 1 ? '' : 's'} on ${money(r.baseTotal)}`)}
                  onMouseLeave={hideTip} />
            <text className="viz-value" x={(L + w + 10).toFixed(1)} y={y + rowH / 2 + 4}>{money(r.total)}</text>
          </g>
        );
      })}
      <line className="viz-axis-line" x1={L} x2={L} y1="0" y2={H} />
    </svg>
  );
}

// ── Chart 3: where each escrowed dollar goes (part-to-whole) ─────────────────
function DistributionChart({ d }) {
  const segs = d.segments.filter(s => s.amount > 0);
  const W = 660, H = 62, gapPx = 2, r = 4;

  // 2px surface gap between adjacent fills.
  let cx = 0;
  const parts = segs.map((s, i) => {
    const w = Math.max((s.amount / d.totalFunded) * W - (i < segs.length - 1 ? gapPx : 0), 1);
    const x = cx;
    cx += w + gapPx;
    return { s, i, w, x };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="How escrowed funds are distributed">
      {parts.map(({ s, i, w, x }) => {
        const first = i === 0, last = i === segs.length - 1;
        // Round only the outer ends of the whole bar.
        const path = `M${(x + (first ? r : 0)).toFixed(1)},0
          H${(x + w - (last ? r : 0)).toFixed(1)}
          ${last ? `a${r},${r} 0 0 1 ${r},${r}` : ''}
          V${(H - (last ? r : 0)).toFixed(1)}
          ${last ? `a${r},${r} 0 0 1 -${r},${r}` : ''}
          H${(x + (first ? r : 0)).toFixed(1)}
          ${first ? `a${r},${r} 0 0 1 -${r},-${r}` : ''}
          V${first ? r : 0}
          ${first ? `a${r},${r} 0 0 1 ${r},-${r}` : ''} Z`;
        return (
          <path key={i} d={path} fill={`var(--series-${(i % 5) + 1})`} className="dist-seg" data-i={i} style={{ cursor: 'pointer' }}
                onMouseMove={e => showTip(e, `${esc(s.label)}<br><b>${money(s.amount)}</b> · ${s.share}% of ${money(d.totalFunded)}`)}
                onMouseLeave={hideTip} />
        );
      })}
      {/* Direct labels on any segment wide enough — the relief for low-contrast slots. */}
      {parts.map(({ s, i, w, x }) => (w < 62 ? null : (
        <text key={i} x={(x + w / 2).toFixed(1)} y={H / 2 + 4} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: '#fff' }}>{`${s.share}%`}</text>
      )))}
    </svg>
  );
}

/** One "label ........ value" line of the project breakdown. */
function Line({ label, value, fee, good, total }) {
  const color = fee ? '#b45309' : good ? '#0d9488' : 'inherit';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '6px 0', fontSize: 13, ...(total ? { borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 9 } : {}) }}>
      <span style={{ color: 'var(--muted-foreground)', fontWeight: total ? '700' : '400' }}>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: total ? '700' : '600', color }}>{value}</span>
    </div>
  );
}

/** A grey card in the project breakdown. */
function BreakdownCard({ title, children }) {
  return (
    <div style={{ background: 'var(--secondary)', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

/** One project's full money flow. */
function ProjectBreakdown({ b, onClose }) {
  return (
    <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{b.project.title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>
            {`${b.project.category} · budget ${money(b.project.budget)}`
              + (b.project.client ? ' · client ' + b.project.client.name : '')
              + (b.project.worker ? ' · worker ' + b.project.worker.name : '')}
          </div>
        </div>
        <button className="viz-toggle" onClick={onClose}>Close</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 14 }}>
        <BreakdownCard title="Client paid in">
          <Line label="Into project escrow" value={money(b.clientPaid.intoProjectEscrow)} />
          <Line label="Into audit escrow" value={money(b.clientPaid.intoAuditEscrow)} />
          <Line label="Marketplace fee" value={money(b.clientPaid.marketplaceFee)} fee />
          <Line label="Contract initiation" value={money(b.clientPaid.initiationFee)} fee />
          <Line label="Total charged" value={money(b.clientPaid.total)} total />
        </BreakdownCard>

        <BreakdownCard title={'Gig worker' + (b.worker.name ? ' — ' + b.worker.name : '')}>
          <Line label="Gross released" value={money(b.worker.grossReleased)} />
          <Line label="Service fees" value={'−' + money(b.worker.serviceFees)} fee />
          <Line label="Net received" value={money(b.worker.netReceived)} total good />
          <Line label="Milestones paid" value={String(b.worker.milestonesPaid)} />
        </BreakdownCard>

        <BreakdownCard title="Reviewer — audit">
          <Line label="Agreed fees" value={money(b.reviewerAudit.grossFees)} />
          <Line label="Platform commission" value={'−' + money(b.reviewerAudit.commission)} fee />
          <Line label="Net received" value={money(b.reviewerAudit.netReceived)} total good />
          <Line label="Audits" value={String(b.reviewerAudit.count) + (b.reviewerAudit.reviewers.length ? ' · ' + b.reviewerAudit.reviewers.join(', ') : '')} />
        </BreakdownCard>

        <BreakdownCard title="Reviewer — disputes">
          <Line label="Agreed fees" value={money(b.reviewerDispute.grossFees)} />
          <Line label="Platform commission" value={'−' + money(b.reviewerDispute.commission)} fee />
          <Line label="Net received" value={money(b.reviewerDispute.netReceived)} total good />
          <Line label="Disputes" value={String(b.reviewerDispute.count) + (b.reviewerDispute.reviewers.length ? ' · ' + b.reviewerDispute.reviewers.join(', ') : '')} />
        </BreakdownCard>

        <BreakdownCard title="Still held & refunded">
          <Line label="Project escrow" value={money(b.stillHeld.project)} />
          <Line label="Audit escrow" value={money(b.stillHeld.audit)} />
          <Line label="Refunded to client" value={money(b.refundedToClient)} />
          <Line label="Total held" value={money(b.stillHeld.total)} total />
        </BreakdownCard>

        <BreakdownCard title="Platform earnings">
          <Line label="Marketplace fee" value={money(b.platformEarnings.marketplaceFee)} />
          <Line label="Contract initiation" value={money(b.platformEarnings.initiationFee)} />
          <Line label="Worker service fees" value={money(b.platformEarnings.workerServiceFees)} />
          <Line label="Reviewer commission" value={money(b.platformEarnings.reviewerCommission)} />
          <Line label="Total earned" value={money(b.platformEarnings.total)} total good />
        </BreakdownCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 8 }}>Every movement on this project</div>
        <div className="viz-table-wrap">
          <table className="viz-table">
            <thead>
              <tr>
                <th>Movement</th><th>From</th><th>To</th>
                <th className="num">Gross</th><th className="num">Fee</th><th className="num">Net</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {b.ledger.map((t, i) => (
                <tr key={i}>
                  <td>{t.type}</td><td>{t.from}</td><td>{t.to}</td>
                  <td className="num">{money(t.gross)}</td>
                  <td className="num" style={{ color: t.fee ? '#b45309' : 'inherit' }}>{t.fee ? money(t.fee) : '—'}</td>
                  <td className="num">{money(t.net)}</td><td>{t.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** "Show data table" / "Hide data table" toggle under a chart. */
function TableToggle({ id, style, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="viz-toggle" style={style} onClick={() => setOpen(o => !o)}>{open ? 'Hide data table' : 'Show data table'}</button>
      <div id={id} hidden={!open} style={{ marginTop: 12 }}>
        <div className="viz-table-wrap">{children}</div>
      </div>
    </>
  );
}

export default function AdminRevenue() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Revenue — Lannent');
  const [data] = useState(() => ({
    summary: Store.getRevenueSummary(),
    byFeeType: Store.getRevenueByFeeType(),
    distribution: Store.getRevenueDistribution(),
    byProject: Store.getRevenueByProject(),
  }));
  const [period, setPeriod] = useState('month');
  const [timeseries, setTimeseries] = useState(() => Store.getRevenueTimeseries('month'));
  const [breakdown, setBreakdown] = useState(null);   // { b } once a project is opened
  const detailRef = useRef(null);

  // The tooltip lives on <body>; remove it when leaving the page.
  useEffect(() => () => document.getElementById('vizTip')?.remove(), []);

  // Bring the breakdown into view when it opens
  useEffect(() => {
    if (breakdown && detailRef.current) detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [breakdown]);

  const s = data.summary || {};
  const d = data.distribution || { segments: [], totalFunded: 0 };
  const fees = data.byFeeType || [];
  const projects = data.byProject || [];

  function changePeriod(p) {
    setPeriod(p);
    setTimeseries(Store.getRevenueTimeseries(p));
  }

  function showProject(taskId) {
    setBreakdown({ b: Store.getProjectBreakdown(taskId) });
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={(Auth.getCurrentUser() || {}).role} activePath="/admin-revenue" pageTitle="Revenue" pageSubtitle="How the platform earns, and what every user receives">
        <div className="viz">
          <div className="rev-tiles">
            <div className="rev-tile">
              <div className="rev-tile-k">Total revenue</div>
              <div className="rev-tile-v" style={{ color: 'var(--series-1)' }}>{money(s.totalRevenue)}</div>
              <div className="rev-tile-s">{`across ${s.feeEvents || 0} fee events`}</div>
            </div>
            <div className="rev-tile">
              <div className="rev-tile-k">Gross volume</div>
              <div className="rev-tile-v">{money(s.grossVolume)}</div>
              <div className="rev-tile-s">paid to workers and reviewers</div>
            </div>
            <div className="rev-tile">
              <div className="rev-tile-k">Take rate</div>
              <div className="rev-tile-v">{`${s.takeRate ?? 0}%`}</div>
              <div className="rev-tile-s">of value delivered</div>
            </div>
            <div className="rev-tile">
              <div className="rev-tile-k">Held in escrow</div>
              <div className="rev-tile-v">{money(s.escrowHeld)}</div>
              <div className="rev-tile-s">{`${s.activeContracts || 0} active · ${s.draftProjects || 0} draft`}</div>
            </div>
          </div>

          <div className="viz-card">
            <div className="viz-head">
              <div>
                <div className="viz-title">Platform revenue over time</div>
                {/* The subtitle keeps the period it was opened with (as before). */}
                <div className="viz-sub">Every fee the platform charged, bucketed by month.</div>
              </div>
              <div className="rev-period">
                {[['day', 'Day'], ['week', 'Week'], ['month', 'Month']].map(([p, label]) => (
                  <button key={p} className={period === p ? 'on' : undefined} onClick={() => changePeriod(p)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="viz-plot" id="tsPlot">
              <TimeseriesChart rows={timeseries || []} period={period} />
            </div>
          </div>

          <div className="rev-two">
            <div className="viz-card">
              <div className="viz-title">Revenue by fee type</div>
              <div className="viz-sub">Which charges the revenue actually comes from.</div>
              <div className="viz-plot" id="feePlot">
                <FeeTypeChart rows={fees} />
              </div>
              <TableToggle id="feeTable">
                <table className="viz-table">
                  <thead>
                    <tr>
                      <th>Fee type</th><th className="num">Revenue</th><th className="num">Share</th><th className="num">Charges</th><th className="num">Charged on</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map((r, i) => (
                      <tr key={i}>
                        <td>{prettyFee(r.feeType)}</td>
                        <td className="num">{money(r.total)}</td>
                        <td className="num">{`${r.share}%`}</td>
                        <td className="num">{r.count}</td>
                        <td className="num">{money(r.baseTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableToggle>
            </div>

            <div className="viz-card">
              <div className="viz-title">Where each escrowed dollar goes</div>
              <div className="viz-sub">{`${money(d.totalFunded)} funded into escrow all-time.`}</div>
              <div className="viz-plot" id="distPlot">
                {d && d.totalFunded
                  ? <DistributionChart d={d} />
                  : <div style={EMPTY_STYLE}>Nothing has been funded into escrow yet.</div>}
              </div>
              <div className="viz-legend" id="distLegend">
                {d && d.totalFunded ? d.segments.filter(x => x.amount > 0).map((x, i) => (
                  <span key={i} className="viz-legend-item">
                    <span className="viz-swatch" style={{ background: `var(--series-${(i % 5) + 1})` }}></span>
                    {`${x.label} · `}<b style={{ color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{money(x.amount)}</b>
                  </span>
                )) : ''}
              </div>
              <TableToggle id="distTable" style={{ marginTop: 10 }}>
                <table className="viz-table">
                  <thead>
                    <tr>
                      <th>Destination</th><th className="num">Amount</th><th className="num">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.segments.map((x, i) => (
                      <tr key={i}><td>{x.label}</td><td className="num">{money(x.amount)}</td><td className="num">{`${x.share}%`}</td></tr>
                    ))}
                    <tr><td style={{ fontWeight: 700 }}>Total funded</td><td className="num" style={{ fontWeight: 700 }}>{money(d.totalFunded)}</td><td className="num">100%</td></tr>
                  </tbody>
                </table>
              </TableToggle>
            </div>
          </div>

          <div className="viz-card">
            <div className="viz-title">Revenue by project</div>
            <div className="viz-sub">Select a project to see exactly where its money came from and went.</div>
            <div className="viz-table-wrap" id="projectTable">
              {!projects.length ? (
                <div style={{ padding: 26, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>No project activity yet.</div>
              ) : (
                <table className="viz-table">
                  <thead>
                    <tr>
                      <th>Project</th><th>Status</th>
                      <th className="num">Funded</th><th className="num">Held</th>
                      <th className="num">Platform revenue</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p.taskId}>
                        <td>{p.title}</td>
                        <td><span className="rev-role">{p.status}</span></td>
                        <td className="num">{money(p.funded)}</td>
                        <td className="num">{money(p.escrowHeld)}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{money(p.platformRevenue)}</td>
                        <td className="num"><button className="viz-toggle" onClick={() => showProject(p.taskId)}>Breakdown</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div id="projectDetail" ref={detailRef}>
              {breakdown && (breakdown.b
                ? <ProjectBreakdown b={breakdown.b} onClose={() => setBreakdown(null)} />
                : <div style={{ padding: 18, color: 'var(--muted-foreground)' }}>Could not load that project.</div>)}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
