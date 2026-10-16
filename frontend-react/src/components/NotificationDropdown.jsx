/**
 * LANNENT — NotificationDropdown
 * The bell button in the top bar and its dropdown list.
 *
 * Notifications are written by the server whenever something happens to you —
 * an invitation, a hire, a submission, an approval, an offer, a dispute — so the
 * list is re-read every few seconds while the page is open, and clicking one
 * opens the page it is about and marks it read.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useStore } from '../context/StoreContext';
import { newestFirst } from '../utils/helpers';

const PREVIEW_COUNT = 8;
const POLL_MS = 15000;

/** Icon + colours for each notification type. */
function notifIcon(type) {
  switch (type) {
    case 'milestone-approved':
    case 'hire': return { icon: 'user-check', color: '#10b981', bg: '#d1fae5' };
    case 'payment': return { icon: 'wallet', color: '#6366f1', bg: '#e0e7ff' };
    case 'message': return { icon: 'message-square', color: '#3b82f6', bg: '#dbeafe' };
    case 'dispute':
    case 'dispute-resolved': return { icon: 'alert-triangle', color: '#f59e0b', bg: '#fef3c7' };
    case 'proposal':
    case 'invitation': return { icon: 'file-text', color: '#8b5cf6', bg: '#ede9fe' };
    case 'milestone-submitted':
    case 'revision': return { icon: 'package', color: '#0ea5e9', bg: '#e0f2fe' };
    case 'audit-request':
    case 'audit-needed':
    case 'audit-offer':
    case 'audit-funded':
    case 'audit-accepted':
    case 'audit-declined':
    case 'audit-cancelled':
    case 'audit-complete': return { icon: 'shield-check', color: '#a855f7', bg: '#f3e8ff' };
    default: return { icon: 'bell', color: '#64748b', bg: '#f1f5f9' };
  }
}

/** "just now", "5m ago", "3h ago", "2d ago", or a date. */
function timeAgo(iso) {
  const t = Date.parse(iso || '');
  if (isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * @param {string}   userId   - current user's id ('' when unknown)
 * @param {boolean}  open     - whether the dropdown is shown (owned by TopNavbar)
 * @param {Function} onToggle - bell button click
 */
export default function NotificationDropdown({ userId, open, onToggle }) {
  const Store = useStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() => (userId ? newestFirst(Store.getNotifications(userId) || []) : []));
  const [showAll, setShowAll] = useState(false);

  // Keep the list current while the page is open.
  useEffect(() => {
    if (!userId) return undefined;
    let alive = true;
    const pull = () => Store.refreshNotifications().then(list => {
      if (alive) setNotifications(newestFirst((list || []).filter(n => n.userId === userId)));
    });
    pull();
    const timer = setInterval(pull, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [Store, userId]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const shown = showAll ? notifications : notifications.slice(0, PREVIEW_COUNT);

  function markAllRead(e) {
    e.stopPropagation();
    if (userId) Store.markNotificationsRead(userId);
    setNotifications(list => list.map(n => ({ ...n, read: true })));
  }

  function openNotification(n) {
    if (!n.read) {
      Store.markNotificationRead(n.id);
      setNotifications(list => list.map(x => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) {
      onToggle();
      navigate(n.link);
    }
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
            shown.map(n => {
              const ni = notifIcon(n.type);
              return (
                <div key={n.id} className={'notif-item' + (n.read ? '' : ' unread')} data-notif-id={n.id}
                     role="button" tabIndex={0}
                     style={{ cursor: n.link || !n.read ? 'pointer' : 'default' }}
                     onClick={e => { e.stopPropagation(); openNotification(n); }}
                     onKeyDown={e => { if (e.key === 'Enter') openNotification(n); }}>
                  <div className="notif-icon" style={{ background: ni.bg, color: ni.color }}>
                    <Icon name={ni.icon} style={{ width: 16, height: 16 }} />
                  </div>
                  <div className="notif-body">
                    <p className="notif-text">{n.text}</p>
                    <p className="notif-sub">{[n.subtext, timeAgo(n.createdAt)].filter(Boolean).join(' · ')}</p>
                  </div>
                  {!n.read && <div className="notif-unread-dot"></div>}
                </div>
              );
            })
          )}
        </div>
        {notifications.length > PREVIEW_COUNT && (
          <button type="button" className="notif-view-all" onClick={e => { e.stopPropagation(); setShowAll(v => !v); }}
                  style={{ width: '100%', padding: 10, border: 'none', borderTop: '1px solid var(--border)', background: 'none', color: '#4f46e5', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {showAll ? 'Show latest only' : `View all (${notifications.length})`}
          </button>
        )}
      </div>
    </>
  );
}
