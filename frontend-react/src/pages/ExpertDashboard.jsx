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
  const userId = session?.userId || 'u3';
  const auditReqs = Store.getAuditRequests();
  const pendingAudits = auditReqs.filter(a => a.status === 'Pending' || a.status === 'In Review').length;
  const openDisputes = Store.getDisputes().filter(d => d.status === 'open').length;
  const expert = Store.getUserById(userId);
  const earned = Store.getTransactionsByUser(userId).filter(t => t.type === 'milestone-release').reduce((s, t) => s + t.amount, 0);

  const myAudits = Store.getAuditRequests().filter(a => a.expertId === userId || !a.expertId).slice(0, 3);
  const myDisputes = Store.getDisputes().filter(d => d.expertId === userId || !d.expertId).slice(0, 3);

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="expert" activePath="/expert-dashboard" pageTitle="Expert Dashboard" pageSubtitle="Manage your audit requests and dispute cases">
        {/* Stats */}
        <div className="stats-grid">
          <StatCard value={pendingAudits} label="Pending Audits" change={`${auditReqs.filter(a => a.status === 'Pending').length} awaiting`} icon="clipboard-check" iconBg="#faf5ff" iconColor="#a855f7" />
          <StatCard value={openDisputes} label="Dispute Cases" change={`${Store.getDisputes().filter(d => d.status === 'resolved').length} resolved`} icon="scale" iconBg="#eff6ff" iconColor="#6366f1" />
          <StatCard value={`$${(earned || 0).toLocaleString()}`} valueStyle={{ color: '#10b981' }} label="Total Earned" change="Lifetime earnings" icon="wallet" iconBg="#ecfdf5" iconColor="#10b981" />
          <StatCard value={`${expert?.rating || 0}★`} label="Expert Rating" change={`From ${expert?.reviewsDone || 0} reviews`} icon="star" iconBg="#fffbeb" iconColor="#f59e0b" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Audit Requests */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Audit Requests</h3>
              <Link to="/expert-audit-requests" className="btn-outline" style={{ fontSize: 13, padding: '5px 12px' }}>View All</Link>
            </div>
            {myAudits.length ? myAudits.map(a => {
              const ms = Store.getMilestoneById(a.milestoneId);
              const task = ms ? Store.getTaskById(ms.taskId) : null;
              const cl = task ? Store.getUserById(task.clientId) : null;
              const clName = cl ? cl.name : 'Unknown';
              const pTitle = ms ? ms.title : 'Audit Request';
              const pay = ms ? '$' + Math.floor(ms.budget * 0.1).toLocaleString() : '$150';
              const urgency = a.status === 'Pending' ? 'urgent' : 'normal';
              const tags = task ? task.skills || [] : ['Review', 'Audit'];
              return (
                <div key={a.id} className="audit-card-item" onClick={() => navigate('/expert-audit-requests')}>
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
                        <Icon name="clock" style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle' }} />{' ' + a.status}
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
              const task = ms ? Store.getTaskById(ms.taskId) : null;
              const cl = task ? Store.getUserById(task.clientId) : null;
              const wkr = task && task.workerId ? Store.getUserById(task.workerId) : null;
              const clName = cl ? cl.name.split(' ')[0] : 'Client';
              const wName = wkr ? wkr.name.split(' ')[0] : 'Worker';
              const pTitle = ms ? ms.title : 'Dispute Case';
              const pay = ms ? '$' + Math.floor(ms.budget * 0.15).toLocaleString() : '$200';
              return (
                <div key={d.id} className="audit-card-item" onClick={() => navigate('/expert-dispute-cases')}>
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
