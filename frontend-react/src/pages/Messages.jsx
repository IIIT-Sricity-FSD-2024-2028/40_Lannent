/**
 * LANNENT — Messages
 * Converted from front-end/pages/messages.html.
 *
 * One conversation per project the user shares with someone (client ↔ worker).
 * Pick a conversation on the left; read and send messages on the right.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './Messages.css?raw';

const FALLBACK_COLOR = 'linear-gradient(135deg,#94a3b8,#64748b)';

/**
 * Builds the conversations from real project data:
 * clients talk to the workers on their projects, workers to their clients.
 */
function buildConversations(Store, session) {
  const currentUserId = session?.userId || '';
  const currentRole = session?.role || 'client';
  const myTasks = Store.getTasks().filter(t => {
    if (currentRole === 'client') return t.clientId === currentUserId && t.workerId;
    if (currentRole === 'worker') return t.workerId === currentUserId && t.clientId;
    return false;
  });

  return myTasks.map(task => {
    const otherId = currentRole === 'client' ? task.workerId : task.clientId;
    const otherUser = Store.getUserById(otherId) || { name: 'Unknown', avatar: '??', avatarColor: FALLBACK_COLOR };
    const msgs = Store.getMessagesByTask(task.id).map(m => ({
      from: m.senderId === currentUserId ? 'me' : 'them',
      text: m.content,
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
    const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;

    return {
      taskId: task.id,
      otherId,
      name: otherUser.name,
      avatar: otherUser.avatar || '??',
      color: otherUser.avatarColor || FALLBACK_COLOR,
      project: task.title,
      lastMsg: lastMsg ? lastMsg.text : 'No messages yet',
      time: lastMsg ? lastMsg.time : '',
      unread: 0,
      online: true,
      messages: msgs,
    };
  });
}

/** The message bubbles of one conversation (or its empty state). */
function ChatMessages({ convo }) {
  if (!convo.messages.length) {
    return (
      <div className="empty-chat">
        <Icon name="message-square" style={{ width: 36, height: 36, marginBottom: 8, opacity: 0.3 }} />
        <div style={{ fontSize: 14 }}>No messages yet</div>
        <div style={{ fontSize: 12 }}>
          Send a message from the <Link to={`/project-workroom?id=${convo.taskId}`} style={{ color: '#6366f1' }}>project workroom</Link>.
        </div>
      </div>
    );
  }
  return convo.messages.map((m, i) => (
    <div key={i} className={m.from === 'me' ? 'msg-sent' : 'msg-received'}>
      {m.from === 'them' ? (
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: convo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{convo.avatar}</div>
      ) : ''}
      <div>
        <div className={`bubble ${m.from === 'me' ? 'bubble-sent' : 'bubble-received'}`}>{m.text}</div>
        <div className="msg-time">{m.time}</div>
      </div>
    </div>
  ));
}

export default function Messages() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Messages — Lannent');
  const session = Auth.getCurrentUser();
  const currentRole = session?.role || 'client';

  const [conversations, setConversations] = useState(() => buildConversations(Store, session));
  const [activeConvoIdx, setActiveConvoIdx] = useState(0);
  const [switched, setSwitched] = useState(false);   // the header is rebuilt once another conversation is picked
  const [draft, setDraft] = useState('');
  // Messages shown in the chat body: the conversation as it was when it was
  // opened, plus whatever has been sent since (appended below, as before —
  // even under the "No messages yet" note).
  const [shownMessages, setShownMessages] = useState(() => (conversations[0] ? conversations[0].messages : []));
  const [sentSinceOpen, setSentSinceOpen] = useState([]);
  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);
  const scrollToBottom = useRef(true);                // scroll the chat after the next render

  useEffect(() => {
    if (scrollToBottom.current && chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
    scrollToBottom.current = false;
  });

  // If no conversations, show empty state
  if (!conversations.length) {
    return (
      <>
        <PageStyle css={pageCss} />
        <DashboardLayout role={currentRole} activePath="/messages" pageTitle="Messages" pageSubtitle="">
          <div className="messages-wrap">
            <div className="empty-chat" style={{ width: '100%' }}>
              <Icon name="message-square-off" style={{ width: 48, height: 48, marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No conversations yet</div>
              <div style={{ fontSize: 13 }}>Messages from your project workrooms will appear here.</div>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  const convo = conversations[activeConvoIdx];

  function selectConvo(idx) {
    setActiveConvoIdx(idx);
    setSwitched(true);
    setShownMessages(conversations[idx].messages);
    setSentSinceOpen([]);
    scrollToBottom.current = conversations[idx].messages.length > 0;
  }

  function sendMsg() {
    const text = draft.trim();
    if (!text || !convo) return;

    // Persist via Store (also generates notification)
    Store.sendMessage({
      taskId: convo.taskId,
      senderId: session?.userId || '',
      receiverId: convo.otherId,
      content: text,
      senderName: session?.name || '',
      senderAvatar: session?.avatar || '',
      senderAvatarColor: session?.avatarColor || '',
    });

    // Add to the local conversation (the list on the left keeps its old preview, as before)
    const sent = { from: 'me', text, time: 'Just now' };
    setConversations(list => list.map((c, i) => (i === activeConvoIdx ? { ...c, messages: [...c.messages, sent] } : c)));
    setSentSinceOpen(list => [...list, sent]);
    setDraft('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    scrollToBottom.current = true;
  }

  // Auto-grow the message box up to 120px
  function onDraftInput(e) {
    setDraft(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={currentRole} activePath="/messages" pageTitle="Messages" pageSubtitle="">
        <div className="messages-wrap">
          {/* Conversations list */}
          <div className="convos-list">
            <div className="convos-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Messages</span>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{`${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--input-bg)' }}>
                <Icon name="search" style={{ width: 14, height: 14, color: 'var(--muted-foreground)', flexShrink: 0 }} />
                <input type="text" placeholder="Search messages..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', flex: 1, color: 'var(--foreground)' }} />
              </div>
            </div>
            <div id="convosList">
              {conversations.map((c, i) => (
                <div key={c.taskId} className={'conversation-item' + (i === activeConvoIdx ? ' active' : '')} onClick={() => selectConvo(i)}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{c.avatar}</div>
                    {c.online ? <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid white' }}></div> : ''}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{c.time}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMsg}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', opacity: 0.7 }}>{c.project}</div>
                  </div>
                  {c.unread ? <div style={{ minWidth: 20, height: 20, borderRadius: 10, background: '#6366f1', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{c.unread}</div> : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="chat-area">
            <div className="chat-header-bar" id="chatHeader">
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: convo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>{convo.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }} id={switched ? undefined : 'chatName'}>{convo.name}</div>
                <div style={{ fontSize: 12, color: !switched || convo.online ? '#22c55e' : 'var(--muted-foreground)' }}>
                  {`${!switched || convo.online ? '● Online' : '● Offline'} · ${convo.project}`}
                </div>
              </div>
              <Link to={`/project-workroom?id=${convo.taskId}`} className="topnav-btn" title="Open Workroom" id={switched ? undefined : 'workroomLink'}>
                <Icon name="external-link" style={{ width: 16, height: 16 }} />
              </Link>
            </div>

            <div className="chat-body" id="chatBody" ref={chatBodyRef}>
              <ChatMessages convo={{ ...convo, messages: shownMessages }} />
              {sentSinceOpen.map((m, i) => (
                <div key={'sent' + i} className="msg-sent">
                  <div>
                    <div className="bubble bubble-sent">{m.text}</div>
                    <div className="msg-time">Just now</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="chat-footer">
              <button className="topnav-btn" title="Attach file"><Icon name="paperclip" style={{ width: 16, height: 16 }} /></button>
              <textarea className="chat-textarea" id="chatInput" placeholder="Type a message..." rows="1" ref={inputRef}
                        value={draft} onChange={onDraftInput}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }} />
              <button style={{ width: 40, height: 40, borderRadius: 12, background: '#6366f1', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} id="sendBtn" onClick={sendMsg}>
                <Icon name="send" style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
