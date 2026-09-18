import { useState } from 'react';
import { Link } from 'react-router-dom';
import './WorkerDashboard.css';

const NAV_ITEMS = [
  { label: 'Dashboard',    path: '/worker-dashboard', active: true  },
  { label: 'Browse Tasks', path: '/browse-tasks'                    },
  { label: 'My Projects',  path: '/worker-my-projects'             },
  { label: 'Invitations',  path: '/worker-invitations'             },
  { label: 'My Proposals', path: '/my-proposals'                   },
  { label: 'Wallet',       path: '/worker-wallet'                  },
  { label: 'Messages',     path: '/messages'                       },
  { label: 'Reports',      path: '/milestone-reports'              },
  { label: 'Settings',     path: '/worker-settings'                },
];

const ACTIVE_PROJECTS = [
  { id: 1, title: 'E-commerce Website Redesign', status: 'in-progress', badgeClass: 'badge-blue', due: 'Oct 12', prog: 60 },
  { id: 2, title: 'Mobile App API Integration',  status: 'review',       badgeClass: 'badge-purple', due: 'Oct 18', prog: 85 },
  { id: 3, title: 'Data Dashboard Build',        status: 'open',         badgeClass: 'badge-orange', due: 'Nov 2',  prog: 20 },
];

const RECOMMENDED_TASKS = [
  { id: 1, title: 'React Frontend for SaaS Platform', budget: 3500, skills: ['React', 'TypeScript', 'Tailwind'] },
  { id: 2, title: 'Node.js REST API Development',     budget: 2800, skills: ['Node.js', 'Express', 'PostgreSQL'] },
  { id: 3, title: 'UI/UX Design for Mobile App',      budget: 1500, skills: ['Figma', 'UI Design'] },
];

