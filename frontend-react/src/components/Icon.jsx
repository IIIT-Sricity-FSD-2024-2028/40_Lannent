/**
 * LANNENT — Icon
 * Replaces the original `<i data-lucide="name" style="..."></i>` + lucide.createIcons().
 *
 * Takes the same kebab-case icon name used in the original markup
 * (e.g. "layout-dashboard") and renders the matching lucide-react icon, which
 * produces the same <svg class="lucide lucide-layout-dashboard"> element.
 *
 *   <Icon name="bell" style={{ width: 18, height: 18 }} />
 */
import * as LucideIcons from 'lucide-react';

// "layout-dashboard" → "LayoutDashboard", "bar-chart-2" → "BarChart2"
function toComponentName(name) {
  return String(name)
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export default function Icon({ name, ...props }) {
  const LucideIcon = LucideIcons[toComponentName(name)];
  // Unknown names behaved like an empty <i> tag before — keep that.
  if (!LucideIcon) return <i data-lucide={name} {...props} />;
  return <LucideIcon {...props} />;
}
