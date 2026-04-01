/**
 * LANNENT — Dashboard Layout Component
 * Shared sidebar + top navigation for all dashboard pages
 * Converted from React DashboardLayout, Sidebar, TopNavbar components
 */

/**
 * Renders the full dashboard shell into a target element.
 * @param {Object} config - { role, activePath, pageTitle, pageSubtitle, content }
 */
function initDashboard(config = {}) {
  const {
    role = 'client',       // 'client' | 'worker' | 'expert'
    activePath = '',
    pageTitle = 'Dashboard',
    pageSubtitle = '',
    content = '',          // HTML string for page body
  } = config;

  // Determine sidebar items by role
  const clientItems = [
    { icon: 'layout-dashboard', label: 'Dashboard', path: 'client-dashboard.html' },
    { icon: 'folder-kanban', label: 'My Projects', path: 'client-my-projects.html' },
    { icon: 'plus-circle', label: 'Post Task', path: 'post-task.html' },
    { icon: 'user-plus', label: 'Hire Workers', path: 'hire-gig-workers.html' },
    { icon: 'users', label: 'Worker Applications', path: 'worker-applications.html' },
    { icon: 'message-square', label: 'Messages', path: 'messages.html', badge: 3, iconBadge: 3 },
    { icon: 'wallet', label: 'Wallet', path: 'client-wallet.html' },
    { icon: 'settings', label: 'Settings', path: 'profile-settings.html' },
  ];
  const workerItems = [
    { icon: 'layout-dashboard', label: 'Dashboard', path: 'worker-dashboard.html' },
    { icon: 'search', label: 'Browse Tasks', path: 'browse-tasks.html' },
    { icon: 'folder-kanban', label: 'My Projects', path: 'worker-my-projects.html' },
    { icon: 'mail', label: 'Invitations', path: 'worker-invitations.html' },
    { icon: 'file-text', label: 'My Proposals', path: 'my-proposals.html' },
    { icon: 'message-square', label: 'Messages', path: 'messages.html', badge: 2 },
    { icon: 'wallet', label: 'Wallet', path: 'worker-wallet.html' },
    { icon: 'settings', label: 'Settings', path: 'worker-settings.html' },
  ];
  const expertItems = [
    { icon: 'layout-dashboard', label: 'Dashboard', path: 'expert-dashboard.html' },
    { icon: 'clipboard-check', label: 'Audit Requests', path: 'expert-audit-requests.html' },
    { icon: 'scale', label: 'Dispute Cases', path: 'expert-dispute-cases.html' },
    { icon: 'file-text', label: 'Reports', path: 'expert-reports.html' },
    { icon: 'message-square', label: 'Messages', path: 'expert-messages.html', badge: 1 },
    { icon: 'settings', label: 'Settings', path: 'expert-settings.html' },
  ];

  const superItems = [
    { icon: 'layout-dashboard', label: 'Dashboard', path: 'superuser-dashboard.html' },
    { icon: 'users', label: 'Manage Users', path: 'superuser-users.html' },
    { icon: 'folder-kanban', label: 'Manage Tasks', path: 'superuser-tasks.html' },
    { icon: 'wallet', label: 'Escrow & Finance', path: 'superuser-escrow.html' },
    { icon: 'scale', label: 'All Disputes', path: 'superuser-disputes.html' },
  ];

  const menuItems = role === 'worker' ? workerItems : role === 'expert' ? expertItems : role === 'superuser' ? superItems : clientItems;

  // Read real user from session if auth is available
  let userName = role === 'worker' ? 'Alex W.' : role === 'expert' ? 'Dr. Jane S.' : role === 'superuser' ? 'Super Admin' : 'James Client';
  let userInitials = role === 'worker' ? 'AW' : role === 'expert' ? 'JS' : role === 'superuser' ? 'SA' : 'JC';
  let userEmail = userName.toLowerCase().replace(/\s+/g, '') + '@lannent.com';
  let avatarColor = '';

  if (typeof Auth !== 'undefined') {
    const session = Auth.getCurrentUser();
    if (session) {
      userName = session.name || userName;
      userInitials = session.avatar || userInitials;
      userEmail = session.email || userEmail;
      avatarColor = session.avatarColor || '';
    }
  }

  // Build sidebar HTML
  const sidebarItems = menuItems.map(item => {
    const isActive = activePath && (activePath === item.path || window.location.pathname.endsWith(item.path));
    const badge = item.badge ? `<span class="sidebar-badge">${item.badge}</span>` : '';
    const iconBadge = item.iconBadge ? `<span class="icon-badge">${item.iconBadge}</span>` : '';
    return `
      <a href="${item.path}" class="sidebar-item${isActive ? ' active' : ''}">
        <span class="sidebar-item-icon">
          <i data-lucide="${item.icon}" style="width:20px;height:20px;"></i>
          ${iconBadge}
        </span>
        <span class="sidebar-item-label">${item.label}</span>
        ${badge}
      </a>`;
  }).join('');

  document.body.innerHTML = `
    <div class="dashboard-layout">
      <!-- SIDEBAR -->
      <aside class="sidebar expanded" id="sidebar">
        <div class="sidebar-logo">
          <a href="../index.html" class="sidebar-logo-link">
            <div class="sidebar-logo-icon">L</div>
            <span class="sidebar-logo-text">Lannent<span>.</span></span>
          </a>
        </div>
        <nav class="sidebar-nav">
          ${sidebarItems}
        </nav>
        <div class="sidebar-footer" style="padding: 24px;">
          <button class="sidebar-toggle" id="sidebarToggle" title="Collapse sidebar" style="border-radius: 16px;">
            <i data-lucide="chevron-left" style="width:20px;height:20px;" id="sidebarChevron"></i>
          </button>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <div class="main-content sidebar-expanded" id="mainContent">
        <!-- TOP NAV -->
        <header class="topnav">
          <div class="topnav-text" title="Lannent Platform" style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: var(--muted-foreground);">
            <i data-lucide="sparkles" style="width: 16px; height: 16px; color: #8b5cf6;"></i>
            <span>Empowering World-Class Builders</span>
          </div>
          <div class="topnav-actions">
            <div class="topnav-avatar" id="userMenuBtn" title="${userName}" style="${avatarColor ? 'background:' + avatarColor + ';' : ''}">${userInitials}</div>
            <div class="topnav-user-menu" id="userMenuDropdown" aria-hidden="true">
              <div class="user-menu-head">
                <div class="user-menu-name">${userName}</div>
                <div class="user-menu-email">${userEmail}</div>
              </div>
              <div class="user-menu-actions">
                <button class="user-menu-item" data-action="profile"><i data-lucide="user"></i> Profile</button>
                <button class="user-menu-item" data-action="settings"><i data-lucide="settings"></i> Settings</button>
              </div>
              <button class="user-menu-signout" data-action="signout"><i data-lucide="log-out"></i> Sign Out</button>
            </div>
          </div>
        </header>

        <!-- PAGE CONTENT -->
        <main class="page-content" id="pageContent">
          <div class="page-header">
            <h1 class="page-title">${pageTitle}</h1>
            ${pageSubtitle ? `<p class="page-sub">${pageSubtitle}</p>` : ''}
          </div>
          ${content}
        </main>
      </div>
    </div>
  `;

  // Init Lucide icons
  if (window.lucide) lucide.createIcons();

  // User menu interactions
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userMenuDropdown = document.getElementById('userMenuDropdown');

  const closeUserMenu = () => {
    if (!userMenuDropdown) return;
    userMenuDropdown.classList.remove('active');
    userMenuDropdown.setAttribute('aria-hidden', 'true');
  };

  const openUserMenu = () => {
    if (!userMenuDropdown) return;
    userMenuDropdown.classList.toggle('active');
    const open = userMenuDropdown.classList.contains('active');
    userMenuDropdown.setAttribute('aria-hidden', !open);
  };

  userMenuBtn?.addEventListener('click', e => {
    e.stopPropagation();
    openUserMenu();
  });

  userMenuDropdown?.addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset?.action;
    if (!action) return;

    switch (action) {
      case 'profile':
        window.location.href = 'profile-settings.html';
        break;
      case 'settings':
        window.location.href = 'profile-settings.html';
        break;
      case 'help':
        window.location.href = 'help.html';
        break;
      case 'signout':
        if (typeof Auth !== 'undefined') { Auth.logout(); } else { alert('Signed out'); }
        break;
    }
    closeUserMenu();
  });

  document.addEventListener('click', event => {
    if (!userMenuDropdown?.contains(event.target) && event.target !== userMenuBtn) closeUserMenu();
  });

  // Sidebar toggle
  let collapsed = false;
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const chevron = document.getElementById('sidebarChevron');

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    collapsed = !collapsed;
    sidebar.classList.toggle('expanded', !collapsed);
    sidebar.classList.toggle('collapsed', collapsed);
    mainContent.classList.toggle('sidebar-expanded', !collapsed);
    mainContent.classList.toggle('sidebar-collapsed', collapsed);
    if (chevron) {
      chevron.setAttribute('data-lucide', collapsed ? 'chevron-right' : 'chevron-left');
      if (window.lucide) lucide.createIcons();
    }
  });
}
