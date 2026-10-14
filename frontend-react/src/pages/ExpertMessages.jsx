/**
 * LANNENT — ExpertMessages
 * Converted from front-end/pages/expert-messages.html.
 *
 * The Expert Reviewer's inbox: conversations with clients, workers and the
 * platform (demo data held in the page, as in the original), a filter by
 * party, a search box and a chat panel with a composer.
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ExpertMessages.css?raw';

/* ─────────────────────────────────────
   Conversation data for Expert Reviewer
───────────────────────────────────── */
const CONVERSATIONS = [
  {
    id: 1,
    name: 'James Client',
    avatar: 'JC',
    color: 'linear-gradient(135deg,#ef4444,#dc2626)',
    role: 'Client',
    tag: 'client',
    tagLabel: 'Client',
    caseRef: 'E-commerce Platform Redesign',
    caseId: 'AUD-2026-001',
    lastMsg: 'Thank you for the thorough report, much appreciated.',
    time: '5m ago',
    unread: 2,
    online: true,
    messages: [
      { from: 'them', text: 'Hi Dr. Smith, I wanted to flag some concerns about the Frontend Development milestone before your review.', time: '9:10 AM' },
      { from: 'me', text: 'Of course, go ahead. I\'m currently reviewing the submitted files.', time: '9:14 AM' },
      { from: 'them', text: 'Specifically, the checkout flow doesn\'t match the design specs we agreed on. The button placement is different.', time: '9:16 AM' },
      { from: 'me', text: 'I\'ve noted that. I\'ll compare the submitted Figma files against the original brief and include my findings in the report.', time: '9:20 AM' },
      { from: 'them', text: 'There are also some performance concerns — the product grid is very slow on mobile.', time: '9:21 AM' },
      { from: 'me', text: 'Understood. Performance assessment is included in my audit scope. I\'ll run a Lighthouse check on the provided prototype.', time: '9:24 AM' },
      { from: 'them', text: 'Thank you for the thorough report, much appreciated.', time: '9:50 AM' },
    ],
  },
  {
    id: 2,
    name: 'Sarah Chen',
    avatar: 'SC',
    color: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    role: 'Gig Worker',
    tag: 'worker',
    tagLabel: 'Worker',
    caseRef: 'E-commerce Platform Redesign',
    caseId: 'AUD-2026-001',
    lastMsg: 'I\'ll send the updated accessibility fixes by tonight.',
    time: '32m ago',
    unread: 1,
    online: true,
    messages: [
      { from: 'them', text: 'Hello Dr. Smith! I saw the audit report was published. I wanted to clarify something about the ARIA labels finding.', time: '10:05 AM' },
      { from: 'me', text: 'Hi Sarah, sure — what would you like to clarify?', time: '10:08 AM' },
      { from: 'them', text: 'The carousel buttons do have aria-labels in the component file — they might not have been picked up because the build step strips comments. Can I share the source?', time: '10:10 AM' },
      { from: 'me', text: 'Yes please share the source file. If the labels are present in the production build, I can issue an amended finding.', time: '10:13 AM' },
      { from: 'them', text: 'Here\'s the component file:', time: '10:14 AM', attachment: { name: 'ProductCarousel.tsx', size: '12 KB', icon: 'file-code', iconColor: '#6366f1', iconBg: '#eef2ff' } },
      { from: 'me', text: 'Reviewed — you\'re right, the labels are in the source. The issue is that the Storybook preview I was given doesn\'t reflect the production build. I\'ll update the finding to a suggestion.', time: '10:22 AM' },
      { from: 'them', text: 'I\'ll send the updated accessibility fixes by tonight.', time: '10:25 AM' },
    ],
  },
  {
    id: 3,
    name: 'TechCorp Inc.',
    avatar: 'TC',
    color: 'linear-gradient(135deg,#f59e0b,#d97706)',
    role: 'Client',
    tag: 'client',
    tagLabel: 'Client',
    caseRef: 'E-learning Platform · Dispute',
    caseId: 'DSP-2026-002',
    lastMsg: 'We\'ll wait for the resubmission then.',
    time: '2h ago',
    unread: 0,
    online: false,
    messages: [
      { from: 'them', text: 'Dr. Smith, has the expert review started on our dispute case yet? Case DSP-2026-002.', time: 'Yesterday, 3:00 PM' },
      { from: 'me', text: 'Yes, I\'ve been assigned to your case and have reviewed all submitted files and load test reports.', time: 'Yesterday, 3:15 PM' },
      { from: 'them', text: 'The performance results are clear — 2,340ms is far above the 500ms threshold we agreed on.', time: 'Yesterday, 3:18 PM' },
      { from: 'me', text: 'The contract clause is clear on that point. However, the worker has raised a valid counter-point about cold-start conditions and the Redis caching layer not being deployed in the test environment.', time: 'Yesterday, 3:25 PM' },
      { from: 'them', text: 'We ran the tests exactly as the architecture doc specified.', time: 'Yesterday, 3:27 PM' },
      { from: 'me', text: 'I\'ve issued a Request Fix verdict — the worker has 5 business days to demonstrate compliant performance or optimise without the cache dependency. The verdict is neutral and gives both parties a fair path forward.', time: 'Yesterday, 4:00 PM' },
      { from: 'them', text: 'We\'ll wait for the resubmission then.', time: 'Yesterday, 4:05 PM' },
    ],
  },
  {
    id: 4,
    name: 'Arjun Mehta',
    avatar: 'AM',
    color: 'linear-gradient(135deg,#10b981,#059669)',
    role: 'Gig Worker',
    tag: 'worker',
    tagLabel: 'Worker',
    caseRef: 'E-learning Platform · Dispute',
    caseId: 'DSP-2026-002',
    lastMsg: 'I\'ll have the optimised API ready by Mar 9.',
    time: '4h ago',
    unread: 0,
    online: false,
    messages: [
      { from: 'them', text: 'Hi Dr. Smith, I wanted to explain the Redis caching setup — it\'s a required part of the architecture and the client didn\'t configure it before running load tests.', time: 'Yesterday, 1:00 PM' },
      { from: 'me', text: 'I saw your counter-claim and the local benchmark results. Can you share the architecture document that specifies the Redis requirement?', time: 'Yesterday, 1:10 PM' },
      { from: 'them', text: 'Yes, here it is:', time: 'Yesterday, 1:12 PM', attachment: { name: 'architecture-spec.pdf', size: '760 KB', icon: 'file-text', iconColor: '#ef4444', iconBg: '#fee2e2' } },
      { from: 'me', text: 'Reviewed. The spec does mention Redis as part of the recommended deployment stack. However, since I can\'t independently verify the test environment configuration, I\'m issuing a Request Fix — please provide evidence under properly configured conditions or optimise the API to meet the benchmark without the caching dependency.', time: 'Yesterday, 2:45 PM' },
      { from: 'them', text: 'That\'s fair. I\'ll optimise the query layer so it meets the SLA without Redis as a dependency.', time: 'Yesterday, 2:50 PM' },
      { from: 'me', text: 'Good. You have until Mar 11. Please resubmit through the platform and message me once done.', time: 'Yesterday, 2:52 PM' },
      { from: 'them', text: 'I\'ll have the optimised API ready by Mar 9.', time: 'Yesterday, 2:55 PM' },
    ],
  },
  {
    id: 5,
    name: 'Lannent Support',
    avatar: 'LS',
    color: 'linear-gradient(135deg,#64748b,#475569)',
    role: 'Platform',
    tag: 'admin',
    tagLabel: 'Admin',
    caseRef: 'Platform Notifications',
    caseId: null,
    lastMsg: 'You have 3 new audit requests assigned to your queue.',
    time: 'Mar 6',
    unread: 0,
    online: true,
    messages: [
      { from: 'them', text: 'Welcome back Dr. Smith! You have 3 new audit requests assigned to your queue for this week.', time: 'Mar 6, 9:00 AM', isSystem: true },
      { from: 'them', text: 'Audit AUD-2026-001 (E-commerce Platform Redesign) is marked High Priority — client deadline is Mar 8.', time: 'Mar 6, 9:01 AM', isSystem: true },
      { from: 'them', text: 'Dispute DSP-2026-002 (E-learning Platform) has been escalated. Both parties have submitted their evidence.', time: 'Mar 6, 9:02 AM', isSystem: true },
      { from: 'me', text: 'Acknowledged. I\'ll start with AUD-2026-001 today.', time: 'Mar 6, 9:10 AM' },
      { from: 'them', text: 'Your monthly payout of $4,200 has been processed and will appear in your wallet within 1–2 business days.', time: 'Mar 6, 2:00 PM', isSystem: true },
      { from: 'them', text: 'You have 3 new audit requests assigned to your queue.', time: 'Mar 7, 9:00 AM', isSystem: true },
    ],
  },
];

