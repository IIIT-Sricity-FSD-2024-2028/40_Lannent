/**
 * LANNENT — App.jsx  (Master routing file)
 *
 * Every route in the platform is defined here.
 * Pages not yet built are held by <Placeholder name="ComponentName" />.
 *
 * Route ownership:
 *   Member 1  — infrastructure, auth pages, shared/project routes, 404
 *   Member 2  — /client/*
 *   Member 3  — /worker/*
 *   Member 4  — /expert/*
 *   Member 5  — /superuser/* , /admin/*
 *
 * When a member finishes their page:
 *   1. Import the real component at the top of this file.
 *   2. Replace <Placeholder name="XxxPage" /> with <XxxPage />.
 *   3. Do NOT change the route path.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }   from './context/AuthContext';
import ProtectedRoute     from './components/shared/ProtectedRoute';
import { useAuth }        from './hooks/useAuth';
import { getDashboardRoute } from './lib/auth';

// ─── Placeholder ──────────────────────────────────────────────────────────────
/**
 * Renders a clearly-labelled card so the dev server never crashes and every
 * team member can visually identify which page stub they're working on.
 */
function Placeholder({ name }) {
  return (
    <div style={{
      padding: '56px 24px',
      textAlign: 'center',
      background: 'var(--card)',
      border: '1px dashed var(--border)',
      borderRadius: 16,
      margin: '0 auto',
      maxWidth: 520,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 56, height: 56, borderRadius: 14, background: '#f0f0f8',
        marginBottom: 16, fontSize: 26,
      }}>🚧</div>
      <h2 style={{ marginBottom: 8, fontWeight: 600 }}>{name}</h2>
      <p style={{ color: 'var(--muted-foreground)', fontSize: 14, lineHeight: 1.6 }}>
        This page is under construction.<br />
        Replace <code style={{ background: '#f0f0f8', padding: '2px 6px', borderRadius: 4 }}>
          &lt;Placeholder name="{name}" /&gt;
        </code> in <code>App.jsx</code> with the real component.
      </p>
    </div>
  );
}

