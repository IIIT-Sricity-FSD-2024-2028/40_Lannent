/**
 * LANNENT — AvatarColorPicker
 * Avatars across the app are initials on a colour, so the colour is what a
 * person chooses. (The "Upload Photo" buttons this replaces did nothing.)
 */
export const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#4f46e5)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#a855f7,#7c3aed)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#0ea5e9,#0284c7)',
  'linear-gradient(135deg,#ef4444,#dc2626)',
  'linear-gradient(135deg,#0d9488,#0f766e)',
];

export default function AvatarColorPicker({ initials, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: value, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flex: 'none' }}>
        {initials}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Avatar colour</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {AVATAR_COLORS.map(c => (
            <button key={c} type="button" aria-label="Choose this colour" aria-pressed={c === value} onClick={() => onChange(c)}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: c === value ? '3px solid var(--foreground)' : '2px solid transparent' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
