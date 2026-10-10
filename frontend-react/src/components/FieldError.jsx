/**
 * LANNENT — FieldError
 * The small red message shown under an invalid form field. Same markup and
 * styling that Validate.showError() used to insert next to the input.
 *
 *   <FieldError id="loginEmail" message={errors.loginEmail} />
 */
const ERROR_TEXT_STYLE = {
  color: '#ef4444', fontSize: 12, marginTop: 4, marginBottom: 0,
  display: 'flex', alignItems: 'center', gap: 4,
};

export default function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id ? id + '_err' : undefined} style={ERROR_TEXT_STYLE}>
      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {message}
    </p>
  );
}
