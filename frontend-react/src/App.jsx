/**
 * LANNENT — App.jsx (all routes)
 *
 * Every original HTML page has exactly one route here. The naming rule is:
 *   front-end/pages/client-dashboard.html  →  src/pages/ClientDashboard.jsx  →  /client-dashboard
 *   front-end/index.html                   →  src/pages/Home.jsx             →  /
 * Query strings are unchanged, e.g. /project-workroom?id=t1.
 *
 * Pages that called Auth.requireRole(...) are wrapped in <RequireRole> with
 * the same roles.
 */
import { Fragment, useRef } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { useStore } from './context/StoreContext';
import RequireRole from './components/RequireRole';

// ── Public pages ──
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ExpertLanding from './pages/ExpertLanding';
import ExpertLogin from './pages/ExpertLogin';
import ExpertSignup from './pages/ExpertSignup';
import NotFound from './pages/NotFound';

// ── Client pages ──
import ClientDashboard from './pages/ClientDashboard';
import ClientMyProjects from './pages/ClientMyProjects';
import PostTask from './pages/PostTask';
import HireGigWorkers from './pages/HireGigWorkers';
import WorkerApplications from './pages/WorkerApplications';
import ClientAuditOffers from './pages/ClientAuditOffers';
import ClientWallet from './pages/ClientWallet';
import ProfileSettings from './pages/ProfileSettings';
import ProjectMilestoneBoard from './pages/ProjectMilestoneBoard';
import Analytics from './pages/Analytics';

// ── Worker pages ──
import WorkerDashboard from './pages/WorkerDashboard';
import BrowseTasks from './pages/BrowseTasks';
import WorkerMyProjects from './pages/WorkerMyProjects';
import WorkerInvitations from './pages/WorkerInvitations';
import MyProposals from './pages/MyProposals';
import WorkerWallet from './pages/WorkerWallet';
import WorkerSettings from './pages/WorkerSettings';
import WorkerMilestoneBoard from './pages/WorkerMilestoneBoard';
import WorkerWorkroom from './pages/WorkerWorkroom';
import SubmitDeliverable from './pages/SubmitDeliverable';
import PerformanceAnalytics from './pages/PerformanceAnalytics';

// ── Expert pages ──
import ExpertDashboard from './pages/ExpertDashboard';
import ExpertAuditRequests from './pages/ExpertAuditRequests';
import ExpertAuditPreview from './pages/ExpertAuditPreview';
import ExpertDisputeCases from './pages/ExpertDisputeCases';
import ExpertReports from './pages/ExpertReports';
import ExpertMessages from './pages/ExpertMessages';
import ExpertSettings from './pages/ExpertSettings';
import ResolveDispute from './pages/ResolveDispute';

// ── Shared pages (several roles) ──
import Messages from './pages/Messages';
import MilestoneReports from './pages/MilestoneReports';
import ProjectWorkroom from './pages/ProjectWorkroom';
import TaskDetails from './pages/TaskDetails';
import Dispute from './pages/Dispute';
import ReviewDeliverable from './pages/ReviewDeliverable';
import ExpertReportAudit from './pages/ExpertReportAudit';
import ExpertReportDispute from './pages/ExpertReportDispute';

// ── Super user pages ──
import SuperuserDashboard from './pages/SuperuserDashboard';
import SuperuserUsers from './pages/SuperuserUsers';
import SuperuserTasks from './pages/SuperuserTasks';
import SuperuserEscrow from './pages/SuperuserEscrow';
import SuperuserExpertApplications from './pages/SuperuserExpertApplications';
import SuperuserDisputes from './pages/SuperuserDisputes';
import SuperuserCreateTask from './pages/SuperuserCreateTask';

// ── Admin pages (revenue / intake / compliance) ──
import AdminDashboard from './pages/AdminDashboard';
import AdminRevenue from './pages/AdminRevenue';
import AdminFeeConfig from './pages/AdminFeeConfig';
import AdminExpertApplications from './pages/AdminExpertApplications';
import ComplianceDashboard from './pages/ComplianceDashboard';
import StaffSettings from './pages/StaffSettings';

/**
 * PageLoader — makes every navigation behave like the full page load it used
 * to be in the static site:
 *   1. Store.init() refills the data cache from the API (the old store.js ran
 *      this at the top of every page);
 *   2. the page is re-mounted (keyed by the navigation), so it starts fresh.
 * A change of only the "#hash" (e.g. an href="#" link) is not a new page.
 */
function PageLoader() {
  const Store = useStore();
  const location = useLocation();
  const lastLocation = useRef(null);
  const pageKey = useRef(null);

  if (!lastLocation.current || lastLocation.current.key !== location.key) {
    const prev = lastLocation.current;
    const onlyHashChanged = prev && prev.pathname === location.pathname && prev.search === location.search && prev.hash !== location.hash;
    if (!onlyHashChanged) {
      try { Store.init(); } catch (e) { console.error('[Store] init failed:', e); }
      pageKey.current = location.key;
    }
    lastLocation.current = location;
  }

  return (
    <Fragment key={pageKey.current}>
      <Outlet />
    </Fragment>
  );
}

