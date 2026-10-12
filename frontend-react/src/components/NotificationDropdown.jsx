/**
 * LANNENT — NotificationDropdown
 * The bell button in the top bar and its dropdown list (from dashboard.js).
 * Shows the latest 8 notifications for the signed-in user, with an unread
 * badge and a "mark all as read" button.
 */
import { useState } from 'react';
import Icon from './Icon';
import { useStore } from '../context/StoreContext';

/** Icon + colours for each notification type. */
function notifIcon(type) {
  switch (type) {
    case 'milestone-approved': return { icon: 'check-circle', color: '#10b981', bg: '#d1fae5' };
    case 'payment': return { icon: 'wallet', color: '#6366f1', bg: '#e0e7ff' };
    case 'message': return { icon: 'message-square', color: '#3b82f6', bg: '#dbeafe' };
    case 'dispute': return { icon: 'alert-triangle', color: '#f59e0b', bg: '#fef3c7' };
    case 'proposal': return { icon: 'file-text', color: '#8b5cf6', bg: '#ede9fe' };
    case 'hire': return { icon: 'user-check', color: '#10b981', bg: '#d1fae5' };
    default: return { icon: 'bell', color: '#64748b', bg: '#f1f5f9' };
  }
}

/**
 * @param {string}   userId   - current user's id ('' when unknown)
 * @param {boolean}  open     - whether the dropdown is shown (owned by TopNavbar)
 * @param {Function} onToggle - bell button click
 */
export default function NotificationDropdown({ userId, open, onToggle }) {
  const Store = useStore();
  const [notifications, setNotifications] = useState(() => (userId ? Store.getNotifications(userId) || [] : []));
  const unreadCount = notifications.filter(n => !n.read).length;

  function markAllRead(e) {
    e.stopPropagation();
    if (userId) Store.markNotificationsRead(userId);
    setNotifications(list => list.map(n => ({ ...n, read: true })));
  }

  return (
    <>
      <button className="topnav-btn" id="notifBellBtn" title="Notifications" style={{ position: 'relative' }}
              onClick={e => { e.stopPropagation(); onToggle(); }}>
        <Icon name="bell" style={{ width: 18, height: 18 }} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      <div className={'notif-dropdown' + (open ? ' active' : '')} id="notifDropdown" aria-hidden={String(!open)}>
        <div className="notif-dropdown-header">
          <span className="notif-dropdown-title">Notifications</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unreadCount > 0 && <span className="notif-count-badge">{unreadCount} new</span>}
            {unreadCount > 0 && (
              <button className="notif-mark-read-btn" id="markAllReadBtn" title="Mark all as read" onClick={markAllRead}>
                <Icon name="check-check" style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
        </div>

        <div className="notif-dropdown-list">
          {notifications.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
              <Icon name="bell-off" style={{ width: 32, height: 32, margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
              No notifications yet
            </div>
          ) : (
            notifications.slice(0, 8).map(n => {
              const ni = notifIcon(n.type);
              return (
                <div key={n.id} className={'notif-item' + (n.read ? '' : ' unread')} data-notif-id={n.id}>
                  <div className="notif-icon" style={{ background: ni.bg, color: ni.color }}>
                    <Icon name={ni.icon} style={{ width: 16, height: 16 }} />
                  </div>
                  <div className="notif-body">
                    <p className="notif-text">{n.text}</p>
                    <p className="notif-sub">{n.subtext || ''}</p>
                  </div>
                  {!n.read && <div className="notif-unread-dot"></div>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
