/**
 * LANNENT — Main JavaScript
 * Scroll reveal, utilities, and shared behaviors
 */

// ═══════════════════════════════════════════
// SCROLL REVEAL
// ═══════════════════════════════════════════
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════
// STEP CONNECTOR (How It Works section)
// ═══════════════════════════════════════════
function initStepsConnector() {
  const connector = document.getElementById('stepsConnector');
  if (connector && window.innerWidth >= 768) {
    connector.style.display = 'block';
  }
}

// ═══════════════════════════════════════════
// SMOOTH SCROLL FOR ANCHOR LINKS
// ═══════════════════════════════════════════
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navHeight = 90;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// ═══════════════════════════════════════════
// NAVBAR SCROLL SHADOW
// ═══════════════════════════════════════════
function initNavbarScroll() {
  const nav = document.getElementById('homeNav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      nav.querySelector('.home-nav-inner').style.boxShadow =
        '0 10px 40px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.5)';
    } else {
      nav.querySelector('.home-nav-inner').style.boxShadow =
        '0 10px 40px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.5)';
    }
  });
}

// ═══════════════════════════════════════════
// NOTIFICATION DROPDOWN (dashboard pages)
// ═══════════════════════════════════════════
function initNotifications() {
  const btn = document.getElementById('notifBtn');
  if (!btn) return;

  const dropdown = document.createElement('div');
  dropdown.style.cssText = `
    position:absolute;top:calc(100% + 8px);right:0;
    width:320px;background:white;border:1px solid rgba(0,0,0,0.1);
    border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,0.12);
    z-index:100;padding:16px;display:none;
  `;
  dropdown.innerHTML = `
    <p style="font-weight:600;font-size:14px;margin-bottom:12px;">Notifications</p>
    ${[
      { icon:'check-circle', color:'#10b981', bg:'#ecfdf5', text:'Milestone approved', sub:'E-commerce Website · 2 min ago' },
      { icon:'message-square', color:'#6366f1', bg:'#eef2ff', text:'New message from Sarah', sub:'Mobile App Project · 10 min ago' },
      { icon:'dollar-sign', color:'#f59e0b', bg:'#fffbeb', text:'Payment released $1,200', sub:'API Integration · 1 hr ago' },
    ].map(n => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:10px;transition:background 0.15s;cursor:default;"
           onmouseenter="this.style.background='#f8f9fb'" onmouseleave="this.style.background='transparent'">
        <div style="width:36px;height:36px;border-radius:10px;background:${n.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i data-lucide="${n.icon}" style="width:16px;height:16px;color:${n.color};"></i>
        </div>
        <div>
          <p style="font-size:13px;font-weight:500;">${n.text}</p>
          <p style="font-size:12px;color:#94a3b8;">${n.sub}</p>
        </div>
      </div>`).join('')}
  `;

  btn.style.position = 'relative';
  btn.appendChild(dropdown);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
    if (!isOpen && window.lucide) lucide.createIcons();
  });

  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
  });
}

// ═══════════════════════════════════════════
// TASK / PROJECT FILTERING (Browse Tasks page)
// ═══════════════════════════════════════════
function initTaskFiltering() {
  const searchInput = document.getElementById('taskSearch');
  const categorySelect = document.getElementById('taskCategory');
  const cards = document.querySelectorAll('.task-card');
  if (!searchInput || !cards.length) return;

  function filterTasks() {
    const q = searchInput.value.toLowerCase();
    const cat = categorySelect ? categorySelect.value.toLowerCase() : '';
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const matchQ = !q || text.includes(q);
      const matchCat = !cat || text.includes(cat) || cat === 'all';
      card.style.display = (matchQ && matchCat) ? '' : 'none';
    });
  }

  searchInput.addEventListener('input', filterTasks);
  if (categorySelect) categorySelect.addEventListener('change', filterTasks);
}

// ═══════════════════════════════════════════
// MESSAGES — CONVERSATION SWITCHING
// ═══════════════════════════════════════════
function initMessages() {
  const items = document.querySelectorAll('.conversation-item');
  if (!items.length) return;

  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      // Update chat header info
      const name = item.querySelector('.convo-name');
      const chatName = document.getElementById('chatHeaderName');
      if (name && chatName) chatName.textContent = name.textContent;
    });
  });

  // Message send
  const sendBtn = document.getElementById('sendMessageBtn');
  const chatInput = document.getElementById('chatMessageInput');
  const chatMessages = document.getElementById('chatMessages');

  if (sendBtn && chatInput && chatMessages) {
    function sendMessage() {
      const text = chatInput.value.trim();
      if (!text) return;
      const msgEl = document.createElement('div');
      msgEl.className = 'message-row sent';
      msgEl.innerHTML = `
        <div class="message-bubble">${text}</div>
        <div class="message-avatar" style="background:linear-gradient(135deg,#6366f1,#4f46e5);">Me</div>
      `;
      chatMessages.appendChild(msgEl);
      chatInput.value = '';
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }
}

// ═══════════════════════════════════════════
// TABS COMPONENT
// ═══════════════════════════════════════════
function initTabs() {
  document.querySelectorAll('[data-tabs]').forEach(tabGroup => {
    const buttons = tabGroup.querySelectorAll('[data-tab-trigger]');
    const panels = tabGroup.querySelectorAll('[data-tab-panel]');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab-trigger');
        buttons.forEach(b => {
          b.style.background = 'transparent';
          b.style.color = 'var(--muted-foreground)';
          b.style.boxShadow = 'none';
        });
        btn.style.background = 'var(--card)';
        btn.style.color = 'var(--foreground)';
        btn.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
        panels.forEach(p => {
          p.style.display = p.getAttribute('data-tab-panel') === targetId ? '' : 'none';
        });
      });
    });
    // Activate first
    if (buttons.length) buttons[0].click();
  });
}

// ═══════════════════════════════════════════
// INIT ALL
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initStepsConnector();
  initSmoothScroll();
  initNavbarScroll();
  initNotifications();
  initTaskFiltering();
  initMessages();
  initTabs();
});
