/**
 * LANNENT — BrowseTasks
 * Converted from front-end/pages/browse-tasks.html.
 *
 * Open tasks a worker can apply for, with a filter sidebar (category is
 * live; budget, skills and the audit switch are visual only, as before) and
 * a search box / level filter above the task cards.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';

const SKILLS = ['React', 'Node.js', 'Python', 'UI Design', 'JavaScript', 'TypeScript', 'Vue.js', 'Figma', 'CSS', 'MongoDB', 'PostgreSQL', 'AWS'];

// Shared serif label / input styles of the filter sidebar
const LABEL_STYLE = { display: 'block', fontFamily: 'serif', fontSize: 15, marginBottom: 12, color: '#000' };
const RANGE_INPUT_STYLE = { flex: 1, minWidth: 0, padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontFamily: 'serif', fontSize: 14, color: '#4A5568' };

/** Open tasks from the store, shaped for the cards. */
function getAllBrowseTasks(Store) {
  return Store.getOpenTasks().map(t => ({
    id: t.id,
    title: t.title,
    desc: t.description,
    budget: '$' + t.budget.toLocaleString(),
    type: 'Fixed',
    level: 'Intermediate',
    tags: t.skills || [],
    proposals: Store.getProposalsByTask(t.id).filter(p => p.type !== 'invitation').length,
    deadline: t.deadline || 'TBD',
    badge: t.auditEnabled ? 'Audit' : 'New',
    badgeClass: t.auditEnabled ? 'badge-purple' : 'badge-green',
    category: t.category?.toLowerCase().replace(/[^a-z]/g, '') || 'web',
    fromStore: true,
  }));
}

/** One task card; the whole card opens the task details. */
function TaskCard({ task: t }) {
  const navigate = useNavigate();
  return (
    <div className="task-card" onClick={() => navigate(`/task-details?id=${t.id}`)}>
      <div className="task-card-header">
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--foreground)' }}>{t.title}</span>
        {' '}
        {t.badge ? <span className={`badge ${t.badgeClass}`}>{t.badge}</span> : ''}
      </div>
      <p className="task-desc">{t.desc}</p>
      <div className="skills-list">
        {t.tags.slice(0, 3).map(tag => <span key={tag} className="skill-tag">{tag}</span>)}
        {t.tags.length > 3 ? <span className="skill-tag">{`+${t.tags.length - 3}`}</span> : ''}
      </div>
      <div className="task-meta">
        <div className="task-meta-item">
          <Icon name="briefcase" style={{ width: 13, height: 13 }} />
          {t.type}
        </div>
        <div className="task-meta-item">
          <Icon name="bar-chart-2" style={{ width: 13, height: 13 }} />
          {t.level}
        </div>
        <div className="task-meta-item">
          <Icon name="users" style={{ width: 13, height: 13 }} />
          {`${t.proposals} proposals`}
        </div>
        <div className="task-meta-item">
          <Icon name="clock" style={{ width: 13, height: 13 }} />
          {`Due ${t.deadline}`}
        </div>
      </div>
      <div className="task-footer">
        <div className="task-budget">
          {`${t.budget} `}<span>/ project</span>
        </div>
        <button className="btn-primary" style={{ fontSize: 13, padding: '6px 16px' }}>Apply Now</button>
      </div>
    </div>
  );
}

export default function BrowseTasks() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Browse Tasks — Lannent');
  const session = Auth.getCurrentUser();
  const [tasks] = useState(() => getAllBrowseTasks(Store));

  // Live filtering
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('all');
  // The audit switch only moves its knob: the original compared the computed
  // rgb() colour with a hex string, so the track never turned purple.
  const [auditKnob, setAuditKnob] = useState(null);

  const q = search.toLowerCase();
  const filtered = tasks.filter(t => {
    const matchQ = !q || t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
    const matchCat = category === 'all' || t.category === category;
    const matchLvl = level === 'all' || t.level.toLowerCase() === level;
    return matchQ && matchCat && matchLvl;
  });

  return (
    <DashboardLayout role={session?.role || 'worker'} activePath="/browse-tasks" pageTitle="Browse Tasks" pageSubtitle="Find the perfect project that matches your skills">
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 32, alignItems: 'start' }}>
        {/* Left Filter Sidebar */}
        <div style={{ background: 'white', border: '1px solid #E8EAFF', borderRadius: 16, padding: 28, position: 'sticky', top: 104 }}>
          <h3 style={{ fontFamily: 'serif', fontSize: 20, fontWeight: 500, marginBottom: 24, color: '#000' }}>Filters</h3>
          <div style={{ marginBottom: 24 }}>
            <label style={LABEL_STYLE}>Category</label>
            {' '}
            <select
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontFamily: 'serif', fontSize: 14, color: '#000', background: 'white', appearance: 'none', backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'16\\' height=\\'16\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'black\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><polyline points=\\'6 9 12 15 18 9\\'/></svg>')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
              id="taskCategorySidebar"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="web">Web Development</option>
              <option value="mobile">Mobile Development</option>
              <option value="backend">Backend / API</option>
              <option value="design">Design</option>
              <option value="ai">AI / ML</option>
              <option value="devops">DevOps</option>
            </select>
            {/* Hidden replica to keep original logic intact */}
            <input type="hidden" id="taskCategory" value={category} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={LABEL_STYLE}>Budget Range</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="text" placeholder="Min" style={RANGE_INPUT_STYLE} />
              <span style={{ color: '#4A5568' }}>-</span>
              <input type="text" placeholder="Max" style={RANGE_INPUT_STYLE} />
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={LABEL_STYLE}>Required Skills</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SKILLS.map(skill => (
                <button
                  key={skill}
                  style={{ padding: '6px 16px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 9999, fontFamily: 'serif', fontSize: 13, color: '#4A5568', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#E2E8F0'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 32, padding: '16px 20px', background: '#FAFAFB', border: '1px solid #EAEAEA', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="file-check" style={{ width: 18, height: 18, color: '#7C3AED' }} />
              <span style={{ fontFamily: 'serif', fontSize: 14, color: '#000' }}>Technical Audit</span>
            </div>
            <div style={{ width: 44, height: 24, background: '#CBD5E1', borderRadius: 9999, position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                 onClick={() => setAuditKnob(on => !on)}>
              <div style={{ width: 18, height: 18, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: 3, transition: 'transform 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', ...(auditKnob === null ? {} : { transform: auditKnob ? 'translateX(20px)' : 'translateX(0)' }) }}></div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ minWidth: 0 }}>
          {/* Top Search & Sort Bar */}
          <div className="filters-bar" style={{ borderRadius: 16, padding: '14px 20px' }}>
            <div className="search-field" style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12 }}>
              <Icon name="search" style={{ width: 16, height: 16, flexShrink: 0 }} />
              {' '}
              <input type="text" placeholder="Search tasks..." id="taskSearch" style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: '#0f172a', fontSize: 14 }}
                     value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="filter-select" id="taskLevel" style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10 }}
                    value={level} onChange={e => setLevel(e.target.value)}>
              <option value="all">All Levels</option>
              <option value="entry">Entry Level</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Expert</option>
            </select>
            <div style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--muted-foreground)' }}>
              <strong id="taskCount" style={{ color: '#0f172a' }}>{filtered.length}</strong> tasks found
            </div>
          </div>

          {/* Task Cards */}
          <div id="taskContainer">
            {!filtered.length
              ? <p style={{ color: 'var(--muted-foreground)', padding: 32, textAlign: 'center' }}>No tasks found matching your criteria.</p>
              : <div className="task-grid">{filtered.map(t => <TaskCard key={t.id} task={t} />)}</div>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
