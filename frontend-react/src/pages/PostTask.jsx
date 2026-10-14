/**
 * LANNENT — PostTask (Post a Task)
 * Converted from front-end/pages/post-task.html.
 *
 * The client describes a task, sets the budget, splits it into milestones
 * (which must add up to the budget exactly) and, optionally, asks for a
 * technical audit by a chosen Expert Reviewer (ExpertPicker).
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ExpertPicker from '../components/ExpertPicker';
import FieldError from '../components/FieldError';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useFieldErrors from '../hooks/useFieldErrors';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './PostTask.css?raw';

const skillSuggestions = ['React','TypeScript','Node.js','Web Design','JavaScript','Vue.js','Angular','Python','Django','FastAPI','Express.js','MongoDB','PostgreSQL','MySQL','AWS','Google Cloud','Azure','Docker','Kubernetes','Jenkins','CI/CD','Figma','Sketch','Adobe XD','UI Design','UX Design','Responsive Design','CSS','HTML','SASS','Tailwind','Bootstrap','Flutter','Dart','Swift','Kotlin','Java','C#','PHP','Laravel','Symfony','Ruby','Rails','GraphQL','REST API','OAuth','JWT','Authentication','Database Design','System Design','Machine Learning','TensorFlow','PyTorch','NLP','Computer Vision','Data Analysis','Pandas','NumPy','Matplotlib','Tableau','Power BI','Analytics','Git','GitHub','GitLab','Bitbucket','SVN','Linux','Unix','Windows','MacOS','Bash','Shell','PowerShell','Python Scripting','Automation','Testing','Jest','Mocha','Pytest','Selenium','QA','Manual Testing','Load Testing','Performance Testing','Security','Penetration Testing','Cybersecurity','SSL/TLS','Encryption','OWASP','API Security','Web Security','SEO','SEM','PPC','Content Marketing','Email Marketing','Social Media','Facebook Ads','Google Ads','Analytics','Google Analytics','Mixpanel','Amplitude','Product Management','Agile','Scrum','Kanban','Project Management','JIRA','Asana','Monday.com','Notion','Slack','Communication','Leadership','Team Management','Training','Documentation','Technical Writing','Copywriting','Content Strategy','Brand Strategy','User Research','Usability Testing','A/B Testing','Conversion Rate Optimization','Customer Support','Customer Success','Sales','Negotiation','Contract Negotiation','Legal','Compliance','GDPR','HIPAA','SOC 2','ISO','Quality Assurance','Code Review','Refactoring','Optimization','Performance Tuning','Caching','CDN','Load Balancing','Microservices','Serverless','Lambda','Cloud Functions','Firebase','Supabase','Sanity','Contentful','Headless CMS','Static Site Generation','Next.js','Gatsby','Hugo','Jekyll','WordPress','Shopify','WooCommerce','Magento','BigCommerce','E-commerce','Payment Processing','Stripe','PayPal','Square','Blockchain','Crypto','Web3','Smart Contracts','Solidity','Ethereum','Bitcoin','NFT','Virtual Reality','Augmented Reality','3D Modeling','Blender','Unity','Unreal Engine','Game Development','Level Design','Game Art','Sound Design','Music Production','Video Production','Video Editing','Adobe Creative Suite','Premiere','After Effects','Lighting','Photography','Motion Graphics','Animation','2D Animation','3D Animation','Rigging','Modeling','Texturing','Rendering','Visualization','Data Visualization','Infographics','Illustration','Vector Art','Iconography','Logo Design','Branding','Package Design','Print Design','Layout Design','Typography','Color Theory','Design Systems','Component Libraries','Accessibility','WCAG','Inclusive Design','Mobile First','Progressive Web Apps','Service Workers','Offline Support','Caching Strategies','State Management','Redux','MobX','Vuex','Context API','Hooks','Composition API','Async/Await','Promises','Callbacks','Error Handling','Logging','Monitoring','Sentry','Datadog','New Relic','APM','Observability','Telemetry','Event Tracking','User Tracking','Privacy','Analytics Privacy','GDPR Compliance','Data Privacy','Security Audit','Vulnerability Assessment','Bug Bounty','Incident Response','Disaster Recovery','Backup Strategy','Data Recovery','Version Control','Branching Strategies','Code Owners','Pull Requests','Code Reviews','Pair Programming','Mob Programming','Test-Driven Development','Behavior-Driven Development','Acceptance Testing','Integration Testing','Unit Testing','End-to-End Testing','Contract Testing','Snapshot Testing','Visual Regression Testing','Performance Testing','Load Testing','Stress Testing','Chaos Engineering','Infrastructure as Code','Terraform','Ansible','Puppet','Chef','Containers','Docker Compose','Orchestration','Kubernetes','OpenShift','AWS ECS','Cloud Deployment','CI/CD Pipeline','GitHub Actions','GitLab CI','CircleCI','Travis CI','Jenkins','Monitoring','Alerting','Logging','Log Aggregation','ELK Stack','Splunk','Cloudwatch','Metrics','Prometheus','Grafana','Cost Optimization','Resource Management','Scaling','Horizontal Scaling','Vertical Scaling','Caching Strategies','Database Optimization','Query Optimization','Index Optimization','Sharding','Partitioning','Replication','Backup','Disaster Recovery','Business Continuity','Incident Management','Change Management','Release Management','Deployment Strategy','Blue-Green Deployment','Canary Deployment','Rolling Deployment','Feature Flags','A/B Testing'];

const CATEGORIES = ['Web Development', 'Mobile Development', 'Backend / API', 'UI/UX Design', 'AI / Machine Learning', 'DevOps / Cloud'];
const EMPTY_MILESTONE = { title: '', description: '', budget: '', deadline: '' };
const NO_ERRORS = { msTitleErr: '', msDescErr: '', msBudgetErr: '', msDeadlineErr: '' };

// ── Inline SVG paths used by the original markup ──
const PATH_DOLLAR = 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
const PATH_CHECK_CIRCLE = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
const PATH_SHIELD_CHECK = 'M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z';
const PATH_CALENDAR = 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
const PATH_PLUS = 'M12 4v16m8-8H4';
const PATH_EDIT = 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
const PATH_X = 'M6 18L18 6M6 6l12 12';

/** A stroked 24×24 outline icon, as written inline in the original page. */
function Svg({ d, size, style }) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={size} height={size} style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d}></path>
    </svg>
  );
}