// ─── Root redirect (role-aware) ───────────────────────────────────────────────
function RootRedirect() {
  const { currentUser, isLoggedIn, loading } = useAuth();
  if (loading)    return null;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardRoute(currentUser.role)} replace />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ══════════════════════════════════════════════════
              PUBLIC — no auth required
              ══════════════════════════════════════════════════ */}
          <Route path="/"              element={<RootRedirect />} />
          <Route path="/login"         element={<Placeholder name="LoginPage" />} />
          <Route path="/signup"        element={<Placeholder name="SignupPage" />} />
          <Route path="/forgot-password" element={<Placeholder name="ForgotPassword" />} />

          {/* Expert public onboarding */}
          <Route path="/expert-landing" element={<Placeholder name="ExpertLanding" />} />
          <Route path="/expert-login"   element={<Placeholder name="ExpertLogin" />} />
          <Route path="/expert-signup"  element={<Placeholder name="ExpertSignup" />} />

          {/* ══════════════════════════════════════════════════
              CLIENT PORTAL  ── Member 2
              ══════════════════════════════════════════════════ */}
          <Route path="/client/dashboard"
            element={<ProtectedRoute allowedRoles={['client']}><Placeholder name="ClientDashboard" /></ProtectedRoute>} />
          <Route path="/client/projects"
            element={<ProtectedRoute allowedRoles={['client']}><Placeholder name="ClientMyProjects" /></ProtectedRoute>} />
          <Route path="/client/post-task"
            element={<ProtectedRoute allowedRoles={['client']}><Placeholder name="PostTask" /></ProtectedRoute>} />
          <Route path="/client/hire"
            element={<ProtectedRoute allowedRoles={['client']}><Placeholder name="HireGigWorkers" /></ProtectedRoute>} />
          <Route path="/client/applications"
            element={<ProtectedRoute allowedRoles={['client']}><Placeholder name="WorkerApplications" /></ProtectedRoute>} />
          <Route path="/client/audit-offers"
            element={<ProtectedRoute allowedRoles={['client']}><Placeholder name="ClientAuditOffers" /></ProtectedRoute>} />
          <Route path="/client/wallet"
            element={<ProtectedRoute allowedRoles={['client']}><Placeholder name="ClientWallet" /></ProtectedRoute>} />

          {/* ══════════════════════════════════════════════════
              WORKER PORTAL  ── Member 3
              ══════════════════════════════════════════════════ */}
          <Route path="/worker/dashboard"
            element={<ProtectedRoute allowedRoles={['worker']}><Placeholder name="WorkerDashboard" /></ProtectedRoute>} />
          <Route path="/worker/browse"
            element={<ProtectedRoute allowedRoles={['worker']}><Placeholder name="BrowseTasks" /></ProtectedRoute>} />
          <Route path="/worker/projects"
            element={<ProtectedRoute allowedRoles={['worker']}><Placeholder name="WorkerMyProjects" /></ProtectedRoute>} />
          <Route path="/worker/invitations"
            element={<ProtectedRoute allowedRoles={['worker']}><Placeholder name="WorkerInvitations" /></ProtectedRoute>} />
          <Route path="/worker/proposals"
            element={<ProtectedRoute allowedRoles={['worker']}><Placeholder name="MyProposals" /></ProtectedRoute>} />
          <Route path="/worker/wallet"
            element={<ProtectedRoute allowedRoles={['worker']}><Placeholder name="WorkerWallet" /></ProtectedRoute>} />

          {/* ══════════════════════════════════════════════════
              EXPERT PORTAL  ── Member 4
              ══════════════════════════════════════════════════ */}
          <Route path="/expert/dashboard"
            element={<ProtectedRoute allowedRoles={['expert']}><Placeholder name="ExpertDashboard" /></ProtectedRoute>} />
          <Route path="/expert/audit-requests"
            element={<ProtectedRoute allowedRoles={['expert']}><Placeholder name="ExpertAuditRequests" /></ProtectedRoute>} />
          <Route path="/expert/audit-preview/:id"
            element={<ProtectedRoute allowedRoles={['expert']}><Placeholder name="ExpertAuditPreview" /></ProtectedRoute>} />
          <Route path="/expert/disputes"
            element={<ProtectedRoute allowedRoles={['expert']}><Placeholder name="ExpertDisputeCases" /></ProtectedRoute>} />
          <Route path="/expert/reports"
            element={<ProtectedRoute allowedRoles={['expert']}><Placeholder name="ExpertReports" /></ProtectedRoute>} />
          <Route path="/expert/report-audit/:id"
            element={<ProtectedRoute allowedRoles={['expert']}><Placeholder name="ExpertReportAudit" /></ProtectedRoute>} />
          <Route path="/expert/report-dispute/:id"
            element={<ProtectedRoute allowedRoles={['expert']}><Placeholder name="ExpertReportDispute" /></ProtectedRoute>} />
          <Route path="/expert/messages"
            element={<ProtectedRoute allowedRoles={['expert']}><Placeholder name="ExpertMessages" /></ProtectedRoute>} />

          {/* ══════════════════════════════════════════════════
              SUPERUSER / ADMIN PORTAL  ── Member 5
              ══════════════════════════════════════════════════ */}
          <Route path="/superuser/dashboard"
            element={<ProtectedRoute allowedRoles={['superuser']}><Placeholder name="SuperuserDashboard" /></ProtectedRoute>} />
          <Route path="/superuser/users"
            element={<ProtectedRoute allowedRoles={['superuser']}><Placeholder name="SuperuserUsers" /></ProtectedRoute>} />
          <Route path="/superuser/tasks"
            element={<ProtectedRoute allowedRoles={['superuser']}><Placeholder name="SuperuserTasks" /></ProtectedRoute>} />
          <Route path="/superuser/escrow"
            element={<ProtectedRoute allowedRoles={['superuser']}><Placeholder name="SuperuserEscrow" /></ProtectedRoute>} />
          <Route path="/superuser/disputes"
            element={<ProtectedRoute allowedRoles={['superuser']}><Placeholder name="SuperuserDisputes" /></ProtectedRoute>} />
          <Route path="/superuser/create-task"
            element={<ProtectedRoute allowedRoles={['superuser']}><Placeholder name="SuperuserCreateTask" /></ProtectedRoute>} />
          <Route path="/superuser/expert-applications"
            element={<ProtectedRoute allowedRoles={['superuser']}><Placeholder name="SuperuserExpertApplications" /></ProtectedRoute>} />

          {/* Admin sub-roles */}
          <Route path="/admin/expert-applications"
            element={<ProtectedRoute allowedRoles={['superuser','intake-admin','compliance-admin']}><Placeholder name="AdminExpertApplications" /></ProtectedRoute>} />
          <Route path="/admin/revenue"
            element={<ProtectedRoute allowedRoles={['superuser','revenue-admin','compliance-admin']}><Placeholder name="AdminRevenue" /></ProtectedRoute>} />
          <Route path="/admin/fee-config"
            element={<ProtectedRoute allowedRoles={['superuser','revenue-admin']}><Placeholder name="AdminFeeConfig" /></ProtectedRoute>} />
          <Route path="/admin/compliance"
            element={<ProtectedRoute allowedRoles={['superuser','compliance-admin']}><Placeholder name="ComplianceDashboard" /></ProtectedRoute>} />
          <Route path="/admin/analytics"
            element={<ProtectedRoute allowedRoles={['superuser','revenue-admin','compliance-admin']}><Placeholder name="Analytics" /></ProtectedRoute>} />

          {/* ══════════════════════════════════════════════════
              SHARED / CROSS-ROLE ROUTES  ── Member 1
              All authenticated roles can reach these.
              ══════════════════════════════════════════════════ */}
          <Route path="/shared/messages"
            element={<ProtectedRoute><Placeholder name="Messages" /></ProtectedRoute>} />
          <Route path="/shared/reports"
            element={<ProtectedRoute><Placeholder name="MilestoneReports" /></ProtectedRoute>} />

          {/* Project routes */}
          <Route path="/project/:id/workroom"
            element={<ProtectedRoute><Placeholder name="ProjectWorkroom" /></ProtectedRoute>} />
          <Route path="/project/:id/milestone-board"
            element={<ProtectedRoute><Placeholder name="MilestoneBoard" /></ProtectedRoute>} />
          <Route path="/project/:id/submit-deliverable"
            element={<ProtectedRoute><Placeholder name="SubmitDeliverable" /></ProtectedRoute>} />
          <Route path="/project/:id/review-deliverable"
            element={<ProtectedRoute><Placeholder name="ReviewDeliverable" /></ProtectedRoute>} />
          <Route path="/project/:id/milestone-reports"
            element={<ProtectedRoute><Placeholder name="MilestoneReports" /></ProtectedRoute>} />

          {/* Dispute routes */}
          <Route path="/dispute/:id"
            element={<ProtectedRoute><Placeholder name="DisputeDetail" /></ProtectedRoute>} />
          <Route path="/dispute/:id/resolve"
            element={<ProtectedRoute><Placeholder name="ResolveDispute" /></ProtectedRoute>} />

          {/* Task detail (public-ish — visible to non-clients) */}
          <Route path="/tasks/:id"
            element={<ProtectedRoute><Placeholder name="TaskDetails" /></ProtectedRoute>} />

          {/* Analytics */}
          <Route path="/analytics"
            element={<ProtectedRoute><Placeholder name="PerformanceAnalytics" /></ProtectedRoute>} />

          {/* Settings — each role sees their own page */}
          <Route path="/settings/profile"
            element={<ProtectedRoute allowedRoles={['client']}><Placeholder name="ProfileSettings" /></ProtectedRoute>} />
          <Route path="/settings/worker"
            element={<ProtectedRoute allowedRoles={['worker']}><Placeholder name="WorkerSettings" /></ProtectedRoute>} />
          <Route path="/settings/expert"
            element={<ProtectedRoute allowedRoles={['expert']}><Placeholder name="ExpertSettings" /></ProtectedRoute>} />
          <Route path="/settings/staff"
            element={<ProtectedRoute allowedRoles={['superuser','revenue-admin','intake-admin','compliance-admin']}><Placeholder name="StaffSettings" /></ProtectedRoute>} />

          {/* ══════════════════════════════════════════════════
              404
              ══════════════════════════════════════════════════ */}
          <Route path="*" element={<NotFoundPage />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

// ─── 404 ──────────────────────────────────────────────────────────────────────
function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--background)', gap: 16,
    }}>
      <div style={{ fontSize: 80, lineHeight: 1, fontWeight: 700, color: 'var(--muted-foreground)', opacity: 0.15 }}>404</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginTop: -16 }}>Page Not Found</h1>
      <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
        The page you're looking for doesn't exist.
      </p>
      <a href="/" style={{
        marginTop: 8, padding: '10px 24px', background: 'var(--primary)',
        color: 'var(--primary-foreground)', borderRadius: 10,
        textDecoration: 'none', fontWeight: 500, fontSize: 14,
      }}>
        Go Home
      </a>
    </div>
  );
}
