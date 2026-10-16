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
import { Fragment, Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './context/StoreContext';
import RequireRole from './components/RequireRole';

// ── Public pages ──
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ExpertLanding = lazy(() => import('./pages/ExpertLanding'));
const ExpertLogin = lazy(() => import('./pages/ExpertLogin'));
const ExpertSignup = lazy(() => import('./pages/ExpertSignup'));
const NotFound = lazy(() => import('./pages/NotFound'));

// ── Client pages ──
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const ClientMyProjects = lazy(() => import('./pages/ClientMyProjects'));
const PostTask = lazy(() => import('./pages/PostTask'));
const HireGigWorkers = lazy(() => import('./pages/HireGigWorkers'));
const WorkerApplications = lazy(() => import('./pages/WorkerApplications'));
const MyProposals = lazy(() => import('./pages/MyProposals'));
const AuditOffers = lazy(() => import('./pages/ClientAuditOffers'));
const ClientWallet = lazy(() => import('./pages/ClientWallet'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const ProjectMilestoneBoard = lazy(() => import('./pages/ProjectMilestoneBoard'));
const Analytics = lazy(() => import('./pages/Analytics'));

// ── Worker pages ──
const WorkerDashboard = lazy(() => import('./pages/WorkerDashboard'));
const BrowseTasks = lazy(() => import('./pages/BrowseTasks'));
const WorkerMyProjects = lazy(() => import('./pages/WorkerMyProjects'));
const WorkerInvitations = lazy(() => import('./pages/WorkerInvitations'));
const WorkerWallet = lazy(() => import('./pages/WorkerWallet'));
const WorkerSettings = lazy(() => import('./pages/WorkerSettings'));
const WorkerMilestoneBoard = lazy(() => import('./pages/WorkerMilestoneBoard'));
const WorkerWorkroom = lazy(() => import('./pages/WorkerWorkroom'));
const SubmitDeliverable = lazy(() => import('./pages/SubmitDeliverable'));
const PerformanceAnalytics = lazy(() => import('./pages/PerformanceAnalytics'));

// ── Expert pages ──
const ExpertDashboard = lazy(() => import('./pages/ExpertDashboard'));
const ExpertAuditRequests = lazy(() => import('./pages/ExpertAuditRequests'));
const ExpertAuditPreview = lazy(() => import('./pages/ExpertAuditPreview'));
const ExpertDisputeCases = lazy(() => import('./pages/ExpertDisputeCases'));
const ExpertReports = lazy(() => import('./pages/ExpertReports'));
const ExpertWallet = lazy(() => import('./pages/ExpertWallet'));
const ExpertSettings = lazy(() => import('./pages/ExpertSettings'));
const ResolveDispute = lazy(() => import('./pages/ResolveDispute'));

// ── Shared pages (several roles) ──
const Messages = lazy(() => import('./pages/Messages'));
const MilestoneReports = lazy(() => import('./pages/MilestoneReports'));
const ProjectWorkroom = lazy(() => import('./pages/ProjectWorkroom'));
const TaskDetails = lazy(() => import('./pages/TaskDetails'));
const Dispute = lazy(() => import('./pages/Dispute'));
const ReviewDeliverable = lazy(() => import('./pages/ReviewDeliverable'));
const ExpertReportAudit = lazy(() => import('./pages/ExpertReportAudit'));
const ExpertReportDispute = lazy(() => import('./pages/ExpertReportDispute'));

// ── Super user pages ──
const SuperuserDashboard = lazy(() => import('./pages/SuperuserDashboard'));
const SuperuserUsers = lazy(() => import('./pages/SuperuserUsers'));
const SuperuserTasks = lazy(() => import('./pages/SuperuserTasks'));
const SuperuserEscrow = lazy(() => import('./pages/SuperuserEscrow'));
const SuperuserDisputes = lazy(() => import('./pages/SuperuserDisputes'));

// ── Admin pages (revenue / intake / compliance) ──
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminRevenue = lazy(() => import('./pages/AdminRevenue'));
const AdminFeeConfig = lazy(() => import('./pages/AdminFeeConfig'));
const AdminExpertApplications = lazy(() => import('./pages/AdminExpertApplications'));
const ComplianceDashboard = lazy(() => import('./pages/ComplianceDashboard'));
const StaffSettings = lazy(() => import('./pages/StaffSettings'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const Profile = lazy(() => import('./pages/Profile'));

const ALL_SIGNED_IN = ['client', 'worker', 'expert', 'superuser', 'revenue-admin', 'intake-admin', 'compliance-admin'];

/**
 * PageLoader — makes every navigation behave like the full page load it used
 * to be in the static site:
 *   1. the data cache is refilled from the API (the old store.js ran this at
 *      the top of every page) — now with every read in parallel and without
 *      blocking the browser; the page waits behind a loading state instead of
 *      the whole UI freezing for a dozen synchronous requests in a row;
 *   2. the page is re-mounted (keyed by the navigation), so it starts fresh.
 * A change of only the "#hash" (e.g. an href="#" link) is not a new page.
 */
function PageLoader() {
  const Store = useStore();
  const location = useLocation();
  // Which navigation is on screen. A new location gets a new key — except a
  // change of only the #hash, which keeps the current page. Derived during
  // render from the previous location (React's "store previous props" pattern).
  const [nav, setNav] = useState(() => ({ loc: location, key: location.key }));
  let key = nav.key;
  if (nav.loc !== location) {
    const prev = nav.loc;
    const onlyHashChanged = prev.pathname === location.pathname && prev.search === location.search && prev.hash !== location.hash;
    key = onlyHashChanged ? nav.key : location.key;
    setNav({ loc: location, key });
  }
  const [loadedKey, setLoadedKey] = useState(null);

  useEffect(() => {
    let live = true;
    Store.initAsync()
      .catch(e => console.error('[Store] init failed:', e))
      .finally(() => { if (live) setLoadedKey(key); });
    return () => { live = false; };
  }, [Store, key]);

  if (loadedKey !== key) return <PageLoading />;
  return (
    <Fragment key={key}>
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
    </Fragment>
  );
}

function PageLoading() {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontSize: 14 }}>
      Loading…
    </div>
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
          <Route path="/expert-landing" element={<ExpertLanding />} />
          <Route path="/expert-login" element={<ExpertLogin />} />
          <Route path="/expert-signup" element={<ExpertSignup />} />

          {/* ── CLIENT ── */}
          <Route path="/client-dashboard" element={guard(['client'], <ClientDashboard />)} />
          <Route path="/client-my-projects" element={guard(['client'], <ClientMyProjects />)} />
          <Route path="/post-task" element={guard(['client'], <PostTask />)} />
          <Route path="/hire-gig-workers" element={guard(['client'], <HireGigWorkers />)} />
          <Route path="/worker-applications" element={guard(['client'], <WorkerApplications />)} />
          <Route path="/sent-invitations" element={<Navigate to="/worker-applications" replace />} />
          <Route path="/audit-offers" element={guard(['client'], <AuditOffers />)} />
          <Route path="/client-audit-offers" element={<Navigate to="/audit-offers" replace />} />
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
          <Route path="/my-applications" element={<Navigate to="/my-proposals" replace />} />
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
          <Route path="/expert-wallet" element={guard(['expert'], <ExpertWallet />)} />
          <Route path="/expert-messages" element={<Navigate to="/messages" replace />} />
          <Route path="/expert-settings" element={guard(['expert'], <ExpertSettings />)} />
          <Route path="/resolve-dispute" element={guard(['expert'], <ResolveDispute />)} />

          {/* ── SHARED ── */}
          <Route path="/messages" element={guard(['client', 'worker', 'expert'], <Messages />)} />
          <Route path="/milestone-reports" element={guard(['client', 'worker', 'expert'], <MilestoneReports />)} />
          <Route path="/project-workroom" element={guard(['client', 'worker'], <ProjectWorkroom />)} />
          <Route path="/task-details" element={guard(['client', 'worker'], <TaskDetails />)} />
          <Route path="/dispute" element={guard(['client'], <Dispute />)} />
          <Route path="/review-deliverable" element={guard(['client', 'expert'], <ReviewDeliverable />)} />
          <Route path="/expert-report-audit" element={guard(['expert', 'client', 'worker'], <ExpertReportAudit />)} />
          <Route path="/expert-report-dispute" element={guard(['expert', 'client', 'worker'], <ExpertReportDispute />)} />

          {/* ── SUPER USER ── */}
          <Route path="/superuser-dashboard" element={guard(['superuser'], <SuperuserDashboard />)} />
          <Route path="/superuser-users" element={guard(['superuser'], <SuperuserUsers />)} />
          <Route path="/superuser-tasks" element={guard(['superuser'], <SuperuserTasks />)} />
          <Route path="/superuser-escrow" element={guard(['superuser'], <SuperuserEscrow />)} />
          {/* Reviewer intake is the intake desk's job, not operations'. */}
          <Route path="/superuser-expert-applications" element={<Navigate to="/superuser-dashboard" replace />} />
          <Route path="/superuser-disputes" element={guard(['superuser'], <SuperuserDisputes />)} />
          {/* Only clients post projects — the budget comes out of their own wallet. */}
          <Route path="/superuser-create-task" element={<Navigate to="/superuser-tasks" replace />} />

          {/* ── ADMIN DESKS ── */}
          {/* Old admin desk: always redirects to the user's own dashboard (see the page) */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-revenue" element={guard(['revenue-admin', 'compliance-admin'], <AdminRevenue />)} />
          <Route path="/admin-fee-config" element={guard(['revenue-admin'], <AdminFeeConfig />)} />
          <Route path="/admin-expert-applications" element={guard(['intake-admin', 'compliance-admin'], <AdminExpertApplications />)} />
          <Route path="/compliance-dashboard" element={guard(['compliance-admin'], <ComplianceDashboard />)} />
          <Route path="/staff-settings" element={guard(['superuser', 'revenue-admin', 'intake-admin', 'compliance-admin'], <StaffSettings />)} />

          {/* ── EVERY SIGNED-IN ROLE ── */}
          {/* Not behind RequireRole: it is where RequireRole sends an account that must choose a password. */}
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/profile" element={guard(ALL_SIGNED_IN, <Profile />)} />

          {/* ── 404 ── */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
