/**
 * LANNENT — Expert Reviewer picker
 *
 * Shared by post-task.html (project audit) and dispute.html (dispute audit).
 * A client must choose one reviewer, and may inspect their profile first. Only
 * reviewers whose domains cover the project's category are offered — the server
 * enforces the same rule, so a tampered selection is rejected there too.
 */
const ExpertPicker = (() => {
  let _selectedId = null;
  let _onChange = null;

  function matching(category) {
    const experts = (Store.getExperts && Store.getExperts()) || [];
    if (!category) return experts;
    return experts.filter(e => Array.isArray(e.domains) && e.domains.includes(category));
  }

  function selected() { return _selectedId; }

  function clear() { _selectedId = null; }

  /**
   * Renders the reviewer list into `containerId`.
   * @param {Object} cfg - { containerId, category, onChange }
   */
  function render(cfg) {
    const box = document.getElementById(cfg.containerId);
    if (!box) return;
    _onChange = cfg.onChange || null;

    const list = matching(cfg.category);

    // A reviewer selected for a different category is no longer valid.
    if (_selectedId && !list.some(e => e.id === _selectedId)) _selectedId = null;

    if (!list.length) {
      box.innerHTML = `
        <div style="padding:16px;border:1px dashed var(--border);border-radius:10px;font-size:13px;color:var(--muted-foreground);">
          No Expert Reviewer currently covers <strong>${cfg.category || 'this category'}</strong>.
          Choose a different category, or continue without an audit.
        </div>`;
      if (_onChange) _onChange(null);
      return;
    }

    box.innerHTML = list.map(e => {
      const on = e.id === _selectedId;
      return `
        <div class="xp-card${on ? ' xp-on' : ''}" onclick="ExpertPicker.select('${e.id}')" role="button"
             tabindex="0" aria-pressed="${on}"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();ExpertPicker.select('${e.id}')}">
          <span class="xp-radio">${on ? '<span class="xp-dot"></span>' : ''}</span>
          <span class="xp-avatar" style="background:${e.avatarColor};">${e.avatar}</span>
          <span class="xp-body">
            <span class="xp-name">${e.name}</span>
            <span class="xp-meta">${e.specialization} · ${e.reviewsDone} review${e.reviewsDone === 1 ? '' : 's'}</span>
          </span>
          <button type="button" class="xp-profile" onclick="event.stopPropagation();ExpertPicker.profile('${e.id}')">View profile</button>
        </div>`;
    }).join('');

    if (_onChange) _onChange(_selectedId);
  }

  function select(id) {
    _selectedId = _selectedId === id ? null : id;
    // Re-render in place without needing the caller's config again.
    const card = document.querySelector('.xp-card');
    if (card) {
      document.querySelectorAll('.xp-card').forEach(el => {
        const on = el.getAttribute('onclick').includes(`'${_selectedId}'`) && _selectedId !== null;
        el.classList.toggle('xp-on', on);
        el.setAttribute('aria-pressed', String(on));
        const radio = el.querySelector('.xp-radio');
        if (radio) radio.innerHTML = on ? '<span class="xp-dot"></span>' : '';
      });
    }
    if (_onChange) _onChange(_selectedId);
  }

  /** Read-only profile so the client can judge a reviewer before assigning. */
  function profile(id) {
    const e = Store.getUserById(id);
    if (!e) return;
    const domains = (e.domains || []).map(d =>
      `<span class="xp-chip">${d}</span>`).join('') || '<span class="xp-chip">Not specified</span>';

    let modal = document.getElementById('xpProfileModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'xpProfileModal';
      modal.className = 'xp-modal';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="xp-modal-card">
        <div class="xp-modal-head">
          <span class="xp-avatar xp-avatar-lg" style="background:${e.avatarColor};">${e.avatar}</span>
          <div>
            <div class="xp-modal-name">${e.name}</div>
            <div class="xp-meta">${e.specialization}</div>
          </div>
          <button type="button" class="xp-close" onclick="ExpertPicker.closeProfile()" aria-label="Close">&times;</button>
        </div>
        <div class="xp-stats">
          <div><div class="xp-stat-v">${e.reviewsDone || 0}</div><div class="xp-stat-k">Reviews completed</div></div>
          <div><div class="xp-stat-v">${e.hourlyRate ? '$' + e.hourlyRate : '—'}</div><div class="xp-stat-k">Hourly rate</div></div>
          <div><div class="xp-stat-v">${e.status === 'active' ? 'Active' : e.status}</div><div class="xp-stat-k">Account</div></div>
        </div>
        <div class="xp-section-k">Reviews work in</div>
        <div class="xp-chips">${domains}</div>
        <div class="xp-modal-actions">
          <button type="button" class="btn-outline" onclick="ExpertPicker.closeProfile()">Close</button>
          <button type="button" class="btn-primary" onclick="ExpertPicker.select('${e.id}');ExpertPicker.closeProfile()">
            Select ${e.name.split(' ')[0]}
          </button>
        </div>
      </div>`;
    modal.style.display = 'flex';
  }

  function closeProfile() {
    const m = document.getElementById('xpProfileModal');
    if (m) m.style.display = 'none';
  }

  return { render, select, selected, clear, profile, closeProfile, matching };
})();
