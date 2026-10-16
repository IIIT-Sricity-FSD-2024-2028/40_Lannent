/**
 * LANNENT — FilterTabs
 * The pill-shaped filter bar ("All / Pending / Accepted / ...") used on the
 * invitations pages. The selected tab looks raised.
 *
 *   <FilterTabs tabs={[['all', 'All'], ['pending', 'Pending']]} active={filter} onChange={setFilter} />
 */
const BAR_STYLE = { display: 'flex', gap: 4, background: 'var(--input-bg)', padding: 4, borderRadius: 12, overflowX: 'auto' };
const BUTTON_STYLE = { padding: '6px 14px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: 'none' };

/**
 * @param {Array}    tabs        - [[value, label], ...]
 * @param {string}   active      - selected value
 * @param {Function} onChange    - called with the clicked value
 * @param {Object}   barStyle    - override the bar style (the wallet uses a slightly different bar)
 * @param {Object}   buttonStyle - override the base button style
 * @param {boolean}  nowrap      - keep labels on one line (default true)
 */
export default function FilterTabs({ id = 'filterBar', tabs, active, onChange, barStyle = BAR_STYLE, buttonStyle = BUTTON_STYLE, nowrap = true }) {
  return (
    <div id={id} style={barStyle}>
      {tabs.map(([value, label]) => {
        const on = value === active;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            style={{
              ...buttonStyle,
              background: on ? 'var(--card)' : 'transparent',
              color: on ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: on ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              ...(nowrap ? { whiteSpace: 'nowrap' } : {}),
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
