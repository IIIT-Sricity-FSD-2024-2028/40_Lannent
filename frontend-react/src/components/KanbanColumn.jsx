/**
 * LANNENT — KanbanColumn
 * One column of a milestone board (To Do / In Progress / In Review / ...):
 * a coloured dot, the column title and a count badge, then the cards.
 *
 *   <KanbanColumn title="In Review" count={3} dot="#f59e0b" titleColor="#d97706"
 *                 countBg="#fef9c3" countColor="#b45309" background="#fffbeb">
 *     ...cards...
 *   </KanbanColumn>
 */
export default function KanbanColumn({ title, count, dot, dotAnimation, titleColor, countBg, countColor, background, children }) {
  return (
    <div className="kanban-col" style={background ? { background } : undefined}>
      <div className="kanban-col-header">
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: dot, ...(dotAnimation ? { animation: dotAnimation } : {}) }}></div>
        <span className="kanban-col-title" style={{ color: titleColor }}>{title}</span>
        {' '}
        <span className="kanban-count" style={{ background: countBg, color: countColor }}>{count}</span>
      </div>
      {children}
    </div>
  );
}