/** Shorthand: a route element guarded by the given roles. */
function guard(roles, element) {
  return <RequireRole roles={roles}>{element}</RequireRole>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PageLoader />}>

          {/* ── PUBLIC ── */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/expert-landing" element={<ExpertLanding />} />
          <Route path="/expert-login" element={<ExpertLogin />} />
          <Route path="/expert-signup" element={<ExpertSignup />} />

          {/* ── CLIENT ── */}
          <Route path="/client-dashboard" element={guard(['client'], <ClientDashboard />)} />
          <Route path="/client-my-projects" element={guard(['client'], <ClientMyProjects />)} />
          <Route path="/post-task" element={guard(['client'], <PostTask />)} />
          <Route path="/hire-gig-workers" element={guard(['client'], <HireGigWorkers />)} />
          <Route path="/worker-applications" element={guard(['client'], <WorkerApplications />)} />
          <Route path="/client-audit-offers" element={guard(['client'], <ClientAuditOffers />)} />
          <Route path="/client-wallet" element={guard(['client'], <ClientWallet />)} />
          <Route path="/profile-settings" element={guard(['client'], <ProfileSettings />)} />
          <Route path="/project-milestone-board" element={guard(['client'], <ProjectMilestoneBoard />)} />
          <Route path="/analytics" element={guard(['client'], <Analytics />)} />

          {/* ── WORKER ── */}
          <Route path="/worker-dashboard" element={guard(['worker'], <WorkerDashboard />)} />
          <Route path="/browse-tasks" element={guard(['worker'], <BrowseTasks />)} />
          <Route path="/worker-my-projects" element={guard(['worker'], <WorkerMyProjects />)} />
          <Route path="/worker-invitations" element={guard(['worker'], <WorkerInvitations />)} />
          <Route path="/my-proposals" element={guard(['worker'], <MyProposals />)} />
          <Route path="/worker-wallet" element={guard(['worker'], <WorkerWallet />)} />
          <Route path="/worker-settings" element={guard(['worker'], <WorkerSettings />)} />
          <Route path="/worker-milestone-board" element={guard(['worker'], <WorkerMilestoneBoard />)} />
          <Route path="/worker-workroom" element={guard(['worker'], <WorkerWorkroom />)} />
          <Route path="/submit-deliverable" element={guard(['worker'], <SubmitDeliverable />)} />
          <Route path="/performance-analytics" element={guard(['worker'], <PerformanceAnalytics />)} />

          {/* ── EXPERT ── */}
          <Route path="/expert-dashboard" element={guard(['expert'], <ExpertDashboard />)} />
          <Route path="/expert-audit-requests" element={guard(['expert'], <ExpertAuditRequests />)} />
          <Route path="/expert-audit-preview" element={guard(['expert'], <ExpertAuditPreview />)} />
          <Route path="/expert-dispute-cases" element={guard(['expert'], <ExpertDisputeCases />)} />
          <Route path="/expert-reports" element={guard(['expert'], <ExpertReports />)} />
          <Route path="/expert-messages" element={guard(['expert'], <ExpertMessages />)} />
          <Route path="/expert-settings" element={guard(['expert'], <ExpertSettings />)} />
          <Route path="/resolve-dispute" element={guard(['expert'], <ResolveDispute />)} />

          {/* ── SHARED ── */}
          <Route path="/messages" element={guard(['client', 'worker', 'expert'], <Messages />)} />
          <Route path="/milestone-reports" element={guard(['client', 'worker', 'expert'], <MilestoneReports />)} />
          <Route path="/project-workroom" element={guard(['client', 'worker'], <ProjectWorkroom />)} />
          <Route path="/task-details" element={guard(['client', 'worker'], <TaskDetails />)} />
          <Route path="/dispute" element={guard(['client', 'worker'], <Dispute />)} />
          <Route path="/review-deliverable" element={guard(['client', 'expert'], <ReviewDeliverable />)} />
          <Route path="/expert-report-audit" element={guard(['expert', 'client', 'worker'], <ExpertReportAudit />)} />
          <Route path="/expert-report-dispute" element={guard(['expert', 'client', 'worker'], <ExpertReportDispute />)} />

          {/* ── SUPER USER ── */}
          <Route path="/superuser-dashboard" element={guard(['superuser'], <SuperuserDashboard />)} />
          <Route path="/superuser-users" element={guard(['superuser'], <SuperuserUsers />)} />
          <Route path="/superuser-tasks" element={guard(['superuser'], <SuperuserTasks />)} />
          <Route path="/superuser-escrow" element={guard(['superuser'], <SuperuserEscrow />)} />
          <Route path="/superuser-expert-applications" element={guard(['superuser'], <SuperuserExpertApplications />)} />
          {/* These two do their own redirects (see the pages) */}
          <Route path="/superuser-disputes" element={<SuperuserDisputes />} />
          <Route path="/superuser-create-task" element={<SuperuserCreateTask />} />

          {/* ── ADMIN DESKS ── */}
          {/* Old admin desk: always redirects to the user's own dashboard (see the page) */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-revenue" element={guard(['revenue-admin', 'compliance-admin'], <AdminRevenue />)} />
          <Route path="/admin-fee-config" element={guard(['revenue-admin'], <AdminFeeConfig />)} />
          <Route path="/admin-expert-applications" element={guard(['intake-admin', 'compliance-admin'], <AdminExpertApplications />)} />
          <Route path="/compliance-dashboard" element={guard(['compliance-admin'], <ComplianceDashboard />)} />
          <Route path="/staff-settings" element={guard(['superuser', 'revenue-admin', 'intake-admin', 'compliance-admin'], <StaffSettings />)} />

          {/* ── 404 ── */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
