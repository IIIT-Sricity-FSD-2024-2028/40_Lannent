/**
 * LANNENT — UserMenu
 * The avatar in the top bar and its dropdown (Profile / Settings / Sign Out),
 * from dashboard.js.
 */
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';

const STAFF_ROLES = ['superuser', 'revenue-admin', 'intake-admin', 'compliance-admin'];

/** Each role has its own settings page. */
function getSettingsPage(role) {
  return role === 'worker' ? '/worker-settings'
    : role === 'expert' ? '/expert-settings'
    : STAFF_ROLES.includes(role) ? '/staff-settings'
    : '/profile-settings';
}

/**
 * @param {string}   role, user  - user = { name, initials, email, avatarColor }
 * @param {boolean}  open        - whether the menu is shown (owned by TopNavbar)
 * @param {Function} onToggle, onClose
 */
export default function UserMenu({ role, user, open, onToggle, onClose }) {
  const Auth = useAuth();
  const navigate = useNavigate();

  function handleAction(action) {
    switch (action) {
      case 'profile':
      case 'settings':
        navigate(getSettingsPage(role));
        break;
      case 'signout':
        Auth.logout();
        break;
    }
    onClose();
  }

  return (
    <>
      <div className="topnav-avatar" id="userMenuBtn" title={user.name}
           style={user.avatarColor ? { background: user.avatarColor } : undefined}
           onClick={e => { e.stopPropagation(); onToggle(); }}>
        {user.initials}
      </div>

      <div className={'topnav-user-menu' + (open ? ' active' : '')} id="userMenuDropdown" aria-hidden={String(!open)}>
        <div className="user-menu-head">
          <div className="user-menu-name">{user.name}</div>
          <div className="user-menu-email">{user.email}</div>
        </div>
        <div className="user-menu-actions">
          <button className="user-menu-item" onClick={() => handleAction('profile')}><Icon name="user" /> Profile</button>
          <button className="user-menu-item" onClick={() => handleAction('settings')}><Icon name="settings" /> Settings</button>
        </div>
        <button className="user-menu-signout" onClick={() => handleAction('signout')}><Icon name="log-out" /> Sign Out</button>
      </div>
    </>
  );
}
