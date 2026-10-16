/**
 * LANNENT — Messages
 *
 * One conversation per person you work with on a project: a client with their
 * worker and their reviewers, a worker with their client and reviewers, a
 * reviewer with the client and worker of each project they review. Pick a
 * conversation on the left; read, send and share files on the right. New
 * messages are picked up every few seconds.
 *
 * Open a specific conversation with /messages?taskId=<id>&with=<userId>.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './Messages.css?raw';

const FALLBACK_COLOR = 'linear-gradient(135deg,#94a3b8,#64748b)';
const POLL_MS = 15000;
const ROLE_LABEL = { client: 'Client', worker: 'Worker', expert: 'Expert Reviewer' };
const ACCEPT = '.zip,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.svg,.webp,.txt,.md,.csv,.json';

const keyOf = (taskId, otherId) => `${taskId}::${otherId}`;

/** Everyone the signed-in user can talk to, per project. */
function buildConversations(Store, me) {
  const pairs = new Map();
  const add = (task, otherId) => {
    if (!task || !otherId || otherId === me.userId) return;
    pairs.set(keyOf(task.id, otherId), { task, otherId });
  };
  const reviewersOf = taskId => Store.getAuditRequests()
    .filter(a => a.taskId === taskId && a.expertId && !['declined', 'cancelled'].includes(a.status))
    .map(a => a.expertId);

  for (const t of Store.getTasks()) {
    if (me.role === 'client' && t.clientId === me.userId) {
      add(t, t.workerId);
      reviewersOf(t.id).forEach(id => add(t, id));
    } else if (me.role === 'worker' && t.workerId === me.userId) {
      add(t, t.clientId);
      reviewersOf(t.id).forEach(id => add(t, id));
    } else if (me.role === 'expert' && reviewersOf(t.id).includes(me.userId)) {
      add(t, t.clientId);
      add(t, t.workerId);
    }
  }
  // Anyone who has already written to you keeps their conversation.
  for (const m of Store.getMessagesByUser(me.userId)) {
    const otherId = m.senderId === me.userId ? m.receiverId : m.senderId;
    const task = Store.getTaskById(m.taskId);
    if (task) add(task, otherId);
  }

  return [...pairs.values()].map(({ task, otherId }) => {
    const other = Store.getUserById(otherId) || { name: 'Unknown user', avatar: '??', avatarColor: FALLBACK_COLOR };
    const msgs = Store.getMessagesByTask(task.id)
      .filter(m => (m.senderId === me.userId && m.receiverId === otherId) || (m.senderId === otherId && m.receiverId === me.userId))
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    const last = msgs[msgs.length - 1];
    return {
      key: keyOf(task.id, otherId),
      taskId: task.id,
      otherId,
      name: other.name,
      role: ROLE_LABEL[other.role] || '',
      avatar: other.avatar || '??',
      color: other.avatarColor || FALLBACK_COLOR,
      project: task.title,
      lastAt: last ? last.createdAt : '',
      lastMsg: last ? (last.content || `📎 ${last.attachment?.name || 'File'}`) : 'No messages yet',
      messages: msgs,
    };
  }).sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)) || a.name.localeCompare(b.name));
}

