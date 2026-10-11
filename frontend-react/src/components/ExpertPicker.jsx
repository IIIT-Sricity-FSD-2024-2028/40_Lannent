/**
 * LANNENT — ExpertPicker
 * React version of front-end/js/expert-picker.js.
 *
 * Shared by PostTask (project audit) and Dispute (dispute audit). A client
 * must choose one reviewer, and may inspect their profile first. Only
 * reviewers whose domains cover the project's category are offered — the
 * server enforces the same rule, so a tampered selection is rejected there too.
 *
 *   <ExpertPicker category={task.category} selectedId={expertId} onChange={setExpertId} />
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../context/StoreContext';

/** Active experts who review the given category (all of them when no category). */
export function matchingExperts(Store, category) {
  const experts = (Store.getExperts && Store.getExperts()) || [];
  if (!category) return experts;
  return experts.filter(e => Array.isArray(e.domains) && e.domains.includes(category));
}

export default function ExpertPicker({ category, selectedId, onChange }) {
  const Store = useStore();
  const [profileId, setProfileId] = useState(null);       // last profile shown (the modal stays in the DOM once opened)
  const [profileOpen, setProfileOpen] = useState(false);

  const list = matchingExperts(Store, category);

  // A reviewer selected for a different category is no longer valid.
  useEffect(() => {
    if (selectedId && !list.some(e => e.id === selectedId)) onChange(null);
  });

  function select(id) {
    onChange(selectedId === id ? null : id);
  }

  function openProfile(id) {
    if (!Store.getUserById(id)) return;
    setProfileId(id);
    setProfileOpen(true);
  }

  if (!list.length) {
    return (
      <div style={{ padding: 16, border: '1px dashed var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--muted-foreground)' }}>
        No Expert Reviewer currently covers <strong>{category || 'this category'}</strong>.
        Choose a different category, or continue without an audit.
      </div>
    );
  }

  return (
    <>
      {list.map(e => {
        const on = e.id === selectedId;
        return (
          <div
            key={e.id}
            className={'xp-card' + (on ? ' xp-on' : '')}
            onClick={() => select(e.id)}
            role="button"
            tabIndex="0"
            aria-pressed={String(on)}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(e.id); } }}
          >
            <span className="xp-radio">{on ? <span className="xp-dot"></span> : ''}</span>
            <span className="xp-avatar" style={{ background: e.avatarColor }}>{e.avatar}</span>
            <span className="xp-body">
              <span className="xp-name">{e.name}</span>
              <span className="xp-meta">{`${e.specialization} · ${e.reviewsDone} review${e.reviewsDone === 1 ? '' : 's'}`}</span>
            </span>
            <button type="button" className="xp-profile" onClick={event => { event.stopPropagation(); openProfile(e.id); }}>View profile</button>
          </div>
        );
      })}

      {profileId && createPortal(
        <ExpertProfileModal
          expert={Store.getUserById(profileId)}
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          onSelect={id => { select(id); setProfileOpen(false); }}
        />,
        document.body,
      )}
    </>
  );
}

/** Read-only profile so the client can judge a reviewer before assigning. */
function ExpertProfileModal({ expert: e, open, onClose, onSelect }) {
  const domains = (e.domains || []).length
    ? e.domains.map(d => <span key={d} className="xp-chip">{d}</span>)
    : <span className="xp-chip">Not specified</span>;

  return (
    <div id="xpProfileModal" className="xp-modal" style={{ display: open ? 'flex' : 'none' }}>
      <div className="xp-modal-card">
        <div className="xp-modal-head">
          <span className="xp-avatar xp-avatar-lg" style={{ background: e.avatarColor }}>{e.avatar}</span>
          <div>
            <div className="xp-modal-name">{e.name}</div>
            <div className="xp-meta">{e.specialization}</div>
          </div>
          <button type="button" className="xp-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="xp-stats">
          <div>
            <div className="xp-stat-v">{e.reviewsDone || 0}</div>
            <div className="xp-stat-k">Reviews completed</div>
          </div>
          <div>
            <div className="xp-stat-v">{e.hourlyRate ? '$' + e.hourlyRate : '—'}</div>
            <div className="xp-stat-k">Hourly rate</div>
          </div>
          <div>
            <div className="xp-stat-v">{e.status === 'active' ? 'Active' : e.status}</div>
            <div className="xp-stat-k">Account</div>
          </div>
        </div>
        <div className="xp-section-k">Reviews work in</div>
        <div className="xp-chips">{domains}</div>
        <div className="xp-modal-actions">
          <button type="button" className="btn-outline" onClick={onClose}>Close</button>
          <button type="button" className="btn-primary" onClick={() => onSelect(e.id)}>
            {`Select ${e.name.split(' ')[0]}`}
          </button>
        </div>
      </div>
    </div>
  );
}
