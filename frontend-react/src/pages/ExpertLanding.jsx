/**
 * LANNENT — ExpertLanding
 * Converted from front-end/pages/expert-landing.html.
 *
 * Marketing page for Expert Reviewers: what the role is, how reviews work,
 * the reviewer tools, and links to apply or sign in.
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import usePageTitle from '../hooks/usePageTitle';
import usePublicStats, { compactMoney } from '../hooks/usePublicStats';
import useScrollReveal from '../hooks/useScrollReveal';
import useSmoothScroll from '../hooks/useSmoothScroll';
import pageCss from './ExpertLanding.css?raw';

export default function ExpertLanding() {
  usePageTitle('Expert Reviewer — Lannent');
  // Live figures — the page used to advertise invented ones.
  const stats = usePublicStats();
  useScrollReveal();   // shared reveal from main.js
  useSmoothScroll();   // smooth "#section" links + navbar shadow

  // This page also had its own, more eager reveal observer (threshold 0.08).
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <PageStyle css={pageCss} />
      {/* ══════════════════ NAV ══════════════════ */}
      <nav className="home-nav" id="homeNav">
        <div className="home-nav-inner">
          <Link to="/" className="nav-brand">
            Lannent
            <span>.</span>
          </Link>
          <div className="nav-links">
            <a href="#roleOverview" className="nav-link">Your Role</a>
            {' '}
            <a href="#reviewProcess" className="nav-link">How It Works</a>
            {' '}
            <a href="#reviewerTools" className="nav-link">Reviewer Tools</a>
          </div>
          <div className="nav-auth">
            <Link to="/expert-login" className="nav-login">Login</Link>
            {' '}
            <Link to="/expert-signup" className="nav-cta">Get Started</Link>
          </div>
        </div>
      </nav>
      {/* ══════════════════ HERO ══════════════════ */}
      <section className="hero-section">
        <video className="hero-video" autoPlay muted loop playsInline>
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay"></div>
        <div className="hero-content animate-fade-up">
          <h1>
            Ensure <em>Quality</em>
            <br />
            across every project
          </h1>
          <p>
            Review technical deliverables, resolve disputes, and maintain quality in the gig ecosystem — earn competitively while doing it.
          </p>
          <div className="hero-btns">
            <Link to="/expert-signup" style={{ flex: 1, display: 'contents' }}>
              <button className="btn-dark" style={{ width: '100%' }}>Apply as Reviewer</button>
            </Link>
            {' '}
            <Link to="/expert-login" style={{ flex: 1, display: 'contents' }}>
              <button className="btn-light" style={{ width: '100%' }}>Login</button>
            </Link>
          </div>
          {stats && stats.experts > 0 ? (
            <div className="hero-stars">
              <Icon name="shield-check" style={{ width: 16, height: 16, color: '#7c3aed' }} />
              <span>{`${stats.experts} Expert Reviewer${stats.experts === 1 ? '' : 's'} on Lannent · ${stats.disputesResolved + stats.auditsCompleted} cases completed`}</span>
            </div>
          ) : null}
        </div>
      </section>
      {/* ══════════════════ ROLE OVERVIEW ══════════════════ */}
      <section id="roleOverview" className="role-section reveal">
        <div className="role-bg-blob1"></div>
        <div className="role-bg-blob2"></div>
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)', backgroundSize: '64px 64px' }}></div>
        <div className="mx">
          <div className="sh reveal">
            <span className="pill pill-violet">✦ Your Role</span>
            <h2>
              What Expert Reviewers <span className="gt-vi">do</span>
            </h2>
            <p>
              Expert reviewers are the quality gatekeepers of the platform, ensuring fair outcomes and technical excellence.
            </p>
          </div>
          <div className="role-grid">
            {/* Technical Audits */}
            <div className="role-card reveal" style={{ background: '#eef2ff', borderColor: '#c7d2fe' }}>
              <div className="role-card-bar" style={{ background: 'linear-gradient(90deg,#6366f1,transparent)' }}></div>
              <div className="role-card-body">
                <div className="role-card-head">
                  <div className="role-card-ico" style={{ background: '#6366f1' }}>
                    <Icon name="code" style={{ width: 24, height: 24, color: 'white' }} />
                  </div>
                  <span className="role-card-tag" style={{ background: 'white', color: '#6366f1', borderColor: '#c7d2fe' }}>Code Review</span>
                </div>
                <h3>Technical Audits</h3>
                <p>
                  Review code quality, security vulnerabilities, and performance optimization to ensure deliverables meet industry standards.
                </p>
              </div>
            </div>
            {/* Dispute Resolution */}
            <div className="role-card reveal reveal-delay-1" style={{ background: '#faf5ff', borderColor: '#e9d5ff' }}>
              <div className="role-card-bar" style={{ background: 'linear-gradient(90deg,#a855f7,transparent)' }}></div>
              <div className="role-card-body">
                <div className="role-card-head">
                  <div className="role-card-ico" style={{ background: '#a855f7' }}>
                    <Icon name="scale" style={{ width: 24, height: 24, color: 'white' }} />
                  </div>
                  <span className="role-card-tag" style={{ background: 'white', color: '#a855f7', borderColor: '#e9d5ff' }}>Mediation</span>
                </div>
                <h3>Dispute Resolution</h3>
                <p>
                  Mediate conflicts between clients and gig workers, review evidence, and issue fair binding decisions.
                </p>
              </div>
            </div>
            {/* Quality Verification */}
            <div className="role-card reveal reveal-delay-2" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
              <div className="role-card-bar" style={{ background: 'linear-gradient(90deg,#10b981,transparent)' }}></div>
              <div className="role-card-body">
                <div className="role-card-head">
                  <div className="role-card-ico" style={{ background: '#10b981' }}>
                    <Icon name="badge-check" style={{ width: 24, height: 24, color: 'white' }} />
                  </div>
                  <span className="role-card-tag" style={{ background: 'white', color: '#10b981', borderColor: '#a7f3d0' }}>QA Gate</span>
                </div>
                <h3>Quality Verification</h3>
                <p>
                  Validate project milestones meet acceptance criteria before payment release to protect both parties.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ══════════════════ REVIEW PROCESS ══════════════════ */}
      <section id="reviewProcess" className="process-section reveal">
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%,rgba(224,231,255,.5) 0%,transparent 70%)' }}></div>
        <div className="mx">
          <div className="sh reveal">
            <span className="pill pill-indigo">✦ How It Works</span>
            <h2>
              The review process in <span className="gt-in">five steps</span>
            </h2>
          </div>
          <div className="process-grid">
            <div className="process-line"></div>
            <div className="proc-item reveal">
              <div className="proc-ico" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                <Icon name="file-check" style={{ width: 22, height: 22, color: 'white' }} />
              </div>
              <span className="proc-step">01</span>
              <h3>Worker Submits</h3>
              <p>Milestone completed and submitted for review</p>
            </div>
            <div className="proc-item reveal reveal-delay-1">
              <div className="proc-ico" style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>
                <Icon name="search" style={{ width: 22, height: 22, color: 'white' }} />
              </div>
              <span className="proc-step">02</span>
              <h3>Audit Requested</h3>
              <p>Client or platform requests technical audit</p>
            </div>
            <div className="proc-item reveal reveal-delay-2">
              <div className="proc-ico" style={{ background: 'linear-gradient(135deg,#a855f7,#9333ea)' }}>
                <Icon name="code" style={{ width: 22, height: 22, color: 'white' }} />
              </div>
              <span className="proc-step">03</span>
              <h3>Expert Evaluates</h3>
              <p>You review code, security, and quality</p>
            </div>
            <div className="proc-item reveal reveal-delay-3">
              <div className="proc-ico" style={{ background: 'linear-gradient(135deg,#ec4899,#db2777)' }}>
                <Icon name="bar-chart-3" style={{ width: 22, height: 22, color: 'white' }} />
              </div>
              <span className="proc-step">04</span>
              <h3>Report Generated</h3>
              <p>Detailed findings and recommendations</p>
            </div>
            <div className="proc-item reveal reveal-delay-4">
              <div className="proc-ico" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
                <Icon name="check-circle" style={{ width: 22, height: 22, color: 'white' }} />
              </div>
              <span className="proc-step">05</span>
              <h3>Result Delivered</h3>
              <p>Client receives verified result</p>
            </div>
          </div>
        </div>
      </section>
      {/* ══════════════════ TOOLS BENTO ══════════════════ */}
      <section id="reviewerTools" className="bento-section reveal">
        <div style={{ pointerEvents: 'none', position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.3),transparent)' }}></div>
        <div style={{ pointerEvents: 'none', position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.3),transparent)' }}></div>
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(139,92,246,.06) 1px,transparent 1px)', backgroundSize: '32px 32px' }}></div>
        <div className="mx">
          <div className="sh reveal">
            <span className="pill pill-violet">◈ Reviewer Tools</span>
            <h2>
              Professional tools for <span className="gt-vi">expert work</span>
            </h2>
            <p>Everything you need to conduct thorough audits and fair dispute resolution.</p>
          </div>
          <div className="bento-grid reveal">
            {/* Audit Dashboard */}
            <div className="bento-card" style={{ background: 'linear-gradient(145deg,#eef2ff,#e0e7ff)', borderColor: '#c7d2fe' }}>
              <div className="bento-blob" style={{ top: 0, right: 0, width: 256, height: 256, background: 'radial-gradient(circle,rgba(99,102,241,.3),transparent 70%)', transform: 'translate(30%,-30%)', opacity: '.4' }}></div>
              <div style={{ position: 'relative' }}>
                <div className="bento-ico" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                  <Icon name="target" style={{ width: 26, height: 26, color: 'white' }} />
                </div>
                <h3>Audit Dashboard</h3>
                <p>
                  Track all assigned audits with priority sorting, deadline management, and real-time status updates.
                </p>
                <div className="bento-checklist">
                  <div className="bento-check">
                    <div className="bento-check-dot">
                      <Icon name="check" style={{ width: 9, height: 9, color: 'white' }} />
                    </div>
                    <span>Priority queue sorting</span>
                  </div>
                  <div className="bento-check">
                    <div className="bento-check-dot">
                      <Icon name="check" style={{ width: 9, height: 9, color: 'white' }} />
                    </div>
                    <span>Deadline alerts &amp; reminders</span>
                  </div>
                  <div className="bento-check">
                    <div className="bento-check-dot">
                      <Icon name="check" style={{ width: 9, height: 9, color: 'white' }} />
                    </div>
                    <span>Audit history &amp; analytics</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Dispute Panel */}
            <div className="bento-card" style={{ background: 'linear-gradient(145deg,#fdf4ff,#fae8ff)', borderColor: '#e9d5ff', display: 'flex', flexDirection: 'column' }}>
              <div className="bento-blob" style={{ top: 0, right: 0, width: 288, height: 288, background: 'radial-gradient(circle,rgba(168,85,247,.4),transparent 70%)', transform: 'translate(20%,-20%)', opacity: '.3' }}></div>
              <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div className="bento-ico" style={{ background: 'linear-gradient(135deg,#a855f7,#9333ea)', marginBottom: 0 }}>
                    <Icon name="scale" style={{ width: 26, height: 26, color: 'white' }} />
                  </div>
                  <div className="disp-badge">⚖️ Fair &amp; Binding</div>
                </div>
                <h3>Dispute Resolution Panel</h3>
                <p>
                  Review evidence, chat history, and deliverables in one unified interface. Issue fair binding decisions backed by complete context.
                </p>
                <div className="disp-progress">
                  <div className="disp-progress-inner">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                      <span style={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em' }}>Active Dispute</span>
                      <span style={{ color: '#9333ea' }}>● Under Review</span>
                    </div>
                    <div className="disp-prog-bar">
                      <div className="disp-prog-fill"></div>
                    </div>
                    <div className="disp-prog-meta">
                      <span style={{ color: '#94a3b8' }}>Evidence reviewed: 7/10</span>
                      {' '}
                      <span style={{ color: '#a855f7', fontWeight: 700 }}>48h deadline</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bento-grid2 reveal">
            {/* Code Review Tools */}
            <div className="bento-card" style={{ background: 'linear-gradient(145deg,#ecfdf5,#d1fae5)', borderColor: '#a7f3d0' }}>
              <div className="bento-blob" style={{ bottom: 0, left: 0, width: 288, height: 288, background: 'radial-gradient(circle,rgba(16,185,129,.4),transparent 70%)', transform: 'translate(-20%,30%)', opacity: '.25' }}></div>
              <div style={{ position: 'relative' }}>
                <div className="bento-ico" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                  <Icon name="code" style={{ width: 26, height: 26, color: 'white' }} />
                </div>
                <h3>Code Review Tools</h3>
                <p>
                  Built-in code analysis, OWASP security scanning, and performance profiling — all within the review interface.
                </p>
                <div className="bento-tools">
                  <div className="bento-tool-item">
                    <span>Security Scan</span>
                    <span style={{ fontWeight: 900, color: '#10b981' }}>OWASP</span>
                  </div>
                  <div className="bento-tool-item">
                    <span>Perf Profiling</span>
                    <span style={{ fontWeight: 900, color: '#6366f1' }}>Live</span>
                  </div>
                  <div className="bento-tool-item">
                    <span>Code Linting</span>
                    <span style={{ fontWeight: 900, color: '#a855f7' }}>Auto</span>
                  </div>
                  <div className="bento-tool-item">
                    <span>Diff Viewer</span>
                    <span style={{ fontWeight: 900, color: '#f59e0b' }}>Side-by-side</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Project Reports */}
            <div className="bento-card" style={{ background: 'linear-gradient(145deg,#fff7ed,#ffedd5)', borderColor: '#fed7aa' }}>
              <div className="bento-ico" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                <Icon name="bar-chart-3" style={{ width: 26, height: 26, color: 'white' }} />
              </div>
              <h3>Project Reports</h3>
              <p>
                Generate professional audit reports with findings, scoring, recommendations, and decisions clients and workers can trust.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* ══════════════════ DASHBOARD PREVIEW ══════════════════ */}
      <section className="dash-section reveal">
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 60% at 50% 50%,rgba(224,231,255,.5) 0%,transparent 65%)' }}></div>
        <div className="mx">
          <div className="sh reveal">
            <span className="pill pill-sky">◉ Dashboard</span>
            <h2>
              Your expert <span className="gt-sk">command center</span>
            </h2>
            <p>Track audits, manage disputes, and review analytics — all from one beautiful workspace.</p>
          </div>
          <div style={{ position: 'relative' }} className="reveal">
            <div style={{ position: 'absolute', inset: -24, borderRadius: 40, background: 'linear-gradient(135deg,rgba(99,102,241,.15),rgba(168,85,247,.1),rgba(6,182,212,.1))', filter: 'blur(24px)', pointerEvents: 'none' }}></div>
            <div className="dash-frame">
              {/* Window bar */}
              <div className="dash-bar">
                <div className="dash-dot" style={{ background: '#f87171' }}></div>
                <div className="dash-dot" style={{ background: '#fbbf24' }}></div>
                <div className="dash-dot" style={{ background: '#34d399' }}></div>
                <div className="dash-url">
                  <div className="dash-url-inner">
                    <div className="dash-url-dot"></div>
                    lannent.app/reviewer/dashboard
                  </div>
                </div>
                <div className="dash-live" title="An illustration with sample data">
                  Example
                </div>
              </div>
              {/* Dashboard body */}
              <div className="dash-body">
                <div className="dash-stats">
                  <div className="dash-stat">
                    <div className="dash-stat-label">Pending Reviews</div>
                    <div className="dash-stat-val" style={{ color: '#f97316' }}>8</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-label">Completed This Month</div>
                    <div className="dash-stat-val" style={{ color: '#10b981' }}>24</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-label">Avg. Review Time</div>
                    <div className="dash-stat-val" style={{ color: '#6366f1' }}>2.4h</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-label">Total Earnings</div>
                    <div className="dash-stat-val" style={{ color: '#8b5cf6' }}>₹3,200</div>
                  </div>
                </div>
                <div className="dash-audits">
                  <div className="dash-audit">
                    <div className="dash-audit-left">
                      <div className="dash-audit-ico">
                        <Icon name="file-check" style={{ width: 18, height: 18, color: '#6366f1' }} />
                      </div>
                      <div>
                        <div className="dash-audit-title">E-Commerce Backend API</div>
                        <div className="dash-audit-type">Technical Audit</div>
                      </div>
                    </div>
                    <div className="dash-audit-badges">
                      <span className="badge" style={{ background: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' }}>High</span>
                      {' '}
                      <span className="badge" style={{ background: '#eef2ff', color: '#4f46e5', borderColor: '#c7d2fe' }}>In Progress</span>
                    </div>
                  </div>
                  <div className="dash-audit">
                    <div className="dash-audit-left">
                      <div className="dash-audit-ico">
                        <Icon name="file-check" style={{ width: 18, height: 18, color: '#6366f1' }} />
                      </div>
                      <div>
                        <div className="dash-audit-title">Mobile App — Payment Gateway</div>
                        <div className="dash-audit-type">Dispute Resolution</div>
                      </div>
                    </div>
                    <div className="dash-audit-badges">
                      <span className="badge" style={{ background: '#fff1f2', color: '#be123c', borderColor: '#fecdd3' }}>Urgent</span>
                      {' '}
                      <span className="badge" style={{ background: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' }}>Pending</span>
                    </div>
                  </div>
                  <div className="dash-audit">
                    <div className="dash-audit-left">
                      <div className="dash-audit-ico">
                        <Icon name="file-check" style={{ width: 18, height: 18, color: '#6366f1' }} />
                      </div>
                      <div>
                        <div className="dash-audit-title">Landing Page Design Review</div>
                        <div className="dash-audit-type">Technical Audit</div>
                      </div>
                    </div>
                    <div className="dash-audit-badges">
                      <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>Medium</span>
                      {' '}
                      <span className="badge" style={{ background: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' }}>Pending</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ══════════════════ BENEFITS / EARNINGS ══════════════════ */}
      <section className="benefits-section reveal">
        <div style={{ pointerEvents: 'none', position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(168,85,247,.4),transparent)' }}></div>
        <div style={{ pointerEvents: 'none', position: 'absolute', right: -160, top: 80, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,85,247,.1),transparent 70%)' }}></div>
        <div className="mx">
          <div className="benefits-layout">
            {/* Left: copy */}
            <div className="benefits-left reveal">
              <span className="pill pill-violet">★ Why Join</span>
              <h2 style={{ fontSize: 'clamp(34px,4.5vw,58px)', fontWeight: 500, letterSpacing: '-.04em', lineHeight: 1.05, marginTop: 20 }}>
                Expert Reviewer <span className="gt-pu">benefits</span>
              </h2>
              <p style={{ marginTop: 18, color: '#64748b', fontSize: 17, lineHeight: 1.7, maxWidth: 460 }}>
                Join an elite network of technical experts earning competitive fees while building your professional reputation in the gig economy.
              </p>
              <div className="benefits-list">
                <div className="benefit-item">
                  <div className="benefit-ico" style={{ background: 'rgba(168,85,247,.12)', border: '1.5px solid rgba(168,85,247,.25)' }}>
                    <Icon name="indian-rupee" style={{ width: 18, height: 18, color: '#a855f7' }} />
                  </div>
                  <div>
                    <div className="benefit-title">Set your own fee for every case</div>
                    <div className="benefit-desc">You agree the price with the client up front; it is held in escrow and paid to your wallet when the review is done</div>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-ico" style={{ background: 'rgba(99,102,241,.12)', border: '1.5px solid rgba(99,102,241,.25)' }}>
                    <Icon name="award" style={{ width: 18, height: 18, color: '#6366f1' }} />
                  </div>
                  <div>
                    <div className="benefit-title">Build verified reputation</div>
                    <div className="benefit-desc">Every completed audit and dispute counts towards the record clients see when they choose a reviewer</div>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-ico" style={{ background: 'rgba(16,185,129,.12)', border: '1.5px solid rgba(16,185,129,.25)' }}>
                    <Icon name="trending-up" style={{ width: 18, height: 18, color: '#10b981' }} />
                  </div>
                  <div>
                    <div className="benefit-title">Work on quality projects</div>
                    <div className="benefit-desc">High-calibre projects from vetted clients across the platform</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Right: earnings card */}
            <div className="benefits-right reveal">
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', inset: -16, borderRadius: 32, background: 'linear-gradient(135deg,rgba(168,85,247,.15),rgba(99,102,241,.1))', filter: 'blur(20px)', pointerEvents: 'none' }}></div>
                <div className="earnings-card">
                  <div className="earnings-header">
                    <div className="earnings-ico">
                      <Icon name="indian-rupee" style={{ width: 22, height: 22, color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Earnings Summary</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>Example month · sample figures</div>
                    </div>
                  </div>
                  <div className="earnings-rows">
                    <div className="earnings-row" style={{ background: '#eef2ff', border: '1px solid rgba(99,102,241,.15)' }}>
                      <div className="earnings-row-top">
                        <div>
                          <div className="earnings-row-label">Technical Audits</div>
                          <div className="earnings-row-count">18 reviews</div>
                        </div>
                        <div className="earnings-row-amount" style={{ color: '#6366f1' }}>₹2,340</div>
                      </div>
                      <div className="earnings-bar-bg" style={{ background: 'rgba(99,102,241,.15)' }}>
                        <div className="earnings-bar-fill" style={{ width: '75%', background: 'linear-gradient(90deg,#6366f1,#818cf8)', boxShadow: '0 0 8px rgba(99,102,241,.5)' }}></div>
                      </div>
                    </div>
                    <div className="earnings-row" style={{ background: '#faf5ff', border: '1px solid rgba(168,85,247,.15)' }}>
                      <div className="earnings-row-top">
                        <div>
                          <div className="earnings-row-label">Dispute Resolutions</div>
                          <div className="earnings-row-count">6 reviews</div>
                        </div>
                        <div className="earnings-row-amount" style={{ color: '#a855f7' }}>₹860</div>
                      </div>
                      <div className="earnings-bar-bg" style={{ background: 'rgba(168,85,247,.15)' }}>
                        <div className="earnings-bar-fill" style={{ width: '28%', background: 'linear-gradient(90deg,#a855f7,#c084fc)', boxShadow: '0 0 8px rgba(168,85,247,.5)' }}></div>
                      </div>
                    </div>
                    <div className="earnings-row" style={{ background: '#ecfdf5', border: '1px solid rgba(16,185,129,.15)' }}>
                      <div className="earnings-row-top">
                        <div>
                          <div className="earnings-row-label">Quality Verifications</div>
                          <div className="earnings-row-count">12 reviews</div>
                        </div>
                        <div className="earnings-row-amount" style={{ color: '#10b981' }}>₹720</div>
                      </div>
                      <div className="earnings-bar-bg" style={{ background: 'rgba(16,185,129,.15)' }}>
                        <div className="earnings-bar-fill" style={{ width: '23%', background: 'linear-gradient(90deg,#10b981,#34d399)', boxShadow: '0 0 8px rgba(16,185,129,.5)' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="earnings-total">
                    <span className="earnings-total-label">Total Earned</span>
                    {' '}
                    <span className="earnings-total-val">₹3,920</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ══════════════════ METRICS ══════════════════ */}
      <section className="metrics-section reveal">
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 70% at 50% 50%,rgba(224,231,255,.6) 0%,transparent 70%)' }}></div>
        <div className="mx">
          <div className="sh reveal">
            <span className="pill pill-cyan">◎ By the Numbers</span>
            <h2>
              Live from the <span className="gt-cy">platform</span>
            </h2>
          </div>
          <div className="metrics-grid">
            <div className="metric-card reveal" style={{ background: '#eef2ff', borderColor: '#c7d2fe' }}>
              <div className="metric-ico" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                <Icon name="users" style={{ width: 24, height: 24, color: 'white' }} />
              </div>
              <div className="metric-val gt-in">{stats ? stats.experts.toLocaleString('en-IN') : '—'}</div>
              <div className="metric-label">Expert Reviewers</div>
            </div>
            <div className="metric-card reveal reveal-delay-1" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
              <div className="metric-ico" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <Icon name="file-check" style={{ width: 24, height: 24, color: 'white' }} />
              </div>
              <div className="metric-val" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stats ? stats.auditsCompleted.toLocaleString('en-IN') : '—'}</div>
              <div className="metric-label">Audits completed</div>
            </div>
            <div className="metric-card reveal reveal-delay-2" style={{ background: '#faf5ff', borderColor: '#e9d5ff' }}>
              <div className="metric-ico" style={{ background: 'linear-gradient(135deg,#a855f7,#9333ea)' }}>
                <Icon name="scale" style={{ width: 24, height: 24, color: 'white' }} />
              </div>
              <div className="metric-val gt-pu">{stats ? stats.disputesResolved.toLocaleString('en-IN') : '—'}</div>
              <div className="metric-label">Disputes resolved</div>
            </div>
            <div className="metric-card reveal reveal-delay-3" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
              <div className="metric-ico" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                <Icon name="wallet" style={{ width: 24, height: 24, color: 'white' }} />
              </div>
              <div className="metric-val gt-am">{stats ? compactMoney(stats.paidToReviewers) : '—'}</div>
              <div className="metric-label">Paid to reviewers</div>
            </div>
          </div>
        </div>
      </section>
      {/* ══════════════════ CTA ══════════════════ */}
      <section className="cta-section reveal">
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 50%,rgba(99,102,241,.15) 0%,transparent 70%)' }}></div>
        <div style={{ pointerEvents: 'none', position: 'absolute', top: -128, left: -128, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(167,139,250,.2),transparent 70%)' }}></div>
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)', backgroundSize: '48px 48px' }}></div>
        <div className="cta-inner">
          <div className="cta-badge">
            <div className="cta-badge-dot"></div>
            <span>Applications open now</span>
          </div>
          <h2>
            Join the Expert Reviewer <span className="gt-in">Network</span>
            .
          </h2>
          <p>
            Apply today and start earning competitive fees while ensuring quality and trust across the platform.
          </p>
          <div className="cta-btns">
            <Link to="/expert-signup">
              <button className="btn-grad">
                Apply as Reviewer <Icon name="arrow-right" style={{ width: 18, height: 18 }} />
              </button>
            </Link>
            {' '}
            <Link to="/expert-login">
              <button className="btn-glass">Login</button>
            </Link>
          </div>
          <p className="cta-note">Applications are reviewed by our intake team · No upfront cost · Paid per completed case</p>
        </div>
      </section>
      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="site-footer">
        <div className="mx">
          <div className="footer-grid">
            <div>
              <div className="footer-col-title">Product</div>
              <ul className="footer-col">
                <li>
                  <a href="#">Features</a>
                </li>
                <li>
                  <a href="#">Pricing</a>
                </li>
                <li>
                  <a href="#">Integrations</a>
                </li>
                <li>
                  <a href="#">Changelog</a>
                </li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Resources</div>
              <ul className="footer-col">
                <li>
                  <a href="#">Documentation</a>
                </li>
                <li>
                  <a href="#">Blog</a>
                </li>
                <li>
                  <a href="#">Support</a>
                </li>
                <li>
                  <a href="#">Status</a>
                </li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Company</div>
              <ul className="footer-col">
                <li>
                  <a href="#">About</a>
                </li>
                <li>
                  <a href="#">Careers</a>
                </li>
                <li>
                  <a href="#">Contact</a>
                </li>
                <li>
                  <a href="#">Press</a>
                </li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Legal</div>
              <ul className="footer-col">
                <li>
                  <a href="#">Terms</a>
                </li>
                <li>
                  <a href="#">Privacy</a>
                </li>
                <li>
                  <a href="#">Security</a>
                </li>
                <li>
                  <a href="#">Cookies</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-brand">
              <div className="footer-logo-icon">
                <Icon name="zap" style={{ width: 14, height: 14, color: 'white' }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>Lannent</span>
              {' '}
              <span style={{ fontSize: 13, color: '#94a3b8' }}>© 2026 All rights reserved.</span>
            </div>
            <div className="footer-badges">
              <div className="footer-badge" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <Icon name="shield-check" style={{ width: 13, height: 13, color: '#059669' }} />
                {' '}
                <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>SOC 2 Type II</span>
              </div>
              <div className="footer-badge" style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                <Icon name="lock" style={{ width: 13, height: 13, color: '#4f46e5' }} />
                {' '}
                <span style={{ fontSize: 12, fontWeight: 700, color: '#4338ca' }}>Escrow Protected</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
