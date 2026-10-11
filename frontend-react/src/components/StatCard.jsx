/**
 * LANNENT — StatCard
 * The ".stat-card" summary tile repeated across the dashboards:
 * a big value, a label, a small caption, and a coloured icon on the right.
 *
 *   <StatCard value={activeTasks} label="Active Projects" change="4 total"
 *             icon="folder-kanban" iconBg="#eff6ff" iconColor="#3b82f6" />
 *
 * `change` (the small caption) is optional; some pages show no caption line.
 */
import Icon from './Icon';

export default function StatCard({ value, label, change, icon, iconBg, iconColor, valueStyle, valueId }) {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-val" id={valueId} style={valueStyle}>{value}</div>
        <div className="stat-label">{label}</div>
        {change !== undefined && <div className="stat-change">{change}</div>}
      </div>
      <div className="stat-icon-wrap" style={{ background: iconBg }}>
        <Icon name={icon} style={{ width: 20, height: 20, color: iconColor }} />
      </div>
    </div>
  );
}
