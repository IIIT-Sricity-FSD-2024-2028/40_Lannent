/**
 * LANNENT — AdminDashboard
 * Converted from front-end/pages/admin-dashboard.html.
 *
 * The one admin desk became three, each landing on its own work. Anyone
 * holding an old bookmark is sent where their role actually belongs — so,
 * exactly like the original page, this route always redirects:
 *   signed in  → that user's own dashboard
 *   signed out → login
 * The overview below is kept for reference (it is what the page rendered
 * before the split) but is never reached.
 */
import { Link, Navigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './AdminDashboard.css?raw';

const money = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminDashboard() {
  const Auth = useAuth();
  usePageTitle('Admin Dashboard — Lannent');
  const u = Auth.getCurrentUser();
  if (!u) return <Navigate to="/login" replace />;
  return <Navigate to={Auth.getDashboardUrl(u.role)} replace />;
}

/** The pre-split admin overview (unreachable, see the note above). */
export function AdminOverview() {
  const Store = useStore();
  const Auth = useAuth();
  const rev = Store.getRevenueSummary() || {};
  const apps = Store.getExpertApplications() || [];
  const pending = apps.filter(a => a.status === 'pending').length;
  const approved = apps.filter(a => a.status === 'approved').length;
  const experts = (Store.getUsers() || []).filter(u => u.role === 'expert').length;
  const engagements = (Store.getAuditRequests() || []);
  const liveAudits = engagements.filter(a => !['paid', 'declined', 'cancelled'].includes(a.status)).length;

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={(Auth.getCurrentUser() || {}).role} activePath="/admin-dashboard" pageTitle="Admin Dashboard" pageSubtitle="Expert Reviewer intake and platform oversight">
        <div className="ad-grid">
          <div className="ad-stat">
            <div>
              <div className="ad-val" style={{ color: '#2a78d6' }}>{money(rev.totalRevenue)}</div>
              <div className="ad-label">Platform revenue</div>
              <div className="ad-sub">{`${rev.takeRate ?? 0}% of ${money(rev.grossVolume)} delivered`}</div>
            </div>
            <div className="ad-icon" style={{ background: '#eff6ff' }}>
              <Icon name="trending-up" style={{ width: 19, height: 19, color: '#2a78d6' }} />
            </div>
          </div>
          <div className="ad-stat">
            <div>
              <div className="ad-val">{money(rev.escrowHeld)}</div>
              <div className="ad-label">Held in escrow</div>
              <div className="ad-sub">{`${rev.activeContracts || 0} active · ${rev.draftProjects || 0} draft`}</div>
            </div>
            <div className="ad-icon" style={{ background: 'var(--secondary)' }}>
              <Icon name="lock" style={{ width: 19, height: 19, color: 'var(--muted-foreground)' }} />
            </div>
          </div>
          <div className="ad-stat">
            <div>
              <div className="ad-val" style={{ color: '#b45309' }}>{pending}</div>
              <div className="ad-label">Pending applications</div>
              <div className="ad-sub">{`${approved} approved to date`}</div>
            </div>
            <div className="ad-icon" style={{ background: '#fffbeb' }}>
              <Icon name="inbox" style={{ width: 19, height: 19, color: '#b45309' }} />
            </div>
          </div>
          <div className="ad-stat">
            <div>
              <div className="ad-val" style={{ color: '#0d9488' }}>{experts}</div>
              <div className="ad-label">Expert Reviewers</div>
              <div className="ad-sub">active on the platform</div>
            </div>
            <div className="ad-icon" style={{ background: '#f0fdfa' }}>
              <Icon name="shield-check" style={{ width: 19, height: 19, color: '#0d9488' }} />
            </div>
          </div>
          <div className="ad-stat">
            <div>
              <div className="ad-val" style={{ color: '#4338ca' }}>{liveAudits}</div>
              <div className="ad-label">Audits in flight</div>
              <div className="ad-sub">{`${engagements.length} all-time`}</div>
            </div>
            <div className="ad-icon" style={{ background: '#eef2ff' }}>
              <Icon name="clipboard-check" style={{ width: 19, height: 19, color: '#4338ca' }} />
            </div>
          </div>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Your responsibilities</h2>
        <div className="ad-actions">
          <Link to="/admin-revenue" className="ad-card">
            <div className="ad-icon" style={{ background: '#eff6ff' }}>
              <Icon name="trending-up" style={{ width: 19, height: 19, color: '#2a78d6' }} />
            </div>
            <div>
              <div className="ad-card-title">Revenue</div>
              <div className="ad-card-desc">Where the money comes from, and what every user receives.</div>
            </div>
          </Link>
          {' '}
          <Link to="/admin-fee-config" className="ad-card">
            <div className="ad-icon" style={{ background: '#f0fdfa' }}>
              <Icon name="percent" style={{ width: 19, height: 19, color: '#0d9488' }} />
            </div>
            <div>
              <div className="ad-card-title">Fee Configuration</div>
              <div className="ad-card-desc">Tune every rate the platform charges, with a live worked example.</div>
            </div>
          </Link>
          {' '}
          <Link to="/admin-expert-applications" className="ad-card">
            <div className="ad-icon" style={{ background: '#fffbeb' }}>
              <Icon name="shield-check" style={{ width: 19, height: 19, color: '#b45309' }} />
            </div>
            <div>
              <div className="ad-card-title">Expert Applications</div>
              <div className="ad-card-desc">{`${pending} application${pending === 1 ? '' : 's'} waiting on your decision.`}</div>
            </div>
          </Link>
        </div>
      </DashboardLayout>
    </>
  );
}