export default function WorkerDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div className="dashboard-layout">

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : 'expanded'}`}>
        <div className="sidebar-logo">
          <Link to="/" className="sidebar-logo-link">
            <div className="sidebar-logo-icon">L</div>
            <span className="sidebar-logo-text">Lannent<span>.</span></span>
          </Link>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <Link key={item.path} to={item.path} className={`sidebar-item${item.active ? ' active' : ''}`}>
              <span className="sidebar-item-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </span>
              <span className="sidebar-item-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-toggle" onClick={() => setCollapsed(v => !v)} title="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {collapsed
                ? <polyline points="9 18 15 12 9 6"/>
                : <polyline points="15 18 9 12 15 6"/>}
            </svg>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className={`main-content ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>

        {/* Top nav */}
        <header className="topnav">
          <div className="topnav-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 9 9l-6 3 6 3 3 6 3-6 6-3-6-3z"/>
            </svg>
            <span>Empowering World-Class Builders</span>
          </div>
          <div className="topnav-actions">
            {/* Notification bell */}
            <div style={{ position: 'relative' }}>
              <button className="topnav-btn" onClick={() => { setNotifOpen(v => !v); setUserMenuOpen(false); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span className="notif-badge">3</span>
              </button>
              <div className={`notif-dropdown${notifOpen ? ' active' : ''}`}>
                <div className="notif-dropdown-header">
                  <span className="notif-dropdown-title">Notifications</span>
                  <span className="notif-count-badge">3 new</span>
                </div>
                <div className="notif-dropdown-list">
                  {[
                    { text: 'Milestone approved', sub: 'E-commerce Website · 2 min ago' },
                    { text: 'New message from Sarah', sub: 'Mobile App Project · 10 min ago' },
                    { text: 'Payment released $1,200', sub: 'API Integration · 1 hr ago' },
                  ].map((n, i) => (
                    <div key={i} className="notif-item unread">
                      <div className="notif-icon" style={{ background: '#d1fae5', color: '#10b981' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      </div>
                      <div className="notif-body">
                        <p className="notif-text">{n.text}</p>
                        <p className="notif-sub">{n.sub}</p>
                      </div>
                      <div className="notif-unread-dot" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User avatar */}
            <div style={{ position: 'relative' }}>
              <div className="topnav-avatar" onClick={() => { setUserMenuOpen(v => !v); setNotifOpen(false); }} role="button" tabIndex={0}>AW</div>
              <div className={`topnav-user-menu${userMenuOpen ? ' active' : ''}`}>
                <div className="user-menu-head">
                  <div className="user-menu-name">Alex W.</div>
                  <div className="user-menu-email">worker@gmail.com</div>
                </div>
                <div className="user-menu-actions">
                  <button className="user-menu-item">Profile</button>
                  <button className="user-menu-item">Settings</button>
                </div>
                <button className="user-menu-signout">Sign Out</button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          <div className="page-header">
            <h1 className="page-title">Worker Dashboard</h1>
            <p className="page-sub">Track your active projects and find new opportunities</p>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div><div className="stat-val">2</div><div className="stat-label">Active Projects</div><div className="stat-change">5 total</div></div>
              <div className="stat-icon-wrap" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><path d="M8 10v4"/><path d="M12 10v2"/><path d="M16 10v6"/></svg>
              </div>
            </div>
            <div className="stat-card">
              <div><div className="stat-val">$8,450</div><div className="stat-label">Total Earned</div><div className="stat-change">Lifetime earnings</div></div>
              <div className="stat-icon-wrap" style={{ background: '#ecfdf5', color: '#10b981' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>
              </div>
            </div>
            <div className="stat-card">
              <div><div className="stat-val">12</div><div className="stat-label">Proposals Sent</div><div className="stat-change">4 pending review</div></div>
              <div className="stat-icon-wrap" style={{ background: '#faf5ff', color: '#a855f7' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </div>
            </div>
            <div className="stat-card">
              <div><div className="stat-val">3</div><div className="stat-label">Completed</div><div className="stat-change">projects done</div></div>
              <div className="stat-icon-wrap" style={{ background: '#fff7ed', color: '#f97316' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginBottom: 32, marginTop: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h2>
            <div className="quick-actions-v2">
              {[
                { to: '/browse-tasks',        bg: '#f0f6ff', bc: '#e0efff', color: '#2563eb', title: 'Find Tasks',   desc: 'Browse and apply for new opportunities' },
                { to: '/worker-my-projects',  bg: '#f0fdf4', bc: '#dcfce7', color: '#16a34a', title: 'My Projects', desc: 'Manage your active milestones' },
                { to: '/messages',            bg: '#fffaf0', bc: '#ffeed5', color: '#ea580c', title: 'Messages',    desc: 'Communicate with your clients' },
                { to: '/worker-wallet',       bg: '#fdf5ff', bc: '#f8e4ff', color: '#9333ea', title: 'Wallet',      desc: 'View earnings and withdraw funds' },
              ].map(a => (
                <Link key={a.to} to={a.to} className="qa-v2-card" style={{ background: a.bg, borderColor: a.bc }}>
                  <div className="qa-v2-icon" style={{ color: a.color }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <div><div className="qa-v2-title">{a.title}</div><div className="qa-v2-desc">{a.desc}</div></div>
                </Link>
              ))}
            </div>
          </div>

          {/* Two-column panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Active Projects */}
            <div className="projects-table">
              <div className="table-header">
                <span className="table-title">Active Projects</span>
                <Link to="/worker-my-projects" className="btn-outline" style={{ fontSize: 13, padding: '6px 14px' }}>View All</Link>
              </div>
              <div style={{ padding: '8px 0' }}>
                {ACTIVE_PROJECTS.map(t => (
                  <div key={t.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</span>
                      <span className={`badge ${t.badgeClass}`} style={{ textTransform: 'capitalize' }}>{t.status.replace(/-/g, ' ')}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 8 }}>Due {t.due}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, borderRadius: 9999, background: 'var(--muted)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 9999, background: '#6366f1', width: `${t.prog}%` }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1' }}>{t.prog}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Tasks */}
            <div className="projects-table">
              <div className="table-header">
                <span className="table-title">Recommended Tasks</span>
                <Link to="/browse-tasks" className="btn-primary" style={{ fontSize: 13, padding: '6px 14px' }}>Browse All</Link>
              </div>
              <div style={{ padding: '8px 0' }}>
                {RECOMMENDED_TASKS.map(t => (
                  <div key={t.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t.title}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981', marginBottom: 8 }}>${t.budget.toLocaleString()}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {t.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
