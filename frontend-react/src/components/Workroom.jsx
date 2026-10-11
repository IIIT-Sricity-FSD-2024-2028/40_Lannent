/**
 * LANNENT — Workroom
 * The project workroom shared by front-end/pages/project-workroom.html
 * (client) and front-end/pages/worker-workroom.html (worker). The two pages
 * were the same apart from a few labels, links and which milestones are
 * listed, so those differences live in VARIANTS below.
 *
 * Shows the project summary, the project chat, the milestones awaiting
 * action, quick actions for the selected milestone, and the escrow status.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

const VARIANTS = {
  client: {
    defaultRole: 'client',
    myProjectsPath: '/client-my-projects',
    boardPath: '/project-milestone-board',
    pageTitle: 'Project Workroom',
    listTitle: 'Milestones Submitted for Review',
    listStatuses: ['review', 'disputed'],
    listEmpty: 'No submitted milestones for review.',
    listLabels: { review: 'Submitted for Review', disputed: 'Disputed' },
    noWorker: { name: 'Unassigned', avatar: 'UN', avatarColor: 'linear-gradient(135deg,#a855f7,#9333ea)' },
    action: { id: 'btnReviewDeliverable', icon: 'eye', label: 'Review Deliverable' },
    // The id has to travel in the URL. The review page reads its milestone
    // from the query string, so leaving it off sent the client to whichever
    // milestone the fallback scan happened to reach first — a different
    // submission than the one they picked, with someone else's files or
    // none at all.
    actionUrl: m => '/review-deliverable?milestoneId=' + encodeURIComponent(m.id) + '&role=client',
  },
  worker: {
    defaultRole: 'worker',
    myProjectsPath: '/worker-my-projects',
    boardPath: '/worker-milestone-board',
    pageTitle: 'Worker Workroom',
    listTitle: 'In Progress Milestones',
    listStatuses: ['inprogress'],
    listEmpty: 'No milestones currently in progress.',
    listLabels: { inprogress: 'In Progress', pending: 'Pending' },
    noWorker: { name: 'You', avatar: 'ME', avatarColor: 'linear-gradient(135deg,#10b981,#059669)' },
    action: { id: 'btnSubmitDeliverable', icon: 'upload', label: 'Submit Deliverable' },
    // The id has to travel in the URL. Without it the submit page had
    // nothing to attach the work to, and uploaded the files with no project
    // on them — so the client could neither see them nor open them.
    actionUrl: m => '/submit-deliverable?milestoneId=' + encodeURIComponent(m.id),
  },
};

const STATUS_COLORS = { completed: '#10b981', inprogress: '#6366f1', pending: '#94a3b8', review: '#f59e0b', disputed: '#ef4444' };
const STATUS_BGS = { completed: '#ecfdf5', inprogress: '#eef2ff', pending: '#f1f5f9', review: '#fffbeb', disputed: '#fef2f2' };
const ACTION_BUTTON_STYLE = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderRadius: 12, fontSize: 13 };
const CLIENT_COLOR = 'linear-gradient(135deg,#6366f1,#4f46e5)';
const WORKER_COLOR = 'linear-gradient(135deg,#10b981,#059669)';

function formatAmount(amount) {
  if (typeof amount === 'number') return '$' + amount.toLocaleString();
  if (typeof amount === 'string') return amount.startsWith('$') ? amount : '$' + amount;
  return '$0';
}

function normalizeStatus(status) {
  if (!status) return 'pending';
  if (status === 'submitted' || status === 'review') return 'review';
  if (status === 'in-progress') return 'inprogress';
  if (status === 'completed' || status === 'approved') return 'completed';
  if (status === 'disputed') return 'disputed';
  return status;
}

function statusLabel(status) {
  return status === 'review' ? 'Submitted for Review'
    : status === 'inprogress' ? 'In Progress'
    : status === 'completed' ? 'Completed'
    : status === 'disputed' ? 'Disputed'
    : status === 'pending' ? 'Pending'
    : status;
}

/** Small coloured toast in the bottom-right corner (this page's own variant). */
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  const bg = type === 'success' ? '#10b981' : type === 'warn' ? '#f59e0b' : '#ef4444';
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${bg};color:white;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:500;z-index:300;box-shadow:0 8px 24px rgba(0,0,0,0.2);`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

/**
 * The milestone list. If an earlier page left "milestonesData" in
 * localStorage, that list is shown instead (as the original did).
 */
function loadMilestones(Store, task) {
  let milestones = Store.getMilestonesByTask(task.id).map(m => ({
    id: m.id,
    title: m.title || 'Untitled Milestone',
    amount: formatAmount(m.budget || 0),
    status: normalizeStatus(m.status),
    statusLabel: statusLabel(normalizeStatus(m.status)),
  }));
  if (!milestones.length) {
    milestones = [{ id: 'none', title: 'No milestones available', amount: '$0', status: 'pending', statusLabel: 'Pending' }];
  }
  try {
    const stored = localStorage.getItem('milestonesData');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn('localStorage unavailable for milestonesData', e);
  }
  return milestones;
}

/** One chat bubble from the project's message history. */
function ChatMessage({ m, role }) {
  const isMe = (role === 'client' && m.sender === 'client') || (role === 'worker' && m.sender === 'worker');
  return (
    <div style={{ display: 'flex', ...(isMe ? { flexDirection: 'row-reverse' } : {}), gap: 10, maxWidth: '75%', ...(isMe ? { marginLeft: 'auto' } : {}) }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{m.avatar}</div>
      <div>
        <div style={{ padding: '10px 14px', borderRadius: 16, ...(isMe ? { background: '#6366f1', color: 'white', borderBottomRightRadius: 4 } : { background: 'var(--card)', border: '1px solid var(--border)', borderBottomLeftRadius: 4 }), fontSize: 14, lineHeight: 1.5 }}>
          {m.content}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4, ...(isMe ? { textAlign: 'right' } : {}) }}>{m.time}</div>
      </div>
    </div>
  );
}

/** A message sent from this page (added below the history, as before). */
function SentMessage({ m }) {
  const isClient = m.isClient;
  return (
    <div style={{ display: 'flex', flexDirection: isClient ? 'row-reverse' : 'row', gap: 10, maxWidth: '75%', ...(isClient ? { marginLeft: 'auto' } : {}) }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{m.avatar}</div>
      <div>
        <div style={{ padding: '10px 14px', borderRadius: 16, ...(isClient ? { background: '#6366f1', color: 'white', borderBottomRightRadius: 4 } : { background: 'var(--card)', border: '1px solid var(--border)', borderBottomLeftRadius: 4 }), fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4, ...(isClient ? { textAlign: 'right' } : {}) }}>Just now</div>
      </div>
    </div>
  );
}

/**
 * Everything the workroom shows about the project, read once when the page
 * opens (the original rendered it once; only new chat lines are added later).
 */
function buildView(Store, task, noWorker) {
  // Real escrow for this project. The card previously hardcoded
  // $4,500 released / $3,500 remaining / 56% for every project.
  const esc = Store.getEscrowForTask(task.id) || { projectHeld: 0 };
  const released = (Store.getTransactions() || [])
    .filter(t => t.type === 'milestone-release' && t.taskId === task.id)
    .reduce((sum, t) => sum + (t.grossAmount != null ? t.grossAmount : (t.amount || 0)), 0);
  const fundedTotal = released + (esc.projectHeld || 0);
  const money = n => '$' + Number(n || 0).toLocaleString();
  const escrowView = { released: money(released), held: money(esc.projectHeld), pct: fundedTotal > 0 ? Math.round((released / fundedTotal) * 100) : 0 };

  const client = Store.getUserById(task.clientId) || { name: 'Client', avatar: 'CL', avatarColor: 'linear-gradient(135deg,#94a3b8,#64748b)' };
  const worker = Store.getUserById(task.workerId) || noWorker;
  const taskMilestones = Store.getMilestonesByTask(task.id);

  const project = {
    name: task.title || 'Untitled Project',
    client: { name: client.name || 'Client', avatar: client.avatar || 'CL', color: client.avatarColor || CLIENT_COLOR },
    worker: { name: worker.name || 'Worker', avatar: worker.avatar || 'WK', color: worker.avatarColor || WORKER_COLOR },
    totalBudget: task.budget || 0,
    deadline: task.deadline || 'TBD',
    status: task.status ? task.status.replace(/-/g, ' ') : 'In Progress',
    milestonesCount: (task.milestonesCount || taskMilestones.length || 0),
    completedMilestones: taskMilestones.filter(m => m.status === 'completed' || m.status === 'approved').length || 0,
  };

  // Chat history (or a welcome line for a brand-new project)
  let initialMessages = Store.getMessagesByTask(task.id).map(m => ({
    id: m.id,
    sender: m.senderId === task.clientId ? 'client' : 'worker',
    avatar: m.senderAvatar || (m.senderId === task.clientId ? (client.avatar || 'CL') : (worker.avatar || 'WK')),
    color: m.senderAvatarColor || (m.senderId === task.clientId ? (client.avatarColor || CLIENT_COLOR) : (worker.avatarColor || WORKER_COLOR)),
    content: m.content,
    time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));
  if (!initialMessages.length) {
    initialMessages = [{ id: '1', sender: 'client', avatar: client.avatar || 'CL', color: client.avatarColor || CLIENT_COLOR, content: 'Welcome to the workspace for "' + project.name + '".', time: 'Just now' }];
  }

  return { escrowView, client, worker, project, initialMessages };
}

/**
 * @param {'client'|'worker'} variant - which workroom this is
 */
export default function Workroom({ variant }) {
  const Store = useStore();
  const Auth = useAuth();
  const cfg = VARIANTS[variant];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('id');

  // The viewer's role, remembered for the chat (as the original did on load)
  const [role] = useState(() => {
    const r = Auth.getCurrentUser()?.role || cfg.defaultRole;
    try { localStorage.setItem('userRole', r); } catch (err) { console.warn('localStorage unavailable, cannot set user role to', r); }
    return r;
  });

  const [task] = useState(() => (taskId ? Store.getTaskById(taskId) : null));
  const [milestones] = useState(() => (task ? loadMilestones(Store, task) : []));
  const [view] = useState(() => (task ? buildView(Store, task, cfg.noWorker) : null));
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState([]);   // messages sent from this page
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  // Keep the chat scrolled to the newest message
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [sent]);

  if (!task) {
    // Keep the dashboard shell — replacing document.body strands the user with no nav.
    return (
      <DashboardLayout role={variant} activePath={cfg.myProjectsPath} pageTitle="Workroom" pageSubtitle="No project selected">
        <div style={{ padding: '56px 24px', textAlign: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No project selected</div>
          <div style={{ color: 'var(--muted-foreground)', fontSize: 14, marginBottom: 18 }}>Open a workroom from one of your projects.</div>
          <Link to={cfg.myProjectsPath} className="btn-primary" style={{ textDecoration: 'none' }}>Go to My Projects</Link>
        </div>
      </DashboardLayout>
    );
  }

  const { escrowView, project, initialMessages } = view;

  const listed = milestones.filter(m => cfg.listStatuses.includes(m.status));
  const selected = milestones.find(m => m.id === selectedMilestoneId);

  function runAction() {
    if (!selectedMilestoneId) { showToast('Select a milestone first', 'warn'); return; }
    if (!selected) return;
    try {
      localStorage.setItem('selectedMilestone', JSON.stringify(selected));
    } catch (e) {
      console.warn('Could not set selectedMilestone in localStorage', e);
    }
    navigate(cfg.actionUrl(selected));
  }

  function raiseDisputeFromWorkroom() {
    if (!selectedMilestoneId) { showToast('Select a milestone first', 'warn'); return; }
    if (!selected) return;
    try {
      localStorage.setItem('disputeTargetMilestone', JSON.stringify(selected));
    } catch (e) {
      console.warn('Could not set disputeTargetMilestone in localStorage', e);
    }
    navigate('/dispute');
  }

  function sendWorkroomMsg() {
    const text = draft.trim();
    if (!text) return;
    const curRole = localStorage.getItem('userRole') || cfg.defaultRole;
    const isClient = curRole === 'client';
    const session = Auth.getCurrentUser();
    const senderId = isClient ? task.clientId : task.workerId;
    const receiverId = isClient ? task.workerId : task.clientId;
    const senderUser = senderId ? Store.getUserById(senderId) : null;

    // Persist to backend + auto-notification
    Store.sendMessage({
      taskId: task.id,
      senderId,
      receiverId,
      content: text,
      senderName: senderUser?.name || (session?.name || ''),
      senderAvatar: senderUser?.avatar || (session?.avatar || ''),
      senderAvatarColor: senderUser?.avatarColor || '',
    });

    setSent(list => [...list, {
      text,
      isClient,
      avatar: senderUser?.avatar || (isClient ? 'CL' : 'WK'),
      color: senderUser?.avatarColor || (isClient ? CLIENT_COLOR : WORKER_COLOR),
    }]);
    setDraft('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  }

  // Auto-grow the message box up to 120px
  function onDraftInput(e) {
    setDraft(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  const boardUrl = `${cfg.boardPath}?id=${task.id}`;
  const activePath = variant === 'worker' ? '/worker-my-projects' : (role === 'worker' ? '/worker-my-projects' : '/client-my-projects');

  return (
    <DashboardLayout role={role} activePath={activePath} pageTitle={cfg.pageTitle} pageSubtitle={project.name}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to={cfg.myProjectsPath} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--muted-foreground)', transition: 'color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--foreground)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
          <Icon name="arrow-left" style={{ width: 16, height: 16 }} />
          Back
        </Link>
        <span style={{ color: 'var(--border)' }}>›</span>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{project.name}</span>
        <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>{project.status}</span>
      </div>

      {/* Project summary strip */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <PersonChip label="Client" person={project.client} />
        <div style={{ width: 1, height: 30, background: 'var(--border)' }}></div>
        <PersonChip label="Worker" person={project.worker} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#10b981' }}>{`$${project.totalBudget.toLocaleString()}`}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Budget</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>{project.deadline}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Deadline</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>{`${project.completedMilestones}/${project.milestonesCount}`}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Milestones</div>
          </div>
        </div>
      </div>

      <div className="workroom-layout">
        {/* Chat Panel */}
        <div className="chat-panel">
          <div className="chat-panel-header">
            <Icon name="message-square" style={{ width: 18, height: 18, color: '#6366f1' }} />
            {' '}
            <span style={{ fontWeight: 600, fontSize: 14 }}>Project Workroom Chat</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#22c55e' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }}></div>
              Live
            </div>
          </div>

          <div className="chat-msgs" id="chatMsgs" ref={chatRef}>
            {initialMessages.map(m => <ChatMessage key={m.id} m={m} role={role} />)}
            {sent.map((m, i) => <SentMessage key={'sent' + i} m={m} />)}
          </div>

          <div className="chat-footer-bar">
            <button className="topnav-btn" title="Attach file" onClick={() => document.getElementById('fileInput').click()}>
              <Icon name="paperclip" style={{ width: 16, height: 16 }} />
            </button>
            {' '}
            <input type="file" id="fileInput" style={{ display: 'none' }} />
            {' '}
            <textarea id="workroomInput" placeholder="Type your message..." rows="1" ref={inputRef} value={draft} onChange={onDraftInput}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendWorkroomMsg(); } }}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--input-bg)', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none', minHeight: 40, maxHeight: 120 }} />
            {' '}
            <button id="workroomSend" onClick={sendWorkroomMsg} style={{ width: 40, height: 40, borderRadius: 12, background: '#6366f1', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Icon name="send" style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="workroom-sidebar">
          {/* Milestones */}
          <div className="sidebar-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>{cfg.listTitle}</h3>
              <Link to={boardUrl} style={{ fontSize: 12, color: '#6366f1', fontWeight: 500, textDecoration: 'none' }}>View Board →</Link>
            </div>
            <div id="milestonesSection">
              {!listed.length ? (
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{cfg.listEmpty}</div>
              ) : listed.map(m => (
                <div key={m.id} id={`milestoneRow-${m.id}`} className={'milestone-row' + (m.id === selectedMilestoneId ? ' selected' : '')}
                     style={{ cursor: 'pointer', padding: 10, borderRadius: 10, marginBottom: 8 }} onClick={() => setSelectedMilestoneId(m.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, maxWidth: '70%' }}>{m.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[m.status], background: STATUS_BGS[m.status], padding: '4px 10px', borderRadius: 9999, minWidth: 'fit-content' }}>
                      {m.statusLabel || cfg.listLabels[m.status] || (m.status || 'Unknown')}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 6 }}>{m.amount}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="sidebar-card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Quick Actions</h3>
            <button id={cfg.action.id} className={'btn-primary' + (selected ? '' : ' btn-disabled')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderRadius: 12, marginBottom: 8, fontSize: 13 }} onClick={runAction} disabled={!selected}>
              <Icon name={cfg.action.icon} style={{ width: 15, height: 15 }} />
              {cfg.action.label}
            </button>
            {' '}
            <Link to={boardUrl} className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderRadius: 12, marginBottom: 8, textDecoration: 'none', fontSize: 13 }}>
              <Icon name="layout" style={{ width: 15, height: 15 }} />
              Milestone Board
            </Link>
            {' '}
            <button id="btnRaiseDispute" className={'btn-outline' + (selected ? '' : ' btn-disabled')} style={ACTION_BUTTON_STYLE} onClick={raiseDisputeFromWorkroom} disabled={!selected}>
              <Icon name="alert-triangle" style={{ width: 15, height: 15, color: '#f59e0b' }} />
              Raise Dispute
            </button>
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted-foreground)' }}>
              Selected milestone: <strong id="selectedMilestoneTitle">{selected ? selected.title : 'None'}</strong>
            </div>
          </div>

          {/* Escrow */}
          <div className="sidebar-card" style={{ background: 'linear-gradient(145deg,#ecfdf5,#d1fae5)', borderColor: '#a7f3d0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#065f46' }}>Escrow Status</h3>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: '#065f46' }}>Released</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>{escrowView.released}</span>
              </div>
              <div style={{ height: 6, background: '#d1fae5', borderRadius: 3, overflow: 'hidden', margin: '8px 0' }}>
                <div style={{ width: `${escrowView.pct}%`, height: '100%', background: 'linear-gradient(90deg,#10b981,#34d399)' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#065f46' }}>Remaining</span>
                <span style={{ fontWeight: 700, color: '#6366f1' }}>{escrowView.held}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/** Avatar + "Client"/"Worker" label + name, in the summary strip. */
function PersonChip({ label, person }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: person.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>{person.avatar}</div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{person.name}</div>
      </div>
    </div>
  );
}