/** Required-field label: "Text *". The text and space stay one text node. */
function RequiredLabel({ children }) {
  return <label className="form-label">{children + ' '}<span className="required">*</span></label>;
}

/** One row of the "Project Summary" card. */
function SummaryItem({ kind, path, label, id, value }) {
  return (
    <div className={'summary-item ' + kind}>
      <div className={'summary-label ' + kind}>
        <Svg d={path} size="16" />
        {label}
      </div>
      <div className={'summary-value ' + kind} id={id}>{value}</div>
    </div>
  );
}

export default function PostTask() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Post New Task — Lannent');
  const navigate = useNavigate();
  const [session] = useState(() => Auth.getCurrentUser());
  const { errors, showError, clearError, errorStyle } = useFieldErrors();

  // ── Form state ──
  const [title, setTitle] = useState('');          // live value of the title input
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Web Development');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [suggestions, setSuggestions] = useState({ active: false, items: [], gen: 0 });
  const skillInputRef = useRef(null);
  const [auditEnabled, setAuditEnabled] = useState(false);
  const [auditFee, setAuditFee] = useState(300);
  const [auditExpertId, setAuditExpertId] = useState(null);

  // ── Milestones ──
  const [milestones, setMilestones] = useState([]);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState(EMPTY_MILESTONE);
  const [editingIndex, setEditingIndex] = useState(null);
  const [msErrors, setMsErrors] = useState(NO_ERRORS);
  /**
   * The original rebuilt the milestone list (and its inline form) only on
   * add / edit / remove / cancel / "Add Milestone". What it showed then —
   * the remaining budget, the pre-filled amount, the currency on the cards —
   * stayed until the next rebuild. `msView` is that snapshot; its `key`
   * remounts the form so its inputs start from the stored values again.
   */
  const [msView, setMsView] = useState({ key: 0, remaining: 0, currency: 'USD', count: 0 });

  // ── Budget helpers ──
  const milestoneTotal = milestones.reduce((sum, m) => sum + (parseFloat(m.budget) || 0), 0);
  const totalBudget = parseFloat(budget) || 0;

  /** validateTotalMatch – checks sum == total */
  function validateTotalMatch(list = milestones) {
    const mc = list.reduce((sum, m) => sum + (parseFloat(m.budget) || 0), 0);
    if (totalBudget <= 0) return { valid: false, status: 'no-budget', diff: 0 };
    if (mc > totalBudget) return { valid: false, status: 'exceeded', diff: mc - totalBudget };
    if (mc < totalBudget) return { valid: false, status: 'under', diff: totalBudget - mc };
    return { valid: true, status: 'matched', diff: 0 };
  }

  /** Rebuilds the milestone list from the given state (renderMilestones in the original). */
  function renderMilestones(list, editIdx) {
    const total = list.reduce((sum, m) => sum + (parseFloat(m.budget) || 0), 0);
    const remaining = totalBudget - total + (editIdx !== null ? parseFloat(list[editIdx]?.budget || 0) : 0);
    setMsView(v => ({ key: v.key + 1, remaining, currency, count: list.length }));
    setMsErrors(NO_ERRORS);
  }

  // ── Skills ──
  function renderSuggestions(input, skillList) {
    const filtered = skillSuggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !skillList.includes(s));
    // When hidden, the dropdown keeps its last items — only the "active" class goes.
    if (input && filtered.length > 0) setSuggestions(s => ({ ...s, active: true, items: filtered.slice(0, 8) }));
    else setSuggestions(s => ({ ...s, active: false }));
  }

  /**
   * The skill input also re-rendered the dropdown on its native "change"
   * event (fired on blur or Enter). Clicking a suggestion right after typing
   * blurs the input first, so the item under the pointer was replaced before
   * the click landed and the click was lost. Remounting the items (`gen`)
   * keeps that behaviour.
   */
  const onSkillChangeRef = useRef(null);
  onSkillChangeRef.current = value => {
    setSkillInput(value);
    setSuggestions(s => ({ ...s, gen: s.gen + 1 }));
    renderSuggestions(value, skills);
  };
  useEffect(() => {
    const input = skillInputRef.current;
    const onChange = e => onSkillChangeRef.current(e.target.value);
    input.addEventListener('change', onChange);
    return () => input.removeEventListener('change', onChange);
  }, []);

  function addSkill(skill) {
    const next = [...skills, skill];
    setSkills(next);
    // The input keeps its text; only the remembered value is reset.
    setSkillInput('');
    renderSuggestions('', next);
  }

  function handleAddSkill() {
    if (skillInput.trim() && !skills.includes(skillInput)) addSkill(skillInput);
  }

  function handleSelectSkillSuggestion(skill) {
    if (!skills.includes(skill)) addSkill(skill);
  }

  function handleRemoveSkill(idx) {
    const next = skills.filter((_, i) => i !== idx);
    setSkills(next);
    renderSuggestions(skillInput, next);
  }

  // ── Milestone actions ──
  const updateNew = (field, errKey) => e => {
    const value = e.target.value;
    setNewMilestone(nm => ({ ...nm, [field]: value }));
    setMsErrors(errs => ({ ...errs, [errKey]: '' }));
  };

  function openMilestoneForm() {
    setShowMilestoneForm(true);
    renderMilestones(milestones, editingIndex);
  }

  function handleAddMilestone() {
    const nm = newMilestone;
    const errs = { ...NO_ERRORS };

    if (!nm.title || nm.title.trim().length < 3) errs.msTitleErr = 'Title must be at least 3 characters';
    if (!nm.description || nm.description.trim().length < 3) errs.msDescErr = 'Description is required';

    const budgetVal = parseFloat(nm.budget) || 0;
    let budgetMsg = '';
    if (budgetVal <= 0) budgetMsg = 'Budget must be greater than 0';
    else if (totalBudget > 0 && budgetVal > totalBudget) budgetMsg = 'Milestone budget cannot exceed total budget';
    if (!nm.budget || budgetMsg) errs.msBudgetErr = budgetMsg || 'Budget is required';

    if (!nm.deadline) errs.msDeadlineErr = 'Deadline is required';
    else if (deadline && nm.deadline > deadline) errs.msDeadlineErr = `Must be on or before project deadline (${deadline})`;

    if (Object.values(errs).some(Boolean)) { setMsErrors(errs); return; }

    const next = editingIndex !== null
      ? milestones.map((m, i) => (i === editingIndex ? { ...nm } : m))
      : [...milestones, { ...nm }];
    setMilestones(next);
    setEditingIndex(null);
    setNewMilestone(EMPTY_MILESTONE);
    setShowMilestoneForm(false);
    renderMilestones(next, null);
  }

  function handleRemoveMilestone(idx) {
    const next = milestones.filter((_, i) => i !== idx);
    setMilestones(next);
    renderMilestones(next, editingIndex);
  }

  function handleEditMilestone(idx) {
    setEditingIndex(idx);
    setNewMilestone({ ...milestones[idx] });
    setShowMilestoneForm(true);
    renderMilestones(milestones, idx);
  }

  function cancelMilestone() {
    setShowMilestoneForm(false);
    setEditingIndex(null);
    setNewMilestone(EMPTY_MILESTONE);
    renderMilestones(milestones, null);
  }

  // ── Audit ──
  function toggleAudit() {
    if (auditEnabled) setAuditExpertId(null);
    setAuditEnabled(!auditEnabled);
  }

  // ── Summary ──
  function getDaysUntilDeadline() {
    if (!deadline) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dl = new Date(deadline);
    dl.setHours(0, 0, 0, 0);
    return Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
  }
  const days = getDaysUntilDeadline();
  const summaryBudget = parseFloat(budget || 0);

  let auditSummary = 'Disabled';
  if (auditEnabled) {
    const rev = auditExpertId ? Store.getUserById(auditExpertId) : null;
    auditSummary = rev ? `${rev.name.split(' ')[0]} · ${currency} ${(auditFee || 0).toLocaleString()}` : 'Select a reviewer';
  }

  const walletUser = Store.getUserById(session?.userId || 'u1');
  const walletBalance = walletUser?.walletBalance || 0;
  const insufficient = totalBudget > walletBalance;

  // Enable/disable Publish in real time. An audited project cannot be
  // published without a named reviewer.
  const auditReady = !auditEnabled || !!auditExpertId;
  const ready = title.trim().length >= 5 && description.trim().length >= 5 && totalBudget > 0 &&
                milestones.length > 0 && validateTotalMatch().valid && auditReady;

  // ── Publish ──
  function validateTaskForm() {
    const t = title.trim();
    const desc = description.trim();
    let valid = true;

    if (!t) { showError('taskTitleInput', 'Task title is required.'); valid = false; }
    else if (t.length < 5) { showError('taskTitleInput', 'Title must be at least 5 characters.'); valid = false; }
    else clearError('taskTitleInput');

    if (!desc || desc.length < 5) { Validate.toast('Description is required.', 'error'); valid = false; }
    if (!budget || parseFloat(budget) <= 0) { Validate.toast('Please enter a valid budget greater than 0.', 'error'); valid = false; }
    if (milestones.length === 0) { Validate.toast('Please add at least one milestone before publishing.', 'error'); valid = false; }

    // ── Strict budget match check ──
    const { valid: budgetMatched, status } = validateTotalMatch();
    if (milestones.length > 0 && !budgetMatched) {
      if (status === 'exceeded') Validate.toast('Total milestone budget exceeds total budget. Adjust milestones.', 'error');
      else if (status === 'under') Validate.toast('Total milestone budget must equal total budget. Allocate remaining funds.', 'error');
      valid = false;
    }
    return valid;
  }

  function publishTask() {
    if (!validateTaskForm()) return;

    const clientId = session?.userId || 'u1';
    const amount = parseFloat(budget);

    // Check wallet balance
    const user = Store.getUserById(clientId);
    if (!user) { Validate.toast('User not found. Please log in again.', 'error'); return; }
    if (user.walletBalance < amount) {
      Validate.toast(`Insufficient balance! You have $${user.walletBalance.toLocaleString()} but need $${amount.toLocaleString()}.`, 'error');
      return;
    }

    // Create task
    const task = Store.createTask({
      title: title,
      category,
      description: description.trim(),
      skills,
      deadline,
      budget: amount,
      currency,
      auditEnabled,
      auditFee: auditEnabled ? (auditFee || undefined) : undefined,
      auditDomain: auditEnabled ? category : undefined,
      auditExpertId: auditEnabled ? auditExpertId : undefined,
      clientId,
      status: 'open',
    });

    // Create milestones
    milestones.forEach(m => {
      // workerId stays null: nobody is hired yet. Setting it to the client
      // made the milestone payable to the client, so approving a deliverable
      // released escrow back to them instead of to the hired worker. The
      // worker is backfilled onto these milestones when they are hired.
      Store.createMilestone({ taskId: task.id, title: m.title, description: m.description, budget: parseFloat(m.budget), deadline: m.deadline, workerId: null });
    });

    // No money moves here. Project escrow is funded when a worker is hired,
    // and the audit fee is funded once you and the reviewer agree a price.
    if (auditEnabled) {
      Validate.toast('Project saved as a draft. It goes live once a reviewer accepts your audit.', 'success');
      setTimeout(() => { navigate('/client-audit-offers'); }, 1400);
    } else {
      Validate.toast('Task published successfully.', 'success');
      setTimeout(() => { navigate('/client-my-projects'); }, 1200);
    }
  }

  function saveDraft() {
    if (!title.trim()) { showError('taskTitleInput', 'Task title is required to save draft.'); return; }
    Validate.toast('Draft saved successfully.', 'info');
  }

  // ── Budget check box ──
  let budgetCheck = null;
  if (!(totalBudget <= 0 && milestones.length === 0)) {
    const { valid: matched, status, diff } = validateTotalMatch();
    const pct = totalBudget > 0 ? Math.min((milestoneTotal / totalBudget) * 100, 100) : 0;
    const exceeded = status === 'exceeded';
    const barClass = matched ? 'ok' : exceeded ? 'over' : 'warn';
    const boxClass = matched ? 'ok' : exceeded ? 'exceeded' : 'warn';
    let icon, message;
    if (matched) {
      icon = '✅'; message = 'Budget perfectly allocated across all milestones.';
    } else if (exceeded) {
      icon = '🔴'; message = `Total milestone budget exceeds total budget by ${currency} ${diff.toLocaleString()}. Remove or reduce milestones.`;
    } else {
      icon = '⚠️'; message = `Total milestone budget must equal total budget. ${currency} ${diff.toLocaleString()} remaining to allocate.`;
    }
    budgetCheck = (
      <div className={`budget-check ${boxClass}`}>
        <div className="budget-bar"><div className={`budget-bar-fill ${barClass}`} style={{ width: `${Math.min(pct, 100)}%` }}></div></div>
        <div className="budget-check-item">
          <span>Milestone total:</span>
          {' '}
          <strong>{`${currency} ${milestoneTotal.toLocaleString()}`}</strong>
        </div>
        <div className="budget-check-item">
          <span>Project Budget:</span>
          {' '}
          <strong>{`${currency} ${totalBudget.toLocaleString()}`}</strong>
        </div>
        <div className="budget-check-item budget-check-divider">
          <span>{matched ? '✓ Fully allocated' : exceeded ? '✗ Over budget' : 'Remaining'}</span>
          {' '}
          <strong>{`${currency} ${Math.abs(diff).toLocaleString()}`}</strong>
        </div>
        <div className="budget-check-warning">
          <span style={{ flexShrink: 0 }}>{icon}</span>
          <p>{message}</p>
        </div>
      </div>
    );
  }

  const editing = editingIndex !== null;
  const { remaining } = msView;
  const walletKind = insufficient ? 'audit' : 'milestones';

  /** One input of the inline milestone form plus its error line. */
  const msField = (errKey, input) => (
    <>
      {input}
      <div className={'field-error' + (msErrors[errKey] ? ' show' : '')} id={errKey}>{msErrors[errKey]}</div>
    </>
  );
  const errClass = key => 'form-input' + (msErrors[key] ? ' has-error' : '');

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="client" activePath="/post-task" pageTitle="Post a Task" pageSubtitle="Create and publish a new freelance task">
        <div className="post-container">
          <div>
            <div className="section-card">
              <h2>Basic Information</h2>
              <div className="form-group">
                <RequiredLabel>Task Title</RequiredLabel>
                <input type="text" className="form-input" id="taskTitleInput" placeholder="e.g. E-commerce Website Redesign"
                       style={errorStyle('taskTitleInput')}
                       onInput={e => { setTitle(e.target.value); clearError('taskTitleInput'); }} />
                <FieldError id="taskTitleInput" message={errors.taskTitleInput} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <RequiredLabel>Description</RequiredLabel>
                <textarea className="form-textarea" rows="5" placeholder="Describe what you need done, goals, and requirements..."
                          onInput={e => setDescription(e.target.value)}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input type="date" className="form-input" onChange={e => setDeadline(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Required Skills</label>
                <div style={{ position: 'relative' }}>
                  <input ref={skillInputRef} type="text" className="form-input" id="skillInput" placeholder="Start typing to add skills..."
                         onInput={e => { setSkillInput(e.target.value); renderSuggestions(e.target.value, skills); }}
                         onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }} />
                  <div className={'suggestion-dropdown' + (suggestions.active ? ' active' : '')} id="skillSuggestions">
                    {suggestions.items.map(s => (
                      <div key={suggestions.gen + s} className="suggestion-item" onClick={() => handleSelectSkillSuggestion(s)}>{s}</div>
                    ))}
                  </div>
                </div>
                <div className="skills-container" id="skillsContainer">
                  {skills.map((skill, idx) => (
                    <div className="skill-tag" key={skill}>
                      <span>{skill}</span>
                      {' '}
                      <button type="button" onClick={() => handleRemoveSkill(idx)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="section-card budget-escrow">
              <h2>Budget & Escrow</h2>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <RequiredLabel>Total Budget</RequiredLabel>
                  <div style={{ position: 'relative' }}>
                    <Icon name="dollar-sign" className="input-icon" />
                    <input type="number" className="form-input with-icon" defaultValue="" placeholder="5000" onInput={e => setBudget(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div className="audit-toggle">
                <div className="audit-info">
                  <div className="audit-label">
                    <Svg d={PATH_SHIELD_CHECK} size="16" />
                    Technical Audit
                  </div>
                  <div className="audit-desc">Hire an Expert Reviewer to audit this project. Your project stays a draft until a reviewer accepts.</div>
                </div>
                <button className={'toggle-switch ' + (auditEnabled ? 'on' : 'off')} type="button" onClick={toggleAudit}>
                  <div className="toggle-switch-thumb"></div>
                </button>
              </div>
              <div id="auditPanel" style={{ display: auditEnabled ? 'block' : 'none', marginTop: 16, padding: 18, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--secondary)' }}>
                <label className="form-label" htmlFor="auditFeeInput" style={{ display: 'block', marginBottom: 6 }}>Your opening offer for the audit</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: 'var(--muted-foreground)' }}>$</span>
                  <input id="auditFeeInput" className="form-input" type="number" min="1" step="1" style={{ maxWidth: 180 }} placeholder="300"
                         defaultValue="300" onInput={e => setAuditFee(parseFloat(e.target.value) || 0)} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 14 }}>
                  Reviewers can accept this or counter with their own price. Nothing is charged until you both agree.
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Choose your Expert Reviewer</div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>
                  Only reviewers who cover this category are shown. Your project stays a draft until they accept,
                  and only they can see its audit.
                </div>
                <div id="auditExpertList">
                  {/* Reviewers covering this category. The client must pick exactly one. */}
                  <ExpertPicker category={category} selectedId={auditExpertId} onChange={setAuditExpertId} />
                </div>
              </div>
            </div>

            <div className="section-card">
              <h2>Milestones</h2>
              <div id="milestonesContainer">
                {!showMilestoneForm && milestones.length === 0 ? (
                  <div className="empty-state">
                    <Svg d={PATH_CHECK_CIRCLE} />
                    <p>No milestones added yet. Click below to add one.</p>
                  </div>
                ) : null}

                {showMilestoneForm ? (
                  <div className="milestone-form" key={msView.key}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {`${editing ? '✏️ Edit' : '➕ Add'} Milestone`}
                      {remaining > 0 ? <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 400, color: 'var(--muted-foreground)' }}>Remaining: <strong style={{ color: '#16a34a' }}>{msView.currency + ' ' + remaining.toLocaleString()}</strong></span> : ''}
                    </div>
                    <div className="form-group">
                      <RequiredLabel>Milestone Title</RequiredLabel>
                      {msField('msTitleErr', <input type="text" className={errClass('msTitleErr')} id="newMilestoneTitle" defaultValue={newMilestone.title} onInput={updateNew('title', 'msTitleErr')} placeholder="e.g. Design Phase" />)}
                    </div>
                    <div className="form-group">
                      <RequiredLabel>Description</RequiredLabel>
                      {msField('msDescErr', <textarea className={errClass('msDescErr')} id="newMilestoneDesc" rows="3" defaultValue={newMilestone.description} onInput={updateNew('description', 'msDescErr')} placeholder="What's the deliverable?"></textarea>)}
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <RequiredLabel>Budget</RequiredLabel>
                        {/* The pre-filled remaining amount is only shown — it is not stored until the field is edited */}
                        {msField('msBudgetErr', <input type="number" className={errClass('msBudgetErr')} id="newMilestoneBudget" defaultValue={newMilestone.budget || (remaining > 0 && msView.count > 0 ? remaining : '')} onInput={updateNew('budget', 'msBudgetErr')} placeholder={remaining > 0 ? String(remaining) : 'Amount'} min="1" />)}
                      </div>
                      <div className="form-group">
                        <RequiredLabel>Deadline</RequiredLabel>
                        {msField('msDeadlineErr', <input type="date" className={errClass('msDeadlineErr')} id="newMilestoneDeadline" defaultValue={newMilestone.deadline} onInput={updateNew('deadline', 'msDeadlineErr')} />)}
                      </div>
                    </div>
                    <div className="milestone-form-actions">
                      <button className="save" type="button" onClick={handleAddMilestone}>{`${editing ? 'Update' : 'Save'} Milestone`}</button>
                      {' '}
                      <button className="cancel" type="button" onClick={cancelMilestone}>Cancel</button>
                    </div>
                  </div>
                ) : null}

                {milestones.map((m, idx) => (
                  <div className="milestone-card" key={idx}>
                    <div className="milestone-content">
                      <div className="milestone-title">
                        <div className="milestone-index">{idx + 1}</div>
                        <h3>{m.title}</h3>
                      </div>
                      <div className="milestone-desc">{m.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 32 }}>
                        <div className="milestone-budget">
                          <Svg d={PATH_DOLLAR} />
                          {`${msView.currency} ${parseFloat(m.budget).toLocaleString()}`}
                        </div>
                        {m.deadline ? <span style={{ fontSize: 12, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>{`📅 ${m.deadline}`}</span> : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="milestone-delete" type="button" title="Edit" onClick={() => handleEditMilestone(idx)}>
                        <Svg d={PATH_EDIT} style={{ width: 14, height: 14 }} />
                      </button>
                      <button className="milestone-delete" type="button" title="Remove" onClick={() => handleRemoveMilestone(idx)}>
                        <Svg d={PATH_X} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Rendered once with the page, so it stays visible even while the form is open */}
              <button className="add-milestone-btn" type="button" onClick={openMilestoneForm}>
                <Svg d={PATH_PLUS} size="16" />
                Add Milestone
              </button>
            </div>

            <div className="action-buttons">
              <button type="button" className="save-draft" onClick={saveDraft}>Save Draft</button>
              {' '}
              <button type="button" className="publish" id="publishBtn" disabled={!ready} onClick={publishTask}>Publish Task</button>
            </div>
          </div>

          <div className="post-sidebar">
            <div className="sidebar-card">
              <h3>Project Summary</h3>

              <SummaryItem kind="budget" path={PATH_DOLLAR} label="Budget" id="summarySummaryBudget" value={`${currency} ${isNaN(summaryBudget) ? 0 : summaryBudget.toLocaleString()}`} />
              <SummaryItem kind="milestones" path={PATH_CHECK_CIRCLE} label="Milestones" id="summaryMilestones" value={`${milestones.length}`} />
              <SummaryItem kind="deadline" path={PATH_CALENDAR} label="Deadline" id="summaryDeadline" value={deadline ? `${days} day${days === 1 ? '' : 's'}` : 'Not set'} />
              {/* The "enabled" class was only decided when the page first rendered (audit off), so it never appears */}
              <SummaryItem kind="audit " path={PATH_SHIELD_CHECK} label="Audit" id="summaryAudit" value={auditSummary} />

              <div id="budgetCheckContainer">{budgetCheck}</div>
              <div id="walletCheckSummary">
                <div className={`summary-item ${walletKind}`} style={{ marginTop: 12 }}>
                  <div className={`summary-label ${walletKind}`}>
                    <Svg d={PATH_DOLLAR} size="16" />
                    Wallet Balance
                  </div>
                  <div className={`summary-value ${walletKind}`} style={{ color: insufficient ? '#dc2626' : '#10b981', fontSize: 16 }}>{`${currency} ${walletBalance.toLocaleString()}`}</div>
                  {insufficient ? <div style={{ fontSize: 11, marginTop: 6, color: '#991b1b' }}>Insufficient balance. Add funds to proceed.</div> : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
