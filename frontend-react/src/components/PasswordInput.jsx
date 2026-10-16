/**
 * LANNENT — PasswordInput
 * Password field with the eye / eye-off visibility toggle used on the
 * login and signup pages. Any validation message appears directly under the
 * input, inside the same wrapper, exactly where Validate.showError put it.
 *
 *   <PasswordInput id="loginPassword" value={password}
 *                  onChange={e => setPassword(e.target.value)}
 *                  error={errors.loginPassword} style={errorStyle('loginPassword')} />
 */
import { useState } from 'react';
import Icon from './Icon';
import FieldError from './FieldError';

export default function PasswordInput({
  id, toggleId, value, onChange, error, style, className = '', placeholder = '••••••••',
  toggleStyle,       // optional inline style for the eye button
  ...inputProps      // any other <input> attributes (onBlur, autoComplete, aria-required, ...)
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="form-input-wrap">
      <input
        type={visible ? 'text' : 'password'}
        className={'form-input form-input-pr' + (className ? ' ' + className : '')}
        placeholder={placeholder}
        id={id}
        value={value}
        onChange={onChange}
        style={style}
        {...inputProps}
      />
      <FieldError id={id} message={error} />
      {' '}
      <button type="button" className="form-input-icon-right" id={toggleId} style={toggleStyle} onClick={() => setVisible(v => !v)}>
        <Icon name={visible ? 'eye-off' : 'eye'} style={{ width: 16, height: 16 }} />
      </button>
    </div>
  );
}
