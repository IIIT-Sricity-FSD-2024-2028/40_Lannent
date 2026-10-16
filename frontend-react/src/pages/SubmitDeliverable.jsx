/**
 * LANNENT — SubmitDeliverable
 * Converted from front-end/pages/submit-deliverable.html.
 *
 * The worker hands in a milestone (?milestoneId=<id>): files (uploaded to the
 * file store), optional repository + branch, a title and notes, and a
 * pre-submission checklist. Everything is validated live and the sidebar
 * shows what is still missing.
 */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import PageStyle from '../components/PageStyle';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './SubmitDeliverable.css?raw';

// The same allowlist and size limit the server enforces
// (back-end/src/modules/files/upload.config.ts). Source code goes in a .zip.
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [
  '.zip',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
  '.txt', '.md', '.csv', '.json',
];
const ACCEPT = ALLOWED_EXTENSIONS.join(',');
const URL_PATTERN = /^https?:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/.+/i;
const BRANCH_PATTERN = /^[a-zA-Z0-9_\-/]+$/;

const CHECKLIST = [
  'All code is thoroughly tested and bug-free',
  'Documentation is complete and up to date',
  'All project requirements are implemented',
  'Code is clean and well-commented',
  'Files are properly organized',
];
const GUIDELINES = [
  { icon: 'check-circle', color: '#10b981', text: 'Include all source files and assets' },
  { icon: 'check-circle', color: '#10b981', text: 'Provide clear setup/run instructions' },
  { icon: 'check-circle', color: '#10b981', text: 'Test all features before submitting' },
  { icon: 'check-circle', color: '#10b981', text: 'Document any known limitations' },
  { icon: 'alert-circle', color: '#f59e0b', text: 'Do not submit incomplete work' },
];
const NEXT_STEPS = [
  { step: '1', text: 'Client reviews your deliverable', color: '#6366f1' },
  { step: '2', text: 'Optional: Expert technical audit', color: '#a855f7' },
  { step: '3', text: 'Client approves or requests changes', color: '#f59e0b' },
  { step: '4', text: 'Escrow released to your wallet', color: '#10b981' },
];

// Shown when the page is opened without a known milestone


const OVERLAY_STYLE = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)' };
const CARD_STYLE = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 };

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function getFileIcon(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('image') || t.includes('.jpg') || t.includes('.png') || t.includes('.gif') || t.includes('.svg') || t.includes('.webp'))
    return { icon: 'image', color: '#6366f1', bg: '#eef2ff' };
  if (t.includes('zip') || t.includes('archive') || t.includes('rar') || t.includes('.7z') || t.includes('.tar') || t.includes('.gz'))
    return { icon: 'file-archive', color: '#f59e0b', bg: '#fffbeb' };
  if (t.includes('pdf'))
    return { icon: 'file-text', color: '#ef4444', bg: '#fee2e2' };
  // Code files
  if (t.includes('.js') || t.includes('.ts') || t.includes('.py') || t.includes('.java') || t.includes('.cpp') || t.includes('.html') || t.includes('.css') || t.includes('.json'))
    return { icon: 'file-code', color: '#10b981', bg: '#ecfdf5' };
  return { icon: 'file', color: '#64748b', bg: '#f1f5f9' };
}

/**
 * The milestone being submitted for. The query string is the contract; the
 * key the workrooms write is honoured as a fallback so a page opened
 * without the parameter still knows what it is looking at.
 */
function resolveMilestoneId(searchParams) {
  const fromUrl = searchParams.get('milestoneId') || searchParams.get('id');
  if (fromUrl) return fromUrl;
  try {
    const stored = JSON.parse(localStorage.getItem('selectedMilestone') || 'null');
    if (stored && stored.id) return stored.id;
  } catch (e) { /* nothing usable stored */ }
  return '';
}

