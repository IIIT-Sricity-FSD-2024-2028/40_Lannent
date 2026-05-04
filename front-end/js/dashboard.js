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
    { icon: 'wallet', label: 'Wallet', path: 'client-wallet.html' },
    { icon: 'settings', label: 'Settings', path: 'profile-settings.html' },
  ];
  const workerItems = [
    { icon: 'layout-dashboard', label: 'Dashboard', path: 'worker-dashboard.html' },
    { icon: 'search', label: 'Browse Tasks', path: 'browse-tasks.html' },
    { icon: 'folder-kanban', label: 'My Projects', path: 'worker-my-projects.html' },
    { icon: 'mail', label: 'Invitations', path: 'worker-invitations.html' },
    { icon: 'file-text', label: 'My Proposals', path: 'my-proposals.html' },
    { icon: 'wallet', label: 'Wallet', path: 'worker-wallet.html' },
    { icon: 'settings', label: 'Settings', path: 'worker-settings.html' },
  ];
  const expertItems = [
    { icon: 'layout-dashboard', label: 'Dashboard', path: 'expert-dashboard.html' },
    { icon: 'clipboard-check', label: 'Audit Requests', path: 'expert-audit-requests.html' },
    { icon: 'scale', label: 'Dispute Cases', path: 'expert-dispute-cases.html' },
    { icon: 'file-text', label: 'Reports', path: 'expert-reports.html' },
    { icon: 'settings', label: 'Settings', path: 'expert-settings.html' },
  ];

  const superItems = [
    { icon: 'layout-dashboard', label: 'Dashboard', path: 'superuser-dashboard.html' },
    { icon: 'users', label: 'Manage Users', path: 'superuser-users.html' },
    { icon: 'shield-check', label: 'Expert Applications', path: 'superuser-expert-applications.html' },
    { icon: 'plus-circle', label: 'Create Task', path: 'superuser-create-task.html' },
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
  let currentUserId = '';

  if (typeof Auth !== 'undefined') {
    const session = Auth.getCurrentUser();
    if (session) {
      userName = session.name || userName;
      userInitials = session.avatar || userInitials;
      userEmail = session.email || userEmail;
      avatarColor = session.avatarColor || '';
      currentUserId = session.userId || '';
    }
  }

  // Get notifications for current user
  let userNotifications = [];
  if (typeof Store !== 'undefined' && currentUserId) {
    userNotifications = Store.getNotifications(currentUserId) || [];
  }
  const unreadCount = userNotifications.filter(n => !n.read).length;

  function _notifIcon(type) {
    switch(type) {
      case 'milestone-approved': return { icon: 'check-circle', color: '#10b981', bg: '#d1fae5' };
      case 'payment': return { icon: 'wallet', color: '#6366f1', bg: '#e0e7ff' };
      case 'message': return { icon: 'message-square', color: '#3b82f6', bg: '#dbeafe' };
      case 'dispute': return { icon: 'alert-triangle', color: '#f59e0b', bg: '#fef3c7' };
      case 'proposal': return { icon: 'file-text', color: '#8b5cf6', bg: '#ede9fe' };
      case 'hire': return { icon: 'user-check', color: '#10b981', bg: '#d1fae5' };
      default: return { icon: 'bell', color: '#64748b', bg: '#f1f5f9' };
    }
  }

  const notifListHtml = userNotifications.length === 0
    ? `<div style="padding:32px 16px;text-align:center;color:var(--muted-foreground);font-size:13px;"><i data-lucide="bell-off" style="width:32px;height:32px;margin:0 auto 8px;display:block;opacity:0.4;"></i>No notifications yet</div>`
    : userNotifications.slice(0, 8).map(n => {
        const ni = _notifIcon(n.type);
        return `
          <div class="notif-item${n.read ? '' : ' unread'}" data-notif-id="${n.id}">
            <div class="notif-icon" style="background:${ni.bg};color:${ni.color};"><i data-lucide="${ni.icon}" style="width:16px;height:16px;"></i></div>
            <div class="notif-body">
              <p class="notif-text">${n.text}</p>
              <p class="notif-sub">${n.subtext || ''}</p>
            </div>
            ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
          </div>`;
      }).join('');

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
            <button class="topnav-btn" id="notifBellBtn" title="Notifications" style="position:relative;">
              <i data-lucide="bell" style="width:18px;height:18px;"></i>
              ${unreadCount > 0 ? `<span class="notif-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}
            </button>
            <div class="notif-dropdown" id="notifDropdown" aria-hidden="true">
              <div class="notif-dropdown-header">
                <span class="notif-dropdown-title">Notifications</span>
                <div style="display:flex;align-items:center;gap:8px;">
                  ${unreadCount > 0 ? `<span class="notif-count-badge">${unreadCount} new</span>` : ''}
                  ${unreadCount > 0 ? `<button class="notif-mark-read-btn" id="markAllReadBtn" title="Mark all as read"><i data-lucide="check-check" style="width:14px;height:14px;"></i></button>` : ''}
                </div>
              </div>
              <div class="notif-dropdown-list">
                ${notifListHtml}
              </div>
            </div>
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

    const settingsPage = role === 'worker' ? 'worker-settings.html'
                        : role === 'expert' ? 'expert-settings.html'
                        : 'profile-settings.html';

    switch (action) {
      case 'profile':
        window.location.href = settingsPage;
        break;
      case 'settings':
        window.location.href = settingsPage;
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
    // Close notification dropdown on outside click
    const notifDropdown = document.getElementById('notifDropdown');
    const notifBellBtn = document.getElementById('notifBellBtn');
    if (notifDropdown && !notifDropdown.contains(event.target) && !notifBellBtn?.contains(event.target)) {
      notifDropdown.classList.remove('active');
      notifDropdown.setAttribute('aria-hidden', 'true');
    }
  });

  // Notification bell toggle
  const notifBellBtn = document.getElementById('notifBellBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  notifBellBtn?.addEventListener('click', e => {
    e.stopPropagation();
    closeUserMenu();
    const isOpen = notifDropdown.classList.toggle('active');
    notifDropdown.setAttribute('aria-hidden', !isOpen);
  });

  // Mark all as read button
  document.getElementById('markAllReadBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    if (typeof Store !== 'undefined' && currentUserId) {
      Store.markNotificationsRead(currentUserId);
    }
    // Remove the badge from bell
    const badge = notifBellBtn?.querySelector('.notif-badge');
    if (badge) badge.remove();
    // Remove the "X new" badge and the mark-read button
    const countBadge = notifDropdown?.querySelector('.notif-count-badge');
    if (countBadge) countBadge.remove();
    e.target.closest('#markAllReadBtn')?.remove();
    // Remove unread styles and dots from items
    notifDropdown?.querySelectorAll('.notif-item.unread').forEach(item => {
      item.classList.remove('unread');
      const dot = item.querySelector('.notif-unread-dot');
      if (dot) dot.remove();
    });
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
