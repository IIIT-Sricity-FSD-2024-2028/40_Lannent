/**
 * LANNENT — ExpertDashboard
 * Converted from front-end/pages/expert-dashboard.html.
 *
 * The Expert Reviewer's home: four live stats plus the latest audit
 * requests and dispute cases they can pick up.
 */
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ExpertDashboard.css?raw';

export default function ExpertDashboard() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Expert Dashboard — Lannent');
  const navigate = useNavigate();

  // Live stats from store
  const session = Auth.getCurrentUser();
  const userId = session.userId;
  const LIVE = ['preview-sent', 'negotiating', 'agreed', 'escrow-funded', 'in-progress'];
  const mine = Store.getAuditRequests().filter(a => a.expertId === userId);
  const liveAudits = mine.filter(a => a.kind !== 'dispute-audit' && LIVE.includes(a.status));
  const myDisputeList = Store.getDisputes().filter(d => d.expertId === userId || d.resolvedBy === userId);
  const openDisputes = myDisputeList.filter(d => d.status === 'open');
  const expert = Store.getUserById(userId);
  // What actually reached this reviewer's wallet: audit and dispute fees, net.
  const earned = Store.getTransactions()
    .filter(t => ['audit-release', 'dispute-fee-release'].includes(t.type) && t.toId === userId)
    .reduce((s, t) => s + (t.netAmount != null ? t.netAmount : t.amount || 0), 0);
  const feeOf = a => a.agreedAmount || (a.offers || []).filter(o => o.status === 'pending').map(o => o.amount)[0] || null;

  const myAudits = liveAudits.slice(0, 3);
  const myDisputes = openDisputes.slice(0, 3);

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="expert" activePath="/expert-dashboard" pageTitle="Expert Dashboard" pageSubtitle="Manage your audit requests and dispute cases">
        {/* Stats */}
        <div className="stats-grid">
          <StatCard value={liveAudits.length} label="Active Audits" change={`${liveAudits.filter(a => ['preview-sent', 'negotiating'].includes(a.status)).length} awaiting your quote`} icon="clipboard-check" iconBg="#faf5ff" iconColor="#a855f7" />
          <StatCard value={openDisputes.length} label="Open Disputes" change={`${myDisputeList.filter(d => d.status === 'resolved').length} resolved`} icon="scale" iconBg="#eff6ff" iconColor="#6366f1" />
          <StatCard value={`₹${earned.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} valueStyle={{ color: '#10b981' }} label="Total Earned" change="After platform commission" icon="wallet" iconBg="#ecfdf5" iconColor="#10b981" />
          <StatCard value={expert?.reviewsDone || 0} label="Reviews Completed" change={`${(expert?.domains || []).length} domains covered`} icon="award" iconBg="#fffbeb" iconColor="#f59e0b" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Audit Requests */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Audit Requests</h3>
              <Link to="/expert-audit-requests" className="btn-outline" style={{ fontSize: 13, padding: '5px 12px' }}>View All</Link>
            </div>
            {myAudits.length ? myAudits.map(a => {
              const task = Store.getTaskById(a.taskId);
              const cl = task ? Store.getUserById(task.clientId) : null;
              const clName = cl ? cl.name : 'Client';
              const pTitle = task ? task.title : a.project || 'Audit Request';
              const fee = feeOf(a);
              const pay = fee ? '₹' + Number(fee).toLocaleString('en-IN') : 'No fee yet';
              const urgency = a.status === 'preview-sent' ? 'urgent' : 'normal';
              const tags = task ? task.skills || [] : ['Review', 'Audit'];
              return (
                <div key={a.id} className="audit-card-item" onClick={() => navigate(`/expert-audit-preview?id=${a.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{pTitle}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{`Client: ${clName} · Technical Audit`}</div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: 14, flexShrink: 0, marginLeft: 12 }}>{pay}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {tags.slice(0, 2).map(t => <span key={t} className="skill-tag" style={{ fontSize: 11, padding: '2px 8px' }}>{t}</span>)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {urgency === 'urgent' ? <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fee2e2', padding: '2px 8px', borderRadius: 9999 }}>New</span> : ''}
                      <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                        <Icon name="clock" style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle' }} />{' ' + a.status.replace(/-/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>No active audit requests.</div>
            )}
          </div>

          {/* Dispute Cases */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Dispute Cases</h3>
              <Link to="/expert-dispute-cases" className="btn-outline" style={{ fontSize: 13, padding: '5px 12px' }}>View All</Link>
            </div>
            {myDisputes.length ? myDisputes.map(d => {
              const ms = Store.getMilestoneById(d.milestoneId);
              const task = Store.getTaskById(d.taskId);
              const eng = mine.filter(a => a.disputeId === d.id).pop();
              const cl = task ? Store.getUserById(task.clientId) : null;
              const wkr = task && task.workerId ? Store.getUserById(task.workerId) : null;
              const clName = cl ? cl.name.split(' ')[0] : 'Client';
              const wName = wkr ? wkr.name.split(' ')[0] : 'Worker';
              const pTitle = ms ? ms.title : 'Dispute Case';
              const fee = eng ? feeOf(eng) : null;
              const pay = fee ? '₹' + Number(fee).toLocaleString('en-IN') : 'No fee yet';
              return (
                <div key={d.id} className="audit-card-item" onClick={() => navigate(eng && eng.status === 'in-progress' ? `/resolve-dispute?id=${d.id}` : eng ? `/expert-audit-preview?id=${eng.id}` : '/expert-dispute-cases')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{pTitle}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{`${clName} vs ${wName}`}</div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: 14 }}>{pay}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className={`badge ${d.status === 'open' ? 'badge-orange' : 'badge-blue'}`} style={{ textTransform: 'capitalize' }}>{d.status}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                      <Icon name="alert-circle" style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle' }} /> Dispute
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>No active dispute cases.</div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
