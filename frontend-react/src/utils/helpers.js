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
 * Sorts newest first by a date the row carries (ISO date or timestamp).
 *
 * Most records only store a day ("2026-10-13"), so several rows share a
 * date. Those keep the reverse of the order the server returned them in,
 * which is the order they were created — so the latest still comes first.
 * Rows with no date sort last. Returns a new array.
 */
export function newestFirst(list, dateOf = row => row.createdAt) {
  return list
    .map((row, index) => ({ row, index, time: Date.parse(dateOf(row) || '') }))
    .sort((a, b) => {
      const ta = isNaN(a.time) ? -Infinity : a.time;
      const tb = isNaN(b.time) ? -Infinity : b.time;
      return tb - ta || b.index - a.index;
    })
    .map(x => x.row);
}

/**
 * Tasks a worker has bookmarked with "Save Task".
 *
 * Kept in this browser, per user. There is no saved-task record on the
 * server, and the server's data is in memory and resets on restart, so a
 * bookmark stored there would not outlive one either.
 */
const savedKey = userId => `lannent_saved_tasks_${userId}`;

export function getSavedTaskIds(userId) {
  if (!userId) return [];
  try {
    const ids = JSON.parse(localStorage.getItem(savedKey(userId)) || '[]');
    return Array.isArray(ids) ? ids : [];
  } catch (e) {
    return [];
  }
}

/** Saves or un-saves a task. Returns true when the task is now saved. */
export function toggleSavedTask(userId, taskId) {
  const ids = getSavedTaskIds(userId);
  const saved = !ids.includes(taskId);
  const next = saved ? [...ids, taskId] : ids.filter(id => id !== taskId);
  try { localStorage.setItem(savedKey(userId), JSON.stringify(next)); } catch (e) { /* storage unavailable */ }
  return saved;
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

/**
 * After a profile save, the top bar and every page read the name and avatar
 * from the stored session — so it is updated to match the server's record.
 */
export function syncSessionFromUser(user) {
  if (!user) return;
  try {
    const session = JSON.parse(localStorage.getItem('lannent_session') || 'null');
    if (!session || session.userId !== user.id) return;
    localStorage.setItem('lannent_session', JSON.stringify({
      ...session, name: user.name, email: user.email, avatar: user.avatar, avatarColor: user.avatarColor,
    }));
  } catch (e) { /* storage unavailable */ }
}

/** Splits a stored "+919876543210" into its country code and the digits after it. */
export function splitPhone(phone, countryCode) {
  const p = String(phone || '');
  const code = countryCode || '';
  if (code && p.startsWith(code)) return { code, digits: p.slice(code.length) };
  return { code: code || '+91', digits: p.replace(/^\+/, '') };
}
