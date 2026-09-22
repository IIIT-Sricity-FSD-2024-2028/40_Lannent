/**
 * LANNENT — StatCard  (src/components/shared/StatCard.jsx)
 *
 * Reusable statistics card. Matches the `.stat-card` CSS class in styles.css.
 *
 * @prop {string|number} value     - Main figure (e.g. 4, "$1,200")
 * @prop {string}        label     - Description (e.g. "Active Projects")
 * @prop {string}        icon      - lucide-react icon name in PascalCase OR kebab-case
 *                                   e.g. "FolderKanban" or "folder-kanban"
 * @prop {string}        [iconBg]  - Background colour for the icon bubble (e.g. "#eff6ff")
 * @prop {string}        [iconColor] - Icon colour (e.g. "#3b82f6")
 * @prop {string}        [change]  - Secondary line below label (e.g. "+3 this week")
 *
 * @example
 *   <StatCard
 *     label="Active Projects"
 *     value={activeTasks}
 *     icon="FolderKanban"
 *     iconBg="#eff6ff"
 *     iconColor="#3b82f6"
 *     change={`${totalTasks} total`}
 *   />
 */

import * as LucideIcons from 'lucide-react';

/** Converts kebab-case → PascalCase so both formats work. */
function toPascal(name) {
  if (!name) return 'BarChart2';
  // Already PascalCase (first letter uppercase)
  if (/^[A-Z]/.test(name)) return name;
  return name
    .split('-')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

export default function StatCard({ value, label, icon, iconBg, iconColor, change }) {
  const pascal = toPascal(icon);
  const Icon   = LucideIcons[pascal] || LucideIcons.BarChart2;

  return (
    <div className="stat-card">
      <div>
        <div className="stat-val">{value}</div>
        <div className="stat-label">{label}</div>
        {change && <div className="stat-change">{change}</div>}
      </div>
      <div className="stat-icon-wrap" style={{ background: iconBg }}>
        <Icon style={{ width: 20, height: 20, color: iconColor }} />
      </div>
    </div>
  );
}
