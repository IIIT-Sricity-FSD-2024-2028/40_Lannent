/**
 * LANNENT — TopNavbar  (src/components/shared/TopNavbar.jsx)
 *
 * Top navigation bar present on every dashboard page.
 * Shows the platform tagline, a notification bell with unread count,
 * and a user avatar with a dropdown menu (Profile / Settings / Sign Out).
 *
 * Reads auth state from useAuth() — no props required for user data.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Bell, Sparkles, LogOut, User, Settings, CheckCheck,
  BellOff, CheckCircle, Wallet, MessageSquare,
  AlertTriangle, FileText, UserCheck,
} from 'lucide-react';
import { useAuth }  from '../../hooks/useAuth';
import { apiGet, apiPost } from '../../lib/api';

// ─── Notification icon map ────────────────────────────────────────────────────

const NOTIF_ICONS = {
  'milestone-approved': { Icon: CheckCircle,   color: '#10b981', bg: '#d1fae5' },
  payment:              { Icon: Wallet,         color: '#6366f1', bg: '#e0e7ff' },
  message:              { Icon: MessageSquare,  color: '#3b82f6', bg: '#dbeafe' },
  dispute:              { Icon: AlertTriangle,  color: '#f59e0b', bg: '#fef3c7' },
  proposal:             { Icon: FileText,       color: '#8b5cf6', bg: '#ede9fe' },
  hire:                 { Icon: UserCheck,      color: '#10b981', bg: '#d1fae5' },
};
const DEFAULT_NOTIF = { Icon: Bell, color: '#64748b', bg: '#f1f5f9' };

// ─── Component ────────────────────────────────────────────────────────────────

export default function TopNavbar() {
  const { currentUser, logout } = useAuth();

  const [notifs,       setNotifs]       = useState([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);

  const userMenuRef = useRef(null);
  const notifRef    = useRef(null);

  // ── Fetch notifications ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.userId) return;
    apiGet(`/notifications/${currentUser.userId}`)
      .then(data => setNotifs(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => setNotifs([]));
  }, [currentUser?.userId]);

  const unreadCount = notifs.filter(n => !n.read).length;

  // ── Close dropdowns on outside click ───────────────────────────────────
  useEffect(() => {
    function onMouseDown(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current    && !notifRef.current.contains(e.target))    setNotifOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // ── Mark all read ───────────────────────────────────────────────────────
  async function markAllRead() {
    try {
      await apiPost(`/notifications/${currentUser.userId}/read-all`);
    } catch { /* optimistic — ignore */ }
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  // ── Derived user info ───────────────────────────────────────────────────
  const userName     = currentUser?.name   || 'User';
  const userInitials = currentUser?.avatar || userName.slice(0, 2).toUpperCase();
  const userEmail    = currentUser?.email  || '';
  const avatarStyle  = currentUser?.avatarColor ? { background: currentUser.avatarColor } : {};

  return (
    <header className="topnav">

      {/* Tagline */}
      <div
        className="topnav-text"
        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)' }}
      >
        <Sparkles style={{ width: 16, height: 16, color: '#8b5cf6' }} />
        <span>Empowering World-Class Builders</span>
      </div>

      <div className="topnav-actions">

        {/* ── Notification bell ── */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="topnav-btn"
            id="notifBellBtn"
            title="Notifications"
            style={{ position: 'relative' }}
            onClick={() => { setNotifOpen(o => !o); setUserMenuOpen(false); }}
          >
            <Bell style={{ width: 18, height: 18 }} />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown active" id="notifDropdown">
              <div className="notif-dropdown-header">
                <span className="notif-dropdown-title">Notifications</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {unreadCount > 0 && <span className="notif-count-badge">{unreadCount} new</span>}
                  {unreadCount > 0 && (
                    <button className="notif-mark-read-btn" onClick={markAllRead} title="Mark all as read">
                      <CheckCheck style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              </div>
              <div className="notif-dropdown-list">
                {notifs.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
                    <BellOff style={{ width: 32, height: 32, margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                    No notifications yet
                  </div>
                ) : notifs.slice(0, 8).map(n => {
                  const ni = NOTIF_ICONS[n.type] || DEFAULT_NOTIF;
                  return (
                    <div key={n.id} className={`notif-item${n.read ? '' : ' unread'}`}>
                      <div className="notif-icon" style={{ background: ni.bg, color: ni.color }}>
                        <ni.Icon style={{ width: 16, height: 16 }} />
                      </div>
                      <div className="notif-body">
                        <p className="notif-text">{n.text}</p>
                        <p className="notif-sub">{n.subtext || ''}</p>
                      </div>
                      {!n.read && <div className="notif-unread-dot" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── User avatar + menu ── */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <div
            className="topnav-avatar"
            id="userMenuBtn"
            title={userName}
            style={{ ...avatarStyle, cursor: 'pointer' }}
            onClick={() => { setUserMenuOpen(o => !o); setNotifOpen(false); }}
          >
            {userInitials}
          </div>

          {userMenuOpen && (
            <div className="topnav-user-menu active" id="userMenuDropdown">
              <div className="user-menu-head">
                <div className="user-menu-name">{userName}</div>
                <div className="user-menu-email">{userEmail}</div>
              </div>
              <div className="user-menu-actions">
                <button className="user-menu-item" onClick={() => setUserMenuOpen(false)}>
                  <User style={{ width: 16, height: 16 }} /> Profile
                </button>
                <button className="user-menu-item" onClick={() => setUserMenuOpen(false)}>
                  <Settings style={{ width: 16, height: 16 }} /> Settings
                </button>
              </div>
              <button className="user-menu-signout" onClick={logout}>
                <LogOut style={{ width: 16, height: 16 }} /> Sign Out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