const FILTERS = [['all', 'All'], ['client', 'Clients'], ['worker', 'Workers']];
const TAG_ICON = { client: 'building-2', worker: 'user' };

function tagClass(tag) {
  return { client: 'tag-client', worker: 'tag-worker', admin: 'tag-admin', case: 'tag-case' }[tag] || 'tag-admin';
}

/** "Yesterday, 3:00 PM" → "3:00 PM" (times without a date are shown as-is). */
const timeOf = t => (t.includes(',') ? t.split(', ')[1] : t);

/** One row in the conversation list. The search results drop the tag icon, as before. */
function ConvoItem({ c, active, withIcon, onSelect }) {
  return (
    <div className={'convo-item' + (active ? ' active' : '')} onClick={() => onSelect(c.id)}>
      <div className="convo-avatar-wrap">
        <div className="convo-avatar" style={{ background: c.color }}>{c.avatar}</div>
        {c.online ? <div className="convo-online-dot"></div> : ''}
      </div>
      <div className="convo-info">
        <div className="convo-name-row">
          <span className="convo-name">{c.name}</span>
          {' '}
          <span className="convo-time">{c.time}</span>
        </div>
        <div className={'convo-last-msg' + (c.unread ? ' unread' : '')}>{c.lastMsg}</div>
        {withIcon ? (
          <span className={`convo-tag ${tagClass(c.tag)}`}>
            <Icon name={TAG_ICON[c.tag] || 'shield'} style={{ width: 9, height: 9 }} />
            {` ${c.tagLabel} ${c.caseId ? ` · ${c.caseId}` : ''} `}
          </span>
        ) : (
          <span className={`convo-tag ${tagClass(c.tag)}`}>{`${c.tagLabel}${c.caseId ? ` · ${c.caseId}` : ''}`}</span>
        )}
      </div>
      {c.unread ? <div className="unread-badge">{c.unread}</div> : ''}
    </div>
  );
}

