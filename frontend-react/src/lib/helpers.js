/**
 * LANNENT — Small shared helpers
 * Ported from the "ESCAPING" section of front-end/js/main.js.
 *
 * JSX already escapes any text it renders, so escapeHtml() is only needed
 * where a string still ends up as raw HTML (for example a toast message).
 */

/** Escapes a value for interpolation into markup. */
export function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** Allows only http(s) URLs through; anything else (javascript:, data:) becomes empty. */
export function safeHref(url) {
  return /^https?:\/\//i.test(String(url || '')) ? String(url) : '';
}

/**
 * Hover highlight used on many clickable rows/cards — the React version of
 * onmouseenter="this.style.background='#f8f9fb'" onmouseleave="this.style.background='transparent'".
 *
 *   <div {...hoverBackground('#f8f9fb')}>...</div>
 */
export function hoverBackground(hoverColor, normalColor = 'transparent') {
  return {
    onMouseEnter: e => { e.currentTarget.style.background = hoverColor; },
    onMouseLeave: e => { e.currentTarget.style.background = normalColor; },
  };
}