function fmtTime(iso) {
  const t = Date.parse(iso || '');
  if (isNaN(t)) return '';
  const d = new Date(t);
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Messages() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Messages — Lannent');
  const session = Auth.getCurrentUser();
  const [searchParams] = useSearchParams();
  const wanted = searchParams.get('taskId') && searchParams.get('with') ? keyOf(searchParams.get('taskId'), searchParams.get('with')) : null;
  const wantedTask = searchParams.get('taskId');

  const [conversations, setConversations] = useState(() => buildConversations(Store, session));
  const [activeKey, setActiveKey] = useState(() => {
    const list = buildConversations(Store, session);
    return (wanted && list.find(c => c.key === wanted)?.key)
      || (wantedTask && list.find(c => c.taskId === wantedTask)?.key)
      || list[0]?.key || null;
  });
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  // Pick up new messages while the page is open.
  useEffect(() => {
    const timer = setInterval(() => {
      Store.refreshMessages();
      setConversations(buildConversations(Store, session));
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [Store, session.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const convo = conversations.find(c => c.key === activeKey) || null;
  const messageCount = convo ? convo.messages.length : 0;
  useEffect(() => {
    if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [activeKey, messageCount]);

  if (!conversations.length) {
    return (
      <>
        <PageStyle css={pageCss} />
        <DashboardLayout role={session.role} activePath="/messages" pageTitle="Messages" pageSubtitle="">
          <div className="messages-wrap">
            <div className="empty-chat" style={{ width: '100%' }}>
              <Icon name="message-square-off" style={{ width: 48, height: 48, marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No conversations yet</div>
              <div style={{ fontSize: 13 }}>
                {session.role === 'expert'
                  ? 'Once you take on an audit or a dispute, you can talk to its client and worker here.'
                  : 'Once someone is hired on one of your projects, you can talk to them here.'}
              </div>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  const q = search.trim().toLowerCase();
  const listed = conversations.filter(c => !q || c.name.toLowerCase().includes(q) || c.project.toLowerCase().includes(q)
    || c.messages.some(m => (m.content || '').toLowerCase().includes(q)));

  function send(attachment) {
    const text = draft.trim();
    if (!convo || (!text && !attachment)) return;
    try {
      Store.sendMessage({ taskId: convo.taskId, receiverId: convo.otherId, content: text, attachment });
    } catch (e) {
      Validate.toast(e.message, 'error');
      return;
    }
    setDraft('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setConversations(buildConversations(Store, session));
  }

  async function attach(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !convo) return;
    setUploading(true);
    try {
      const ref = await Store.uploadFile(file, { taskId: convo.taskId, purpose: 'message' });
      send(ref);
    } catch (err) {
      Validate.toast(err.message || 'The file could not be uploaded.', 'error');
    } finally {
      setUploading(false);
    }
  }

  function onDraftInput(e) {
    setDraft(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  const workroom = session.role === 'worker' ? '/worker-workroom' : session.role === 'client' ? '/project-workroom' : null;

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={session.role} activePath="/messages" pageTitle="Messages" pageSubtitle="">
        <div className="messages-wrap">
          <div className="convos-list">
            <div className="convos-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Messages</span>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{`${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--input-bg)' }}>
                <Icon name="search" style={{ width: 14, height: 14, color: 'var(--muted-foreground)', flexShrink: 0 }} />
                <input type="text" placeholder="Search people, projects, messages..." value={search} onChange={e => setSearch(e.target.value)}
                       style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', flex: 1, color: 'var(--foreground)' }} />
              </div>
            </div>
            <div id="convosList">
              {!listed.length ? <div style={{ padding: 20, fontSize: 13, color: 'var(--muted-foreground)', textAlign: 'center' }}>No matches.</div> : null}
              {listed.map(c => (
                <div key={c.key} className={'conversation-item' + (c.key === activeKey ? ' active' : '')} onClick={() => setActiveKey(c.key)}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{c.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted-foreground)', flexShrink: 0 }}>{fmtTime(c.lastAt)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMsg}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', opacity: 0.8 }}>{[c.role, c.project].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-area">
            {convo ? <>
              <div className="chat-header-bar" id="chatHeader">
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: convo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>{convo.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}><Link to={`/profile?id=${convo.otherId}`} style={{ color: 'inherit' }}>{convo.name}</Link></div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{[convo.role, convo.project].filter(Boolean).join(' · ')}</div>
                </div>
                {workroom ? (
                  <Link to={`${workroom}?id=${convo.taskId}`} className="topnav-btn" title="Open the project workroom">
                    <Icon name="external-link" style={{ width: 16, height: 16 }} />
                  </Link>
                ) : null}
              </div>

              <div className="chat-body" id="chatBody" ref={chatBodyRef}>
                {!convo.messages.length ? (
                  <div className="empty-chat">
                    <Icon name="message-square" style={{ width: 36, height: 36, marginBottom: 8, opacity: 0.3 }} />
                    <div style={{ fontSize: 14 }}>No messages yet</div>
                    <div style={{ fontSize: 12 }}>Write the first one below.</div>
                  </div>
                ) : convo.messages.map(m => {
                  const mine = m.senderId === session.userId;
                  return (
                    <div key={m.id} className={mine ? 'msg-sent' : 'msg-received'}>
                      {!mine ? (
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: convo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{convo.avatar}</div>
                      ) : ''}
                      <div>
                        <div className={`bubble ${mine ? 'bubble-sent' : 'bubble-received'}`}>
                          {m.content}
                          {m.attachment ? (
                            <a href={Store.fileUrl(m.attachment)} download={m.attachment.name}
                               style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: m.content ? 6 : 0, color: mine ? '#fff' : '#4f46e5', textDecoration: 'underline', fontSize: 13 }}>
                              <Icon name="paperclip" style={{ width: 13, height: 13 }} />{m.attachment.name}
                            </a>
                          ) : null}
                        </div>
                        <div className="msg-time">{fmtTime(m.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="chat-footer">
                <button className="topnav-btn" title={uploading ? 'Uploading…' : 'Attach a file (PDF, image, Office document or zip, up to 10MB)'}
                        disabled={uploading} onClick={() => fileRef.current && fileRef.current.click()}>
                  <Icon name={uploading ? 'loader' : 'paperclip'} style={{ width: 16, height: 16 }} />
                </button>
                <input type="file" ref={fileRef} style={{ display: 'none' }} accept={ACCEPT} onChange={attach} />
                <textarea className="chat-textarea" id="chatInput" placeholder="Type a message..." rows="1" ref={inputRef}
                          value={draft} onChange={onDraftInput} maxLength={5000}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <button style={{ width: 40, height: 40, borderRadius: 12, background: '#6366f1', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} id="sendBtn" onClick={() => send()}>
                  <Icon name="send" style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </> : (
              <div className="empty-chat"><div style={{ fontSize: 14 }}>Choose a conversation.</div></div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