/** Banner details for the milestone being submitted, or null when there is none. */
function loadMilestone(Store, searchParams) {
  const mId = resolveMilestoneId(searchParams);
  const mData = mId ? Store.getMilestoneById(mId) : null;
  if (!mData) return null;
  const tData = Store.getTaskById(mData.taskId);
  const cUser = tData ? Store.getUserById(tData.clientId) : null;
  return {
    id: mData.id,
    status: mData.status,
    revisionNote: mData.status === 'revision-needed' ? mData.revisionNote : null,
    projectName: tData ? tData.title : 'Project',
    milestoneTitle: mData.title || 'Milestone',
    budget: mData.budget || 0,
    deadline: mData.dueDate ? new Date(mData.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No deadline',
    client: cUser ? cUser.name : 'Client',
    clientAvatar: cUser ? cUser.avatar : '?',
    clientColor: cUser ? cUser.avatarColor : 'linear-gradient(135deg,#6366f1,#4f46e5)',
  };
}

/** Red line under a field. Its text stays put while hidden, as in the original. */
function FieldErrorLine({ id, visible, text, style }) {
  return (
    <div id={id} className={'field-error' + (visible ? ' visible' : '')} style={style}>
      <Icon name="alert-circle" style={{ width: 12, height: 12 }} /> <span>{text}</span>
    </div>
  );
}

export default function SubmitDeliverable() {
  const Store = useStore();
  const Validate = useValidation();
  usePageTitle('Submit Deliverable — Lannent');
  const [searchParams] = useSearchParams();
  const [milestone] = useState(() => loadMilestone(Store, searchParams));

  // ── Form state ──
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [checked, setChecked] = useState(() => CHECKLIST.map(() => false));
  const [dragging, setDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [overlays, setOverlays] = useState([]);   // result dialogs appended to <body>
  const fileInputRef = useRef(null);
  const lastMsg = useRef({});                     // last text of each error line

  // ═════════════════════════════════════════════════════════
  //  VALIDATION (recomputed on every change, like runAllValidation)
  // ═════════════════════════════════════════════════════════
  /** Returns '' when valid, otherwise the message. Remembers the last message shown. */
  const remember = (key, msg) => { if (msg) lastMsg.current[key] = msg; return msg; };

  // ── Files ──
  const inFlight = uploadedFiles.filter(f => f.uploading);
  const invalid = uploadedFiles.filter(f => f.error);
  // Work can be handed in as files or as a link to it (a repository, say) —
  // the server needs at least one of the two.
  const fileErr = remember('file',
    uploadedFiles.length === 0 && !repoUrl.trim() ? 'Upload at least one file, or add a link to the work'
      // A file that is still going up has no reference yet, so submitting now
      // would record a name with nothing behind it.
      : inFlight.length > 0 ? `Uploading ${inFlight.length} file(s) — one moment`
      : invalid.length > 0 ? `${invalid.length} file(s) have errors — remove them to continue`
      : '');

  // ── Repository URL / branch (optional) ──
  const url = repoUrl.trim();
  const urlErr = remember('url', url && !URL_PATTERN.test(url) ? 'Must be a valid GitHub, GitLab, or Bitbucket URL' : '');
  const br = branch.trim();
  const branchErr = remember('branch', br && !BRANCH_PATTERN.test(br) ? 'Only letters, numbers, dashes, underscores, and slashes' : '');

  // ── Title & Description ──
  const titleLen = title.trim().length;
  const titleErr = remember('title', titleLen === 0 ? 'Title is required' : titleLen < 5 ? `Title must be at least 5 characters (${5 - titleLen} more)` : '');
  const notesLen = notes.trim().length;
  const notesErr = remember('notes', notesLen === 0 ? 'Description is required' : notesLen < 20 ? `Description must be at least 20 characters (${20 - notesLen} more)` : '');

  // ── Checklist ──
  const unchecked = checked.filter(c => !c).length;
  const checklistErr = remember('checklist', unchecked ? `Please complete all checklist items (${unchecked} remaining)` : '');

  const allValid = !fileErr && !urlErr && !branchErr && !titleErr && !notesErr && !checklistErr;

  // Input class: error, success, or neither (an empty optional field)
  const inputClass = (value, err) => 'form-input' + (err ? ' has-error' : value ? ' has-success' : '');
  const counterClass = (len, min) => 'char-counter ' + (len === 0 ? '' : len < min ? 'error' : 'ok');

  // ── Sidebar validation status ──
  const statusItems = [
    { label: 'Files or a link added', ok: (uploadedFiles.length > 0 || !!repoUrl.trim()) && !uploadedFiles.some(f => f.error || f.uploading) },
    { label: 'Title filled (5+ chars)', ok: titleLen >= 5 },
    { label: 'Description filled (20+ chars)', ok: notesLen >= 20 },
    { label: 'Checklist completed', ok: unchecked === 0 },
    { label: 'No validation errors', ok: !(fileErr || urlErr || branchErr || titleErr || notesErr || checklistErr) },
  ];

  // ═════════════════════════════════════════════════════════
  //  FILE HANDLING
  // ═════════════════════════════════════════════════════════
  function handleFileDrop(e) {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleFileSelect(e) {
    addFiles(Array.from(e.target.files));
    e.target.value = ''; // allow re-selecting same file
  }

  /**
   * Adds files and sends them to the file store.
   *
   * Selecting a file used to record its name and nothing else — the bytes
   * never left this page, so the client and the reviewer downstream had a
   * filename and no file. Each one is uploaded here and the row keeps the
   * server's reference; the submission carries those references.
   */
  function addFiles(files) {
    const pending = [];
    const rows = files.map(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      let error = null;
      // Validate type
      if (!ALLOWED_EXTENSIONS.includes(ext)) error = 'Unsupported type — zip code and other files first';
      // Validate size
      else if (file.size > MAX_FILE_SIZE) error = 'File size exceeds 10MB';

      const row = { id: Date.now() + Math.random(), name: file.name, size: file.size, sizeFormatted: formatSize(file.size), type: file.type || ext, error, uploading: !error, ref: null };
      if (!error) pending.push({ row, file });
      return row;
    });
    setUploadedFiles(list => [...list, ...rows]);

    // Same id the submission will use. A file uploaded with no taskId is
    // visible only to its uploader and staff, so the client reviewing the
    // milestone was refused access to the very files under review.
    const msId = resolveMilestoneId(searchParams);
    const ms = msId ? Store.getMilestoneById(msId) : null;
    const update = (id, patch) => setUploadedFiles(list => list.map(f => (f.id === id ? { ...f, ...patch } : f)));

    pending.forEach(({ row, file }) => {
      Store.uploadFile(file, { taskId: ms ? ms.taskId : '', milestoneId: msId, purpose: 'deliverable' })
        .then(ref => update(row.id, { ref, uploading: false }))
        // The server is the authority on type and size; surface its reason
        // rather than leaving a row that looks uploaded and is not.
        .catch(err => update(row.id, { uploading: false, error: err.message || 'Upload failed' }));
    });
  }

  function removeFile(id) {
    const row = uploadedFiles.find(f => f.id === id);
    setUploadedFiles(list => list.filter(f => f.id !== id));
    // Removing it from the form deletes the stored copy too. Until submitted,
    // nobody else can open it, but it should not be left on the server.
    if (row && row.ref && row.ref.id) {
      try { Store.deleteFile(row.ref.id); } catch (e) { console.warn('[SubmitDeliverable] could not delete', e.message); }
    }
  }

  // ═════════════════════════════════════════════════════════
  //  SUBMIT FLOW
  // ═════════════════════════════════════════════════════════
  function showConfirmModal() {
    // Final validation before showing modal
    if (!allValid) {
      // Scroll to first error
      const firstErr = document.querySelector('.has-error, .file-invalid');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      Validate.toast('Please fix all errors before submitting', 'error');
      return;
    }
    setConfirmOpen(true);
  }

  /** Replaces the confirm dialog with the reason the submission did not go through. */
  function showSubmitError(message) {
    setConfirmOpen(false);
    setOverlays(list => [...list, { id: Date.now() + Math.random(), type: 'error', message }]);
  }

  function submitDeliverable() {
    if (!allValid) return;
    const t = title.trim();
    const repoLink = repoUrl.trim();
    const n = notes.trim();
    const milestoneId = resolveMilestoneId(searchParams);

    // Without an id there is nothing to attach the work to. This used to
    // fall straight through to the success screen: the worker was told the
    // deliverable was submitted while nothing had been sent at all.
    if (!milestoneId) {
      showSubmitError('This page could not tell which milestone you are submitting for. Open it from the milestone board and try again.');
      return;
    }

    try {
      // Everything the form collected goes with the submission. The branch
      // was gathered and validated here and then dropped on the floor, so
      // the reviewer auditing the work could never see which branch it was on.
      // Blank optional fields are left out rather than sent as "". An
      // empty string is not a URL, so posting one made the server reject
      // the whole submission — files included.
      const deliverable = {
        title: t,
        description: n || 'Milestone deliverable submitted.',
        files: uploadedFiles.filter(f => !f.error).map(f => f.ref || { name: f.name, size: f.size, mime: f.type }),
      };
      if (repoLink) deliverable.link = repoLink;
      if (branch.trim()) deliverable.branch = branch.trim();
      Store.submitDeliverable(milestoneId, deliverable);
      // The audit hand-off is the server's job now: it points the project's
      // one engagement at this milestone and notifies the reviewer the
      // client assigned — and only that reviewer.
    } catch (e) {
      console.warn('Store save failed', e);
      showSubmitError(e && e.message ? e.message : 'The submission could not be saved. Your entries are still on this page — try again.');
      return;
    }

    // Drafts saved by an earlier version of this page were never read back.
    try { localStorage.removeItem('deliverableDraft'); } catch (e) { /* ignore */ }

    // Resolve taskId for workroom link
    let taskId = searchParams.get('taskId') || '';
    if (!taskId) {
      try { const m = Store.getMilestoneById(milestoneId); if (m) taskId = m.taskId || ''; } catch (e) { /* ignore */ }
    }

    setConfirmOpen(false);
    setTimeout(() => setOverlays(list => [...list, { id: Date.now(), type: 'success', taskId }]), 300);
  }

  const blocked = !milestone ? 'No milestone was selected. Open Submit Deliverable from your milestone board.'
    : milestone.status === 'disputed' ? 'This milestone is under dispute. You can resubmit once the reviewer gives their verdict.'
    : ['completed', 'approved'].includes(milestone.status) ? 'This milestone has already been settled.'
    : null;
  if (blocked) {
    return (
      <>
        <PageStyle css={pageCss} />
        <EmptyState role="worker" activePath="/worker-my-projects" pageTitle="Submit Deliverable" message={blocked}
                    linkHref="/worker-my-projects" linkLabel="Back to My Projects" />
      </>
    );
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="worker" activePath="/worker-my-projects" pageTitle="Submit Deliverable" pageSubtitle={milestone.milestoneTitle}>
        <div style={{ marginBottom: 16 }}>
          <Link to="/worker-my-projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--muted-foreground)', transition: 'color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--foreground)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
            <Icon name="arrow-left" style={{ width: 16, height: 16 }} /> Back to Projects
          </Link>
        </div>

        {milestone.revisionNote ? (
          <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 16, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Changes requested</div>
            <div style={{ fontSize: 14, color: '#78350f', lineHeight: 1.6 }}>{milestone.revisionNote}</div>
          </div>
        ) : null}

        {/* Milestone info banner */}
        <div style={{ background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: '1.5px solid #c7d2fe', borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Submitting for</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#1e1b4b' }}>{milestone.milestoneTitle}</div>
              <div style={{ fontSize: 13, color: '#4f46e5', marginTop: 4 }}>{milestone.projectName}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#10b981' }}>{`₹${milestone.budget.toLocaleString('en-IN')}`}</div>
                <div style={{ fontSize: 11, color: '#4f46e5' }}>Milestone Pay</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{milestone.deadline}</div>
                <div style={{ fontSize: 11, color: '#4f46e5' }}>Deadline</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: milestone.clientColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>{milestone.clientAvatar}</div>
                <div><div style={{ fontSize: 12, color: '#4f46e5' }}>Client</div><div style={{ fontSize: 13, fontWeight: 600 }}>{milestone.client}</div></div>
              </div>
            </div>
          </div>
        </div>

        <div className="submit-layout">
          {/* Main form */}
          <div>
            {/* ════ File Upload Section ════ */}
            <div style={CARD_STYLE}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Upload Deliverable Files <span style={{ color: '#ef4444' }}>*</span></h3>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 20 }}>Upload your code, designs, documentation, and any other relevant files</p>
              <div className={'drop-zone' + (fileErr ? ' has-error' : '') + (dragging ? ' dragging' : '')} id="dropZone"
                   onClick={() => fileInputRef.current.click()}
                   onDragOver={e => { e.preventDefault(); setDragging(true); }}
                   onDragLeave={() => setDragging(false)}
                   onDrop={handleFileDrop}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Icon name="upload-cloud" style={{ width: 28, height: 28, color: '#6366f1' }} />
                </div>
                <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--foreground)', marginBottom: 4 }}>Drop files here or click to browse</p>
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>ZIP (put source code in a zip), PDF, Office documents, images, TXT/MD/CSV/JSON. Max 10MB each.</p>
              </div>
              <input ref={fileInputRef} type="file" id="fileInput" multiple style={{ display: 'none' }} onChange={handleFileSelect} accept={ACCEPT} />
              <div id="fileList" style={{ marginTop: 16 }}>
                {uploadedFiles.map(f => {
                  const fi = getFileIcon(f.type);
                  const isOver = f.size > MAX_FILE_SIZE;
                  return (
                    <div key={f.id} className={'file-chip ' + (f.error ? 'file-invalid' : '')} id={`file-${f.id}`}>
                      <div className="file-type-icon" style={{ background: f.error ? '#fee2e2' : fi.bg }}>
                        <Icon name={f.error ? 'alert-triangle' : fi.icon} style={{ width: 16, height: 16, color: f.error ? '#ef4444' : fi.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...(f.error ? { color: '#ef4444' } : {}) }}>{f.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <span className={'file-size-badge ' + (isOver ? 'over' : '')}>{f.sizeFormatted}</span>
                          {f.error ? <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 500 }}>{f.error}</span> : ''}
                          {f.uploading ? <span style={{ fontSize: 11, color: '#b45309', fontWeight: 500 }}>Uploading…</span> : ''}
                          {!f.error && !f.uploading && f.ref ? <span style={{ fontSize: 11, color: '#047857', fontWeight: 500 }}>Stored</span> : ''}
                        </div>
                        {!f.error ? <div className="upload-progress"><div className="upload-progress-bar" style={{ width: `${f.uploading ? 45 : 100}%` }}></div></div> : ''}
                      </div>
                      <button onClick={() => removeFile(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: f.error ? '#ef4444' : 'var(--muted-foreground)', padding: 4 }} title="Remove">
                        <Icon name="x" style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <FieldErrorLine id="fileErr" visible={!!fileErr} text={lastMsg.current.file} />
            </div>

            {/* ════ Repository Details (Optional) ════ */}
            <div style={CARD_STYLE}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Repository Details (Optional)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="github" style={{ width: 15, height: 15 }} />Repository URL
                  </label>
                  <input type="url" id="repoUrl" className={inputClass(url, urlErr)} placeholder="https://github.com/username/repo" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} />
                  <FieldErrorLine id="repoUrlErr" visible={!!urlErr} text={lastMsg.current.url} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="git-branch" style={{ width: 15, height: 15 }} />Branch Name
                  </label>
                  <input type="text" id="branchName" className={inputClass(br, branchErr)} placeholder="e.g. main, develop" value={branch} onChange={e => setBranch(e.target.value)} />
                  <FieldErrorLine id="branchErr" visible={!!branchErr} text={lastMsg.current.branch} />
                </div>
              </div>
            </div>

            {/* ════ Submission Notes & Documentation ════ */}
            <div style={CARD_STYLE}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Submission Notes & Documentation <span style={{ color: '#ef4444' }}>*</span></h3>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16 }}>Describe what you've built, how to run/test it, and any important notes for the client</p>
              <label className="form-label">Title <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" id="deliverableTitle" className={inputClass(true, titleErr)} placeholder="Brief title for this submission" style={{ marginBottom: 4 }} value={title} onChange={e => setTitle(e.target.value)} />
              <FieldErrorLine id="deliverableTitleErr" visible={!!titleErr} text={lastMsg.current.title} />
              <div id="titleCounter" className={counterClass(titleLen, 5)}>{`${titleLen} / 5 min`}</div>

              <label className="form-label" style={{ marginTop: 12 }}>Description <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea id="deliverableNotes" className={inputClass(true, notesErr)} rows="6" value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder={'## What I built\n\nDescribe the work completed for this milestone...\n\n## How to run\n\n1. npm install\n2. npm run dev\n\n## Notes for the client\n\nAny important information...'}></textarea>
              <FieldErrorLine id="deliverableNotesErr" visible={!!notesErr} text={lastMsg.current.notes} />
              <div id="notesCounter" className={counterClass(notesLen, 20)}>{`${notesLen} / 20 min`}</div>
            </div>

            {/* ════ Pre-submission Checklist ════ */}
            <div id="checklistSection" className={'checklist-section' + (checklistErr ? ' has-error' : '')} style={CARD_STYLE}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Pre-submission Checklist <span style={{ color: '#ef4444' }}>*</span></h3>
              {CHECKLIST.map((item, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s', marginBottom: 4 }}
                       onMouseEnter={e => { e.currentTarget.style.background = 'var(--input-bg)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <input type="checkbox" className="checklist-item" id={`chk${i}`} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }}
                         checked={checked[i]} onChange={e => { const v = e.target.checked; setChecked(list => list.map((c, j) => (j === i ? v : c))); }} />
                  <span style={{ fontSize: 14 }}>{item}</span>
                </label>
              ))}
              <FieldErrorLine id="checklistErr" visible={!!checklistErr} text={lastMsg.current.checklist} style={{ marginTop: 8 }} />
            </div>

            {/* ════ Action Buttons ════ */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button id="submitBtn" className="btn-primary btn-submit-main" style={{ flex: 2, padding: 12, borderRadius: 12, fontSize: 15 }} onClick={showConfirmModal} disabled={!allValid}>
                <Icon name="send" style={{ width: 16, height: 16, display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />Submit Deliverable
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Validation Status Card */}
            <div id="validationStatus" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="shield-check" style={{ width: 16, height: 16, color: '#6366f1' }} /> Submission Status
              </h3>
              <div id="validationChecks">
                {statusItems.map(i => (
                  <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: i.ok ? '#ecfdf5' : '#fef2f2', border: `1.5px solid ${i.ok ? '#10b981' : '#fca5a5'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={i.ok ? 'check' : 'x'} style={{ width: 10, height: 10, color: i.ok ? '#10b981' : '#ef4444' }} />
                    </div>
                    <span style={{ fontSize: 12, color: i.ok ? '#059669' : '#6b7280' }}>{i.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Submission Guidelines</h3>
              {GUIDELINES.map(g => (
                <div key={g.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <Icon name={g.icon} style={{ width: 15, height: 15, color: g.color, flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>{g.text}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', border: '1.5px solid #a7f3d0', borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#065f46', marginBottom: 12 }}>What happens next?</h3>
              {NEXT_STEPS.map(s => (
                <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{s.step}</div>
                  <span style={{ fontSize: 13, color: '#065f46' }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confirm Modal */}
        <div id="confirmModal" style={{ display: confirmOpen ? 'flex' : 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 32, width: '100%', maxWidth: 420, margin: '0 16px', boxShadow: '0 32px 80px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Icon name="send" style={{ width: 24, height: 24, color: '#6366f1' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, textAlign: 'center', marginBottom: 8 }}>Submit Deliverable?</h2>
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)', textAlign: 'center', marginBottom: 24 }}>Once submitted, the client will be notified to review your work. You can still message them directly in the workroom.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setConfirmOpen(false)} className="btn-outline" style={{ flex: 1, padding: 12, borderRadius: 12 }}>Cancel</button>
              <button onClick={submitDeliverable} className="btn-primary" style={{ flex: 2, padding: 12, borderRadius: 12 }}>Confirm Submit</button>
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Result dialogs — appended to <body>, outside the dashboard shell, as before */}
      {overlays.map(o => createPortal(
        o.type === 'error' ? (
          <div style={OVERLAY_STYLE}>
            <div style={{ background: 'white', borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 420, margin: '0 16px', boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 12px 32px rgba(239,68,68,0.3)' }}>
                <span style={{ fontSize: 32, color: 'white' }}>!</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Not submitted</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{o.message}</p>
              <button className="btn-primary" style={{ width: '100%', padding: 12, borderRadius: 12 }} onClick={() => setOverlays(list => list.filter(x => x.id !== o.id))}>Back to the form</button>
            </div>
          </div>
        ) : (
          <div style={OVERLAY_STYLE}>
            <div style={{ background: 'white', borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 400, margin: '0 16px', boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 12px 32px rgba(16,185,129,0.3)' }}>
                <span style={{ fontSize: 32, color: 'white' }}>✓</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Deliverable Submitted!</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>The client has been notified and will review your work. You'll be notified once they provide feedback.</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <Link to="/worker-my-projects" className="btn-outline" style={{ flex: 1, padding: 12, borderRadius: 12, textAlign: 'center', textDecoration: 'none' }}>My Projects</Link>
                <Link to={`/worker-workroom?id=${o.taskId}`} className="btn-primary" style={{ flex: 1, padding: 12, borderRadius: 12, textAlign: 'center', textDecoration: 'none' }}>Open Workroom</Link>
              </div>
            </div>
          </div>
        ),
        document.body,
        String(o.id),
      ))}
    </>
  );
}
