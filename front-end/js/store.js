/**
 * LANNENT — Central Data Store
 * Single source of truth for all application data.
 * All data lives in localStorage under the 'lannent_db' key.
 */

const Store = (() => {
  const DB_KEY = 'lannent_db';

  // ─── Seed Data ────────────────────────────────────────────────────────────
  const SEED = {
    users: [
      { id: 'u1', name: 'James Client', email: 'client@gmail.com', password: 'password123', role: 'client', avatar: 'JC', avatarColor: 'linear-gradient(135deg,#6366f1,#4f46e5)', status: 'active', joinDate: 'Jan 10, 2026', walletBalance: 24500, company: 'TechCorp Ltd', location: 'New York, NY' },
      { id: 'u2', name: 'Alex Worker', email: 'worker@gmail.com', password: 'password123', role: 'worker', avatar: 'AW', avatarColor: 'linear-gradient(135deg,#10b981,#059669)', status: 'active', joinDate: 'Feb 1, 2026', walletBalance: 8200, skills: ['React','Node.js','MongoDB'], rating: 4.8, completedProjects: 23 },
      { id: 'u3', name: 'Dr. Jane Smith', email: 'expert@gmail.com', password: 'password123', role: 'expert', avatar: 'JS', avatarColor: 'linear-gradient(135deg,#a855f7,#7c3aed)', status: 'active', joinDate: 'Jan 20, 2026', walletBalance: 5100, specialization: 'Full-Stack & Security', reviewsDone: 47 },
      { id: 'u4', name: 'Super Admin', email: 'super@gmail.com', password: 'superadmin123', role: 'superuser', avatar: 'SA', avatarColor: 'linear-gradient(135deg,#ef4444,#dc2626)', status: 'active', joinDate: 'Jan 1, 2026', walletBalance: 0 },
      { id: 'u5', name: 'Sarah Johnson', email: 'sarah@gmail.com', password: 'password123', role: 'worker', avatar: 'SJ', avatarColor: 'linear-gradient(135deg,#6366f1,#4f46e5)', status: 'active', joinDate: 'Feb 5, 2026', walletBalance: 12400, skills: ['React','Figma','UI/UX Design'], rating: 4.9, completedProjects: 89 },
      { id: 'u6', name: 'Michael Chen', email: 'michael@gmail.com', password: 'password123', role: 'worker', avatar: 'MC', avatarColor: 'linear-gradient(135deg,#ec4899,#be185d)', status: 'active', joinDate: 'Feb 10, 2026', walletBalance: 9800, skills: ['React','Node.js','MongoDB'], rating: 4.7, completedProjects: 65 },
      { id: 'u7', name: 'Emily Rodriguez', email: 'emily@gmail.com', password: 'password123', role: 'worker', avatar: 'ER', avatarColor: 'linear-gradient(135deg,#10b981,#059669)', status: 'active', joinDate: 'Feb 15, 2026', walletBalance: 7300, skills: ['Figma','CSS3','User Research'], rating: 4.8, completedProjects: 41 },
      { id: 'u8', name: 'Bob Client', email: 'bob@gmail.com', password: 'password123', role: 'client', avatar: 'BC', avatarColor: 'linear-gradient(135deg,#f59e0b,#d97706)', status: 'active', joinDate: 'Mar 1, 2026', walletBalance: 15000, company: 'StartupXYZ', location: 'Austin, TX' },
    ],

    tasks: [
      { id: 't1', title: 'E-commerce Website Redesign', description: 'Need a complete redesign of our e-commerce platform with modern UI/UX. Must include product pages, cart, checkout flow, and admin panel.', category: 'Web Development', budget: 2500, currency: 'USD', deadline: '2026-04-15', skills: ['React','Figma','UI/UX Design'], clientId: 'u1', workerId: 'u5', status: 'in-progress', auditEnabled: false, progress: 75, createdAt: '2026-03-01' },
      { id: 't2', title: 'Mobile App Development', description: 'Build a cross-platform mobile application for iOS and Android. Features include user auth, push notifications, and real-time data sync.', category: 'Mobile Development', budget: 4800, currency: 'USD', deadline: '2026-04-20', skills: ['React Native','Flutter'], clientId: 'u1', workerId: 'u6', status: 'under-review', auditEnabled: true, progress: 45, createdAt: '2026-03-03' },
      { id: 't3', title: 'API Integration Project', description: 'Integrate third-party payment and shipping APIs into existing platform. Documentation and testing required.', category: 'Backend / API', budget: 1200, currency: 'USD', deadline: '2026-04-18', skills: ['Node.js','REST API'], clientId: 'u1', workerId: null, status: 'open', auditEnabled: false, progress: 0, createdAt: '2026-03-05' },
      { id: 't4', title: 'Content Management System', description: 'Build a custom CMS for managing blog posts, media files, and user permissions.', category: 'Web Development', budget: 3500, currency: 'USD', deadline: '2026-04-12', skills: ['React','Node.js','MongoDB'], clientId: 'u1', workerId: 'u7', status: 'in-progress', auditEnabled: false, progress: 90, createdAt: '2026-03-08' },
      { id: 't5', title: 'AI Chatbot Integration', description: 'Integrate an AI-powered chatbot into customer support workflow. NLP and intent detection required.', category: 'AI / Machine Learning', budget: 6000, currency: 'USD', deadline: '2026-05-01', skills: ['Python','TensorFlow','NLP'], clientId: 'u8', workerId: null, status: 'open', auditEnabled: true, progress: 0, createdAt: '2026-03-10' },
      { id: 't6', title: 'UI Design System', description: 'Create a comprehensive design system with components, tokens, and documentation.', category: 'UI/UX Design', budget: 2200, currency: 'USD', deadline: '2026-04-25', skills: ['Figma','Design Systems'], clientId: 'u8', workerId: 'u2', status: 'in-progress', auditEnabled: false, progress: 30, createdAt: '2026-03-12' },
    ],

    milestones: [
      { id: 'm1', taskId: 't1', title: 'UI Design & Wireframes', description: 'Complete wireframes and high-fidelity designs for all pages', budget: 800, status: 'completed', submittedAt: '2026-03-10', approvedAt: '2026-03-12', deliverable: null, workerId: 'u5' },
      { id: 'm2', taskId: 't1', title: 'Frontend Development', description: 'Implement all pages in React with responsive design', budget: 1000, status: 'completed', submittedAt: '2026-03-18', approvedAt: '2026-03-20', deliverable: null, workerId: 'u5' },
      { id: 'm3', taskId: 't1', title: 'Backend Integration', description: 'Connect frontend to APIs and set up data flow', budget: 500, status: 'in-progress', submittedAt: null, approvedAt: null, deliverable: null, workerId: 'u5' },
      { id: 'm4', taskId: 't1', title: 'Testing & Deployment', description: 'QA testing, bug fixes, and production deployment', budget: 200, status: 'pending', submittedAt: null, approvedAt: null, deliverable: null, workerId: 'u5' },
      { id: 'm5', taskId: 't2', title: 'App Architecture & Setup', description: 'Project setup, architecture design, CI/CD pipeline', budget: 800, status: 'completed', submittedAt: '2026-03-08', approvedAt: '2026-03-10', deliverable: null, workerId: 'u6' },
      { id: 'm6', taskId: 't2', title: 'Core UI Implementation', description: 'Build all screens and navigation flows', budget: 1500, status: 'submitted', submittedAt: '2026-03-25', approvedAt: null, deliverable: { title: 'UI Implementation v1', description: 'All screens implemented with navigation', link: 'https://github.com/example/mobile-app' }, workerId: 'u6' },
      { id: 'm7', taskId: 't4', title: 'Database Schema Design', description: 'Design and implement the database schema for CMS', budget: 700, status: 'completed', submittedAt: '2026-03-15', approvedAt: '2026-03-17', deliverable: null, workerId: 'u7' },
      { id: 'm8', taskId: 't4', title: 'Content Editor Module', description: 'Build rich text editor and media management', budget: 1200, status: 'completed', submittedAt: '2026-03-22', approvedAt: '2026-03-24', deliverable: null, workerId: 'u7' },
      { id: 'm9', taskId: 't4', title: 'User Permission System', description: 'Role-based access control for CMS users', budget: 900, status: 'completed', submittedAt: '2026-03-28', approvedAt: '2026-03-29', deliverable: null, workerId: 'u7' },
      { id: 'm10', taskId: 't4', title: 'Final Testing', description: 'Full QA pass and documentation', budget: 700, status: 'in-progress', submittedAt: null, approvedAt: null, deliverable: null, workerId: 'u7' },
    ],

    proposals: [
      { id: 'p1', taskId: 't3', workerId: 'u5', workerName: 'Sarah Johnson', avatar: 'SJ', avatarColor: 'linear-gradient(135deg,#6366f1,#4f46e5)', rating: 4.9, reviewCount: 127, location: 'San Francisco, CA', bidPrice: '$1,100', timeline: '1 week', coverLetter: 'Experienced in API integrations with Stripe, Twilio, and shipping providers. I can deliver clean, documented code within a week with full test coverage.', skills: ['Node.js','REST API','Testing'], completedProjects: 89, successRate: 98, hourlyRate: '$85/hr', responseTime: 'Within 2 hours', status: 'pending' },
      { id: 'p2', taskId: 't3', workerId: 'u6', workerName: 'Michael Chen', avatar: 'MC', avatarColor: 'linear-gradient(135deg,#ec4899,#be185d)', rating: 4.7, reviewCount: 83, location: 'New York, NY', bidPrice: '$1,000', timeline: '10 days', coverLetter: 'Full-stack developer with deep API experience. I have built payment integrations for Stripe, PayPal, and Square for multiple e-commerce clients.', skills: ['Node.js','Express','MongoDB'], completedProjects: 65, successRate: 96, hourlyRate: '$75/hr', responseTime: 'Within 4 hours', status: 'pending' },
      { id: 'p3', taskId: 't5', workerId: 'u2', workerName: 'Alex Worker', avatar: 'AW', avatarColor: 'linear-gradient(135deg,#10b981,#059669)', rating: 4.8, reviewCount: 56, location: 'Boston, MA', bidPrice: '$5,500', timeline: '4 weeks', coverLetter: 'ML engineer with production NLP chatbot experience. Built systems handling 10k+ daily conversations. Deep expertise in LangChain and OpenAI APIs.', skills: ['Python','TensorFlow','NLP'], completedProjects: 23, successRate: 100, hourlyRate: '$90/hr', responseTime: 'Within 1 hour', status: 'pending' },
    ],

    auditRequests: [
      { id: 'ar1', taskId: 't2', milestoneId: 'm6', workerId: 'u6', clientId: 'u1', expertId: 'u3', status: 'In Review', severity: 'High', project: 'Mobile App Development', worker: 'Michael Chen', milestone: 'Core UI Implementation', createdAt: '2026-03-25', dueDate: '2026-04-01' },
      { id: 'ar2', taskId: 't1', milestoneId: 'm3', workerId: 'u5', clientId: 'u1', expertId: null, status: 'Pending', severity: 'Medium', project: 'E-commerce Website Redesign', worker: 'Sarah Johnson', milestone: 'Backend Integration', createdAt: '2026-03-28', dueDate: '2026-04-05' },
      { id: 'ar3', taskId: 't4', milestoneId: 'm9', workerId: 'u7', clientId: 'u1', expertId: 'u3', status: 'Completed', severity: 'Low', project: 'Content Management System', worker: 'Emily Rodriguez', milestone: 'User Permission System', createdAt: '2026-03-20', dueDate: '2026-03-27' },
    ],

    auditReports: [
      { id: 'rep1', auditRequestId: 'ar3', taskId: 't4', milestoneId: 'm9', expertId: 'u3', verdict: 'pass', overall: 'Pass', findings: 'Code quality is excellent. Security implementation follows OWASP standards. Role-based access is properly implemented with no privilege escalation vulnerabilities detected.', codequality: 5, security: 5, performance: 4, documentation: 4, createdAt: '2026-03-26', milestoneTitle: 'User Permission System', projectTitle: 'Content Management System', workerName: 'Emily Rodriguez' },
      { id: 'rep2', auditRequestId: 'ar1', taskId: 't2', milestoneId: 'm6', expertId: 'u3', verdict: null, overall: null, findings: null, codequality: null, security: null, performance: null, documentation: null, createdAt: null, milestoneTitle: 'Core UI Implementation', projectTitle: 'Mobile App Development', workerName: 'Michael Chen' },
    ],

    disputes: [
      { id: 'd1', taskId: 't1', milestoneId: 'm3', raisedBy: 'u1', raisedByName: 'James Client', againstId: 'u5', againstName: 'Sarah Johnson', status: 'open', reason: 'The backend integration milestone was submitted but the API endpoints return incorrect data formats. The payment gateway integration is also incomplete.', expertId: null, verdict: null, resolution: null, amount: '$500', project: 'E-commerce Website Redesign', milestone: 'Backend Integration', createdAt: '2026-03-29' },
      { id: 'd2', taskId: 't6', milestoneId: null, raisedBy: 'u2', raisedByName: 'Alex Worker', againstId: 'u8', againstName: 'Bob Client', status: 'resolved', reason: 'Client has not responded to milestone submission for over 2 weeks. Payment is being unfairly withheld.', expertId: 'u3', verdict: 'worker-favour', resolution: 'After reviewing the submitted work and communication logs, the milestone is deemed complete. Escrow funds released to worker.', amount: '$660', project: 'UI Design System', milestone: 'Phase 1 Components', createdAt: '2026-03-15', resolvedAt: '2026-03-22' },
    ],

    transactions: [
      { id: 'tx1', type: 'escrow-lock', amount: 2500, fromId: 'u1', toId: 'escrow', taskId: 't1', milestoneId: null, description: 'Escrow funded for E-commerce Website Redesign', status: 'completed', createdAt: '2026-03-01' },
      { id: 'tx2', type: 'milestone-release', amount: 800, fromId: 'escrow', toId: 'u5', taskId: 't1', milestoneId: 'm1', description: 'Payment for UI Design & Wireframes', status: 'completed', createdAt: '2026-03-12' },
      { id: 'tx3', type: 'milestone-release', amount: 1000, fromId: 'escrow', toId: 'u5', taskId: 't1', milestoneId: 'm2', description: 'Payment for Frontend Development', status: 'completed', createdAt: '2026-03-20' },
      { id: 'tx4', type: 'escrow-lock', amount: 4800, fromId: 'u1', toId: 'escrow', taskId: 't2', milestoneId: null, description: 'Escrow funded for Mobile App Development', status: 'completed', createdAt: '2026-03-03' },
      { id: 'tx5', type: 'milestone-release', amount: 800, fromId: 'escrow', toId: 'u6', taskId: 't2', milestoneId: 'm5', description: 'Payment for App Architecture & Setup', status: 'completed', createdAt: '2026-03-10' },
      { id: 'tx6', type: 'deposit', amount: 10000, fromId: 'external', toId: 'u1', taskId: null, milestoneId: null, description: 'Wallet top-up via bank transfer', status: 'completed', createdAt: '2026-02-28' },
    ],

    notifications: [
      { id: 'n1', userId: 'u1', type: 'milestone-approved', text: 'Milestone "Frontend UI" approved', subtext: 'E-commerce Redesign · 2 min ago', read: false, createdAt: '2026-03-30' },
      { id: 'n2', userId: 'u1', type: 'message', text: 'New message from Sarah Johnson', subtext: 'Mobile App Project · 10 min ago', read: false, createdAt: '2026-03-30' },
      { id: 'n3', userId: 'u2', type: 'payment', text: 'Payment of $1,000 received', subtext: 'Frontend Development milestone · 1 hr ago', read: false, createdAt: '2026-03-30' },
    ]
  };

  // ─── DB Init ─────────────────────────────────────────────────────────────
  function _getDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  }

  function _saveDB(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { console.error('Store: save failed', e); }
  }

  function init() {
    if (!_getDB()) {
      _saveDB(JSON.parse(JSON.stringify(SEED)));
    }
  }

  function resetToSeed() {
    _saveDB(JSON.parse(JSON.stringify(SEED)));
  }

  function _db() {
    const db = _getDB();
    if (!db) { init(); return JSON.parse(JSON.stringify(SEED)); }
    return db;
  }

  // ─── Generic ID generator ────────────────────────────────────────────────
  function _id(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  // ─── USERS ───────────────────────────────────────────────────────────────
  function getUsers() { return _db().users; }

  function getUserById(id) { return _db().users.find(u => u.id === id) || null; }

  function getUserByEmail(email) { return _db().users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null; }

  function createUser(data) {
    const db = _db();
    const user = { id: _id('u'), status: 'active', joinDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), walletBalance: 0, ...data };
    db.users.push(user);
    _saveDB(db);
    return user;
  }

  function updateUser(id, updates) {
    const db = _db();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...updates };
    _saveDB(db);
    return db.users[idx];
  }

  function deleteUser(id) {
    const db = _db();
    db.users = db.users.filter(u => u.id !== id);
    _saveDB(db);
  }

  function deductFromWallet(userId, amount) {
    const user = getUserById(userId);
    if (!user) return null;
    if (user.walletBalance < amount) return null; // Insufficient balance
    return updateUser(userId, { walletBalance: user.walletBalance - amount });
  }

  function addToWallet(userId, amount) {
    const user = getUserById(userId);
    if (!user) return null;
    return updateUser(userId, { walletBalance: user.walletBalance + amount });
  }

  // ─── TASKS ────────────────────────────────────────────────────────────────
  function getTasks() { return _db().tasks; }

  function getTaskById(id) { return _db().tasks.find(t => t.id === id) || null; }

  function getTasksByClient(clientId) { return _db().tasks.filter(t => t.clientId === clientId); }

  function getTasksByWorker(workerId) { return _db().tasks.filter(t => t.workerId === workerId); }

  function getOpenTasks() { return _db().tasks.filter(t => t.status === 'open'); }

  function createTask(data) {
    const db = _db();
    const task = { id: _id('t'), status: 'open', progress: 0, workerId: null, createdAt: new Date().toISOString().slice(0,10), ...data };
    db.tasks.push(task);
    _saveDB(db);
    return task;
  }

  function updateTask(id, updates) {
    const db = _db();
    const idx = db.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    db.tasks[idx] = { ...db.tasks[idx], ...updates };
    _saveDB(db);
    return db.tasks[idx];
  }

  function deleteTask(id) {
    const db = _db();
    db.tasks = db.tasks.filter(t => t.id !== id);
    _saveDB(db);
  }

  // ─── MILESTONES ──────────────────────────────────────────────────────────
  function getMilestones() { return _db().milestones; }

  function getMilestonesByTask(taskId) { return _db().milestones.filter(m => m.taskId === taskId); }

  function getMilestoneById(id) { return _db().milestones.find(m => m.id === id) || null; }

  function createMilestone(data) {
    const db = _db();
    const ms = { id: _id('m'), status: 'pending', submittedAt: null, approvedAt: null, deliverable: null, ...data };
    db.milestones.push(ms);
    _saveDB(db);
    return ms;
  }

  function updateMilestone(id, updates) {
    const db = _db();
    const idx = db.milestones.findIndex(m => m.id === id);
    if (idx === -1) return null;
    db.milestones[idx] = { ...db.milestones[idx], ...updates };
    _saveDB(db);
    return db.milestones[idx];
  }

  function _checkTaskCompletion(taskId) {
    if (!taskId) return;
    const task = getTaskById(taskId);
    if (!task) return;
    const allMilestones = getMilestonesByTask(taskId);
    if (!allMilestones.length) return;
    
    const done = allMilestones.filter(m => ['completed', 'approved', 'audit-passed', 'done'].includes(m.status)).length;
    const pct = Math.round((done / allMilestones.length) * 100);
    
    updateTask(taskId, { progress: pct, status: pct === 100 ? 'completed' : (task.status === 'completed' ? 'in-progress' : task.status) });
    
    if (pct === 100) {
      const proposal = _db().proposals.find(p => p.taskId === taskId && p.status === 'hired');
      if (proposal) updateProposal(proposal.id, { status: 'completed' });
    }
  }

  function submitDeliverable(milestoneId, deliverable) {
    const ms = updateMilestone(milestoneId, { status: 'submitted', submittedAt: new Date().toISOString().slice(0,10), deliverable });
    // If task has auditEnabled, create audit request
    if (ms) {
      const task = getTaskById(ms.taskId);
      if (task && task.auditEnabled) {
        createAuditRequest({ taskId: ms.taskId, milestoneId, workerId: ms.workerId, clientId: task.clientId, expertId: 'u3', status: 'Pending', severity: 'Medium', project: task.title, worker: getUserById(ms.workerId)?.name || 'Worker', milestone: ms.title, dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10) });
      }
    }
    return ms;
  }

  function approveDeliverable(milestoneId) {
    const ms = updateMilestone(milestoneId, { status: 'completed', approvedAt: new Date().toISOString().slice(0,10) });
    if (ms) {
      // Create release transaction
      createTransaction({ type: 'milestone-release', amount: ms.budget, fromId: 'escrow', toId: ms.workerId, taskId: ms.taskId, milestoneId, description: `Payment for ${ms.title}`, status: 'completed' });
      const worker = getUserById(ms.workerId);
      if (worker) updateUser(ms.workerId, { walletBalance: (worker.walletBalance || 0) + ms.budget });
      _checkTaskCompletion(ms.taskId);
    }
    return ms;
  }

  // ─── PROPOSALS ───────────────────────────────────────────────────────────
  function getProposals() { return _db().proposals; }

  function getProposalsByTask(taskId) { return _db().proposals.filter(p => p.taskId === taskId); }

  function getProposalsByWorker(workerId) { return _db().proposals.filter(p => p.workerId === workerId && p.type !== 'invitation'); }

  function getInvitationsByWorker(workerId) { return _db().proposals.filter(p => p.workerId === workerId && p.type === 'invitation'); }

  function createProposal(data) {
    const db = _db();
    const prop = { id: _id('p'), status: 'pending', createdAt: new Date().toISOString().slice(0,10), ...data };
    db.proposals.push(prop);
    _saveDB(db);
    return prop;
  }

  function updateProposal(id, updates) {
    const db = _db();
    const idx = db.proposals.findIndex(p => p.id === id);
    if (idx === -1) return null;
    db.proposals[idx] = { ...db.proposals[idx], ...updates };
    _saveDB(db);
    return db.proposals[idx];
  }

  function hireWorker(proposalId) {
    const db = _db();
    const prop = db.proposals.find(p => p.id === proposalId);
    if (!prop) return null;
    // Mark all other proposals for same task as rejected
    db.proposals = db.proposals.map(p => p.taskId === prop.taskId ? { ...p, status: p.id === proposalId ? 'hired' : 'rejected' } : p);
    // Update task with hired worker
    const taskIdx = db.tasks.findIndex(t => t.id === prop.taskId);
    if (taskIdx !== -1) db.tasks[taskIdx] = { ...db.tasks[taskIdx], workerId: prop.workerId, status: 'in-progress' };
    // Lock escrow
    const task = db.tasks[taskIdx];
    if (task) { db.transactions.push({ id: _id('tx'), type: 'escrow-lock', amount: task.budget, fromId: task.clientId, toId: 'escrow', taskId: task.id, milestoneId: null, description: `Escrow funded for ${task.title}`, status: 'completed', createdAt: new Date().toISOString().slice(0,10) }); }
    _saveDB(db);
    return db.proposals.find(p => p.id === proposalId);
  }

  function acceptInvitation(proposalId) {
    const db = _db();
    const prop = db.proposals.find(p => p.id === proposalId);
    if (!prop || prop.type !== 'invitation') return null;
    
    db.proposals = db.proposals.map(p => p.taskId === prop.taskId ? { ...p, status: p.id === proposalId ? 'hired' : 'rejected' } : p);
    
    const taskIdx = db.tasks.findIndex(t => t.id === prop.taskId);
    if (taskIdx !== -1) {
       db.tasks[taskIdx] = { ...db.tasks[taskIdx], workerId: prop.workerId, status: 'in-progress' };
       const task = db.tasks[taskIdx];
       db.transactions.push({ id: _id('tx'), type: 'escrow-lock', amount: task.budget, fromId: task.clientId, toId: 'escrow', taskId: task.id, milestoneId: null, description: `Escrow funded for ${task.title}`, status: 'completed', createdAt: new Date().toISOString().slice(0,10) });
    }
    
    _saveDB(db);
    return db.proposals.find(p => p.id === proposalId);
  }

  function declineInvitation(proposalId) {
    const db = _db();
    const idx = db.proposals.findIndex(p => p.id === proposalId);
    if (idx === -1 || db.proposals[idx].type !== 'invitation') return null;
    
    db.proposals[idx] = { ...db.proposals[idx], status: 'rejected' };
    _saveDB(db);
    return db.proposals[idx];
  }

  // ─── AUDIT REQUESTS ──────────────────────────────────────────────────────
  function getAuditRequests() { return _db().auditRequests; }

  function getAuditRequestById(id) { return _db().auditRequests.find(a => a.id === id) || null; }

  function createAuditRequest(data) {
    const db = _db();
    const req = { id: _id('ar'), createdAt: new Date().toISOString().slice(0,10), ...data };
    db.auditRequests.push(req);
    _saveDB(db);
    return req;
  }

  function updateAuditRequest(id, updates) {
    const db = _db();
    const idx = db.auditRequests.findIndex(a => a.id === id);
    if (idx === -1) return null;
    db.auditRequests[idx] = { ...db.auditRequests[idx], ...updates };
    _saveDB(db);
    return db.auditRequests[idx];
  }

  // ─── AUDIT REPORTS ───────────────────────────────────────────────────────
  function getAuditReports() { return _db().auditReports; }

  function getAuditReportByRequest(auditRequestId) { return _db().auditReports.find(r => r.auditRequestId === auditRequestId) || null; }

  function getReportsByTask(taskId) { return _db().auditReports.filter(r => r.taskId === taskId); }

  function saveAuditReport(data) {
    const db = _db();
    const existing = db.auditReports.findIndex(r => r.auditRequestId === data.auditRequestId);
    const report = { id: existing >= 0 ? db.auditReports[existing].id : _id('rep'), createdAt: new Date().toISOString().slice(0,10), ...data };
    if (existing >= 0) { db.auditReports[existing] = report; }
    else { db.auditReports.push(report); }
    // Update audit request status
    const arIdx = db.auditRequests.findIndex(a => a.id === data.auditRequestId);
    if (arIdx !== -1) db.auditRequests[arIdx].status = 'Completed';
    // Update milestone status based on verdict
    if (data.verdict === 'pass') {
      const msIdx = db.milestones.findIndex(m => m.id === data.milestoneId);
      if (msIdx !== -1) db.milestones[msIdx].status = 'audit-passed';
    } else if (data.verdict === 'fail') {
      const msIdx = db.milestones.findIndex(m => m.id === data.milestoneId);
      if (msIdx !== -1) db.milestones[msIdx].status = 'revision-needed';
    }
    _saveDB(db);
    
    // Check completion AFTER save
    if (data.verdict === 'pass' && data.taskId) {
      _checkTaskCompletion(data.taskId);
    }
    
    return report;
  }

  // ─── DISPUTES ────────────────────────────────────────────────────────────
  function getDisputes() { return _db().disputes; }

  function getDisputeById(id) { return _db().disputes.find(d => d.id === id) || null; }

  function createDispute(data) {
    const db = _db();
    const dispute = { id: _id('d'), status: 'open', expertId: null, verdict: null, resolution: null, createdAt: new Date().toISOString().slice(0,10), ...data };
    db.disputes.push(dispute);
    // Update milestone/task status
    if (data.milestoneId) { const msIdx = db.milestones.findIndex(m => m.id === data.milestoneId); if (msIdx !== -1) db.milestones[msIdx].status = 'disputed'; }
    _saveDB(db);
    return dispute;
  }

  function resolveDispute(id, { verdict, resolution, expertId }) {
    const db = _db();
    const idx = db.disputes.findIndex(d => d.id === id);
    if (idx === -1) return null;
    db.disputes[idx] = { ...db.disputes[idx], status: 'resolved', verdict, resolution, expertId, resolvedAt: new Date().toISOString().slice(0,10) };
    // Release or hold escrow based on verdict
    const dispute = db.disputes[idx];
    if (dispute.milestoneId) {
      const msIdx = db.milestones.findIndex(m => m.id === dispute.milestoneId);
      if (msIdx !== -1) {
        if (verdict === 'worker-favour' || verdict === 'split') {
          db.milestones[msIdx].status = 'completed';
          db.milestones[msIdx].approvedAt = new Date().toISOString().slice(0,10);
        } else {
          db.milestones[msIdx].status = 'in-progress';
        }
      }
    }
    _saveDB(db);
    
    if (dispute.taskId && (verdict === 'worker-favour' || verdict === 'split')) {
      _checkTaskCompletion(dispute.taskId);
    }
    
    return db.disputes[idx];
  }

  // ─── TRANSACTIONS ────────────────────────────────────────────────────────
  function getTransactions() { return _db().transactions; }

  function getTransactionsByUser(userId) {
    return _db().transactions.filter(t => t.fromId === userId || t.toId === userId);
  }

  function createTransaction(data) {
    const db = _db();
    const tx = { id: _id('tx'), status: 'completed', createdAt: new Date().toISOString().slice(0,10), ...data };
    db.transactions.push(tx);
    _saveDB(db);
    return tx;
  }

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────
  function getNotifications(userId) { return _db().notifications.filter(n => n.userId === userId); }

  function addNotification(data) {
    const db = _db();
    db.notifications.push({ id: _id('n'), read: false, createdAt: new Date().toISOString().slice(0,10), ...data });
    _saveDB(db);
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────
  return {
    init, resetToSeed,
    getUsers, getUserById, getUserByEmail, createUser, updateUser, deleteUser, deductFromWallet, addToWallet,
    getTasks, getTaskById, getTasksByClient, getTasksByWorker, getOpenTasks, createTask, updateTask, deleteTask,
    getMilestones, getMilestonesByTask, getMilestoneById, createMilestone, updateMilestone, submitDeliverable, approveDeliverable,
    getProposals, getProposalsByTask, getProposalsByWorker, getInvitationsByWorker, createProposal, updateProposal, hireWorker, acceptInvitation, declineInvitation,
    getAuditRequests, getAuditRequestById, createAuditRequest, updateAuditRequest,
    getAuditReports, getAuditReportByRequest, getReportsByTask, saveAuditReport,
    getDisputes, getDisputeById, createDispute, resolveDispute,
    getTransactions, getTransactionsByUser, createTransaction,
    getNotifications, addNotification,
  };
})();

// Auto-init on load
Store.init();
