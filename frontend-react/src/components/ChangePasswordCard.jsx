/**
 * LANNENT — ChangePasswordCard
 * The "Security" section every settings page shares: current password, new
 * password (same strength rule as signup), confirmation. The server checks
 * the current password and the rule again.
 */
import { useState } from 'react';
import PasswordInput from './PasswordInput';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';

export default function ChangePasswordCard({ onChanged } = {}) {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function save() {
    const e = {};
    if (!current) e.current = 'Enter your current password.';
    const strength = Validate.password(next);
    if (strength) e.next = strength;
    const match = Validate.passwordMatch(next, confirm);
    if (match) e.confirm = match;
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      Store.changePassword(Auth.getCurrentUser().userId, current, next);
    } catch (err) {
      setSaving(false);
      if (/current password/i.test(err.message)) setErrors({ current: err.message });
      else Validate.toast(err.message, 'error');
      return;
    }
    setSaving(false);
    setCurrent(''); setNext(''); setConfirm('');
    Validate.toast('Password changed. Any other device signed in to this account has been signed out.', 'success');
    if (onChanged) onChanged();
  }

  return (
    <div style={{ maxWidth: 440 }}>
      <div className="form-group" style={{ marginBottom: 14 }}>
        <label className="form-label">Current password</label>
        <PasswordInput id="cp-current" toggleId="cp-current-toggle" value={current}
                       onChange={ev => { setCurrent(ev.target.value); setErrors(x => ({ ...x, current: '' })); }}
                       error={errors.current} />
      </div>
      <div className="form-group" style={{ marginBottom: 14 }}>
        <label className="form-label">New password</label>
        <PasswordInput id="cp-new" toggleId="cp-new-toggle" value={next}
                       onChange={ev => { setNext(ev.target.value); setErrors(x => ({ ...x, next: '' })); }}
                       error={errors.next} />
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>
          At least 8 characters, with an uppercase and a lowercase letter, a number and a symbol (!@#$%^&amp;*).
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 18 }}>
        <label className="form-label">Confirm new password</label>
        <PasswordInput id="cp-confirm" toggleId="cp-confirm-toggle" value={confirm}
                       onChange={ev => { setConfirm(ev.target.value); setErrors(x => ({ ...x, confirm: '' })); }}
                       error={errors.confirm} />
      </div>
      <button type="button" className="btn-primary" style={{ padding: '10px 20px', borderRadius: 10 }} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Change password'}
      </button>
    </div>
  );
}