/** A file attached to a message. */
function Attachment({ a, received }) {
  return (
    <div className="attachment-bubble" style={received ? { marginBottom: 4, background: 'var(--input-bg)' } : { marginBottom: 4 }}>
      <div className="attachment-icon" style={{ background: a.iconBg }}>
        <Icon name={a.icon} style={{ width: 16, height: 16, color: a.iconColor }} />
      </div>
      <div>
        <div className="attachment-name">{a.name}</div>
        <div className="attachment-size">{a.size}</div>
      </div>
      <Icon name="download" style={{ width: 13, height: 13, color: 'var(--muted-foreground)', marginLeft: 'auto' }} />
    </div>
  );
}

/** The whole thread with date dividers (renderMessages in the original). */
function Thread({ convo, messages }) {
  let lastDate = '';
  return messages.map((m, i) => {
    // Date divider
    const datePart = m.time.includes(',') ? m.time.split(',')[0] : (m.time.includes('AM') || m.time.includes('PM') ? 'Today' : m.time);
    let divider = null;
    if (datePart !== lastDate) {
      divider = <div className="date-divider">{datePart}</div>;
      lastDate = datePart;
    }

    let body;
    if (m.isSystem) {
      // System message
      body = <div className="sys-msg">{m.text}</div>;
    } else if (m.from === 'me') {
      body = (
        <div className="msg-sent">
          <div>
            {m.attachment ? <Attachment a={m.attachment} /> : ''}
            {m.text ? <div className="bubble bubble-sent">{m.text}</div> : ''}
            <div className="msg-time">{`${timeOf(m.time)} · Sent`}</div>
          </div>
        </div>
      );
    } else {
      body = (
        <div className="msg-received">
          <div className="convo-avatar" style={{ width: 28, height: 28, borderRadius: '50%', background: convo.color, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>{convo.avatar}</div>
          <div>
            {m.attachment ? <Attachment a={m.attachment} received /> : ''}
            {m.text ? <div className="bubble bubble-received">{m.text}</div> : ''}
            <div className="msg-time">{timeOf(m.time)}</div>
          </div>
        </div>
      );
    }
    return <Fragment key={i}>{divider}{body}</Fragment>;
  });
}

export default function ExpertMessages() {
  usePageTitle('Messages — Lannent Expert');

  // The demo data is changed as you read and send, so each visit starts from a fresh copy.
  const [conversations, setConversations] = useState(() => structuredClone(CONVERSATIONS));
  const [activeConvoId, setActiveConvoId] = useState(1);
  const [activeFilter, setActiveFilter] = useState('all');
  // The unread total in the header is counted once, when the page loads.
  const [initialUnread] = useState(() => CONVERSATIONS.reduce((a, c) => a + c.unread, 0));
  // null = the normal list; a string = the search results for that query
  const [searchQuery, setSearchQuery] = useState(null);
  // How many messages of the active conversation were drawn as a full thread;
  // later ones were appended by "send" in a simpler form.
  const [renderedCount, setRenderedCount] = useState(() => CONVERSATIONS[0].messages.length);
  const [scrollTick, setScrollTick] = useState(0);
  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);

  const activeConvo = conversations.find(c => c.id === activeConvoId);
  const filtered = activeFilter === 'all' ? conversations : conversations.filter(c => c.tag === activeFilter);

  // Scroll to bottom on load, after switching conversation and after sending
  useEffect(() => {
    const t = setTimeout(() => { if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight; }, 50);
    return () => clearTimeout(t);
  }, []);
  useLayoutEffect(() => {
    if (scrollTick && chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [scrollTick]);

  /* Select conversation */
  function selectConvo(id) {
    const convo = conversations.find(c => c.id === id);
    if (!convo) return;
    setActiveConvoId(id);
    // mark as read
    setConversations(list => list.map(c => (c.id === id ? { ...c, unread: 0 } : c)));
    setSearchQuery(null);
    setRenderedCount(convo.messages.length);
    setScrollTick(t => t + 1);
  }

  /* Send message */
  function sendMsg() {
    const input = inputRef.current;
    const text = input.value.trim();
    if (!text) return;
    setConversations(list => list.map(c => (c.id === activeConvoId
      ? { ...c, messages: [...c.messages, { from: 'me', text, time: 'Just now' }], lastMsg: text, time: 'Just now' }
      : c)));
    input.value = '';
    input.style.height = 'auto';
    setSearchQuery(null);
    setScrollTick(t => t + 1);
  }

  /* Filter tabs */
  function setFilter(val) {
    setActiveFilter(val);
    setSearchQuery(null);
  }

  // Search filter (client-side)
  let listContent;
  if (searchQuery === null) {
    listContent = filtered.length
      ? filtered.map(c => <ConvoItem key={c.id} c={c} active={c.id === activeConvoId} withIcon onSelect={selectConvo} />)
      : <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>No conversations found.</div>;
  } else {
    const q = searchQuery.toLowerCase();
    const results = filtered.filter(c => !q || c.name.toLowerCase().includes(q) || c.caseRef.toLowerCase().includes(q) || c.lastMsg.toLowerCase().includes(q));
    listContent = results.length
      ? results.map(c => <ConvoItem key={c.id} c={c} active={c.id === activeConvoId} onSelect={selectConvo} />)
      : <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>{`No results for "${searchQuery}"`}</div>;
  }

  const thread = activeConvo.messages.slice(0, renderedCount);
  const appended = activeConvo.messages.slice(renderedCount);

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="expert" activePath="/expert-messages" pageTitle="Messages" pageSubtitle="">
        <div className="messages-wrap">

          {/* ══ LEFT: Conversations Panel ══ */}
          <div className="convos-panel">
            <div className="convos-header">
              <div className="convos-header-top">
                <span className="convos-title">Messages</span>
                {' '}
                <span className="convos-unread">{`${initialUnread} unread`}</span>
              </div>
              <div className="convos-search">
                <Icon name="search" style={{ width: 14, height: 14, color: 'var(--muted-foreground)', flexShrink: 0 }} />
                <input type="text" placeholder="Search conversations..." onInput={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="convos-tabs">
                {FILTERS.map(([val, label]) => (
                  <button key={val} className={'tab-btn' + (activeFilter === val ? ' active' : '')} onClick={() => setFilter(val)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="convos-list" id="convosList">
              {listContent}
            </div>
          </div>

          {/* ══ RIGHT: Chat Area ══ */}
          <div className="chat-area">

            {/* Header */}
            <div className="chat-header" id="chatHeader">
              <div className="chat-header-avatar" style={{ background: activeConvo.color }}>{activeConvo.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="chat-header-name">{activeConvo.name}</div>
                <div className="chat-header-meta">
                  <span className={activeConvo.online ? 'chat-header-online' : ''}>{activeConvo.online ? '● Online' : '● Offline'}</span>
                  {` · ${activeConvo.role} `}
                </div>
              </div>
              {activeConvo.caseId ? (
                <div className="case-pill">
                  <Icon name="briefcase" style={{ width: 11, height: 11 }} />
                  {` ${activeConvo.caseId} `}
                </div>
              ) : ''}
              <button className="icon-btn" title="Search in conversation"><Icon name="search" style={{ width: 15, height: 15 }} /></button>
              <button className="icon-btn" title="More options"><Icon name="more-horizontal" style={{ width: 15, height: 15 }} /></button>
            </div>

            {/* Messages */}
            <div className="chat-body" id="chatBody" ref={chatBodyRef}>
              <Thread convo={activeConvo} messages={thread} />
              {/* Sent since the thread was drawn: added as plain bubbles, without a date divider */}
              {appended.map((m, i) => (
                <div className="msg-sent" key={'sent' + i}>
                  <div>
                    <div className="bubble bubble-sent">{m.text}</div>
                    <div className="msg-time">Just now · Sent</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="chat-footer">
              <button className="icon-btn" title="Attach file"><Icon name="paperclip" style={{ width: 15, height: 15 }} /></button>
              <textarea
                ref={inputRef}
                className="chat-textarea"
                id="chatInput"
                placeholder="Type a message…"
                rows="1"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
              ></textarea>
              <button className="send-btn" onClick={sendMsg} title="Send">
                <Icon name="send" style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

        </div>
      </DashboardLayout>
    </>
  );
}
