/**
 * LANNENT — BrowseTasks
 * Converted from front-end/pages/browse-tasks.html.
 *
 * Open tasks a worker can apply for, with a filter sidebar (category, budget
 * range, required skills, technical audit) and a search box / sort above the
 * task cards. Every filter is live.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import { CATEGORIES } from '../utils/categories';

// Shared serif label / input styles of the filter sidebar
const LABEL_STYLE = { display: 'block', fontFamily: 'serif', fontSize: 15, marginBottom: 12, color: '#000' };
const RANGE_INPUT_STYLE = { flex: 1, minWidth: 0, padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontFamily: 'serif', fontSize: 14, color: '#4A5568' };

/** Open tasks from the store, shaped for the cards. */
function getAllBrowseTasks(Store) {
  return Store.getOpenTasks().map(t => ({
    id: t.id,
    title: t.title,
    desc: t.description || '',
    budgetValue: Number(t.budget) || 0,
    budget: '₹' + (Number(t.budget) || 0).toLocaleString('en-IN'),
    tags: t.skills || [],
    milestones: Store.getMilestonesByTask(t.id).length,
    deadline: t.deadline || 'TBD',
    audit: !!t.auditEnabled,
    badge: t.auditEnabled ? 'Audit' : 'New',
    badgeClass: t.auditEnabled ? 'badge-purple' : 'badge-green',
    category: t.category || '',
    createdAt: t.createdAt || '',
  }));
}

/** One task card; the whole card opens the task details. */
function TaskCard({ task: t }) {
  const navigate = useNavigate();
  const open = () => navigate(`/task-details?id=${t.id}`);
  return (
    <div className="task-card" onClick={open}>
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
          {t.category || 'Uncategorised'}
        </div>
        <div className="task-meta-item">
          <Icon name="bar-chart-2" style={{ width: 13, height: 13 }} />
          {`${t.milestones} milestone${t.milestones === 1 ? '' : 's'}`}
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
        <button className="btn-primary" style={{ fontSize: 13, padding: '6px 16px' }}
                onClick={e => { e.stopPropagation(); open(); }}>View &amp; Apply</button>
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
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [skills, setSkills] = useState([]);
  const [auditOnly, setAuditOnly] = useState(false);
  const [sort, setSort] = useState('newest');

  // The skill chips are the skills the open tasks actually ask for.
  const allSkills = [...new Set(tasks.flatMap(t => t.tags))].sort((a, b) => a.localeCompare(b));
  const toggleSkill = skill => setSkills(list => list.includes(skill) ? list.filter(x => x !== skill) : [...list, skill]);

  const q = search.trim().toLowerCase();
  const min = parseFloat(minBudget);
  const max = parseFloat(maxBudget);
  const filtered = tasks.filter(t => {
    const matchQ = !q || t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
    const matchCat = category === 'all' || t.category === category;
    const matchMin = !(min >= 0) || t.budgetValue >= min;
    const matchMax = !(max >= 0) || t.budgetValue <= max;
    const matchSkills = !skills.length || skills.every(s => t.tags.includes(s));
    const matchAudit = !auditOnly || t.audit;
    return matchQ && matchCat && matchMin && matchMax && matchSkills && matchAudit;
  }).sort((a, b) => {
    if (sort === 'budget-high') return b.budgetValue - a.budgetValue;
    if (sort === 'budget-low') return a.budgetValue - b.budgetValue;
    if (sort === 'deadline') return String(a.deadline).localeCompare(String(b.deadline));
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  const hasFilters = search || category !== 'all' || minBudget || maxBudget || skills.length || auditOnly;
  const clearFilters = () => { setSearch(''); setCategory('all'); setMinBudget(''); setMaxBudget(''); setSkills([]); setAuditOnly(false); };

  return (
    <DashboardLayout role={session?.role || 'worker'} activePath="/browse-tasks" pageTitle="Browse Tasks" pageSubtitle="Find the perfect project that matches your skills">
      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', gap: 32, alignItems: 'start' }}>
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
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={LABEL_STYLE}>Budget Range</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="number" min="0" placeholder="Min" style={RANGE_INPUT_STYLE} value={minBudget} onChange={e => setMinBudget(e.target.value)} />
              <span style={{ color: '#4A5568' }}>-</span>
              <input type="number" min="0" placeholder="Max" style={RANGE_INPUT_STYLE} value={maxBudget} onChange={e => setMaxBudget(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={LABEL_STYLE}>Required Skills</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {!allSkills.length && <span style={{ fontSize: 13, color: '#94A3B8' }}>No skills listed yet.</span>}
              {allSkills.map(skill => {
                const on = skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSkill(skill)}
                    style={{ padding: '6px 16px', background: on ? '#EDE9FE' : '#F1F5F9', border: `1px solid ${on ? '#7C3AED' : '#E2E8F0'}`, borderRadius: 9999, fontFamily: 'serif', fontSize: 13, color: on ? '#5B21B6' : '#4A5568', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginTop: 32, padding: '16px 20px', background: '#FAFAFB', border: '1px solid #EAEAEA', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="file-check" style={{ width: 18, height: 18, color: '#7C3AED' }} />
              <span style={{ fontFamily: 'serif', fontSize: 14, color: '#000' }}>Technical Audit</span>
            </div>
            <div role="switch" aria-checked={auditOnly} tabIndex={0}
                 title="Only projects with a technical audit"
                 style={{ width: 44, height: 24, background: auditOnly ? '#7C3AED' : '#CBD5E1', borderRadius: 9999, position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                 onClick={() => setAuditOnly(on => !on)}
                 onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setAuditOnly(on => !on); } }}>
              <div style={{ width: 18, height: 18, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: 3, transition: 'transform 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transform: auditOnly ? 'translateX(20px)' : 'translateX(0)' }}></div>
            </div>
          </div>
          {hasFilters ? (
            <button type="button" className="btn-outline" style={{ width: '100%', marginTop: 16 }} onClick={clearFilters}>Clear filters</button>
          ) : null}
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
            <select className="filter-select" id="taskSort" style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10 }}
                    value={sort} onChange={e => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="budget-high">Budget: high to low</option>
              <option value="budget-low">Budget: low to high</option>
              <option value="deadline">Deadline: soonest</option>
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
