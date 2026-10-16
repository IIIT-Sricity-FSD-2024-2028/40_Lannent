/**
 * LANNENT — TopNavbar
 * The bar across the top of every dashboard page (from dashboard.js):
 * tagline on the left, notifications bell (not for the superuser) and user
 * menu on the right.
 * Only one of the two dropdowns is open at a time; clicking anywhere else
 * closes them.
 */
import { useEffect, useState } from 'react';
import Icon from './Icon';
import NotificationDropdown from './NotificationDropdown';
import UserMenu from './UserMenu';

export default function TopNavbar({ role, user }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close both dropdowns on any click outside them.
  useEffect(() => {
    function onDocumentClick(event) {
      const menu = document.getElementById('userMenuDropdown');
      const notif = document.getElementById('notifDropdown');
      if (!menu?.contains(event.target)) setUserMenuOpen(false);
      if (!notif?.contains(event.target)) setNotifOpen(false);
    }
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, []);

  return (
    <header className="topnav">
      <div className="topnav-text" title="Lannent Platform" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)' }}>
        <Icon name="sparkles" style={{ width: 16, height: 16, color: '#8b5cf6' }} />
        <span>Empowering World-Class Builders</span>
      </div>
      <div className="topnav-actions">
        {/* The superuser runs the platform from its admin pages and is not a
            party to any project, so it gets no notification bell. */}
        {role !== 'superuser' && (
          <NotificationDropdown
            userId={user.id}
            open={notifOpen}
            onToggle={() => { setUserMenuOpen(false); setNotifOpen(o => !o); }}
          />
        )}
        <UserMenu
          role={role}
          user={user}
          open={userMenuOpen}
          onToggle={() => setUserMenuOpen(o => !o)}
          onClose={() => setUserMenuOpen(false)}
        />
      </div>
    </header>
  );
}
