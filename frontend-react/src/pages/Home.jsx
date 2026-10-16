/**
 * LANNENT — Home (landing page)
 * Converted from front-end/index.html.
 *
 * Static marketing page: hero video, problem cards, how-it-works steps,
 * feature bento grid, product preview, expert review, testimonials, metrics,
 * call to action and footer.
 */
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import usePageTitle from '../hooks/usePageTitle';
import usePublicStats, { compactMoney } from '../hooks/usePublicStats';
import useScrollReveal from '../hooks/useScrollReveal';
import useSmoothScroll from '../hooks/useSmoothScroll';
import pageCss from './Home.css?raw';

export default function Home() {
  usePageTitle('Lannent — Trusted Collaboration for Freelance Projects');
  useScrollReveal();   // fades in every ".reveal" section on scroll
  useSmoothScroll();   // smooth "#section" links + navbar shadow + steps connector
  // Live figures from the platform — the page used to show invented ones.
  const stats = usePublicStats();
  const members = stats ? stats.clients + stats.workers + stats.experts : 0;

  return (
    <>
      <PageStyle css={pageCss} />
      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className="home-nav" id="homeNav">
        <div className="home-nav-inner">
          <Link to="/" className="nav-brand">
            Lannent
            <span>.</span>
          </Link>
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            {' '}
            <a href="#how-it-works" className="nav-link">How It Works</a>
            {' '}
            <a href="#product" className="nav-link">Product</a>
            {' '}
            <Link to="/expert-landing" className="nav-link">For Experts</Link>
          </div>
          <div className="nav-auth">
            <Link to="/login" className="nav-login">Login</Link>
            {' '}
            <Link to="/signup" className="nav-cta">Get Started</Link>
          </div>
        </div>
      </nav>
      {/* ═══════════ HERO ═══════════ */}
      <section className="hero">
        <div className="hero-video-wrap">
          <video className="hero-video" autoPlay muted loop playsInline>
            <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4" type="video/mp4" />
          </video>
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-content">
          <h1 className="hero-title animate-fade-up">
            Trusted <span className="serif">collaboration</span>
            <br />
            for your freelance projects
          </h1>
          <p className="hero-sub animate-fade-up animate-fade-up-1">
            Hire skilled gig workers, manage milestones, and release secure escrow payments — with optional expert technical audits to guarantee high-quality deliverables.
          </p>
          <div className="hero-actions animate-fade-up animate-fade-up-2">
            <Link to="/signup" style={{ width: '100%' }}>
              <button className="btn-hero">Get Started</button>
            </Link>
            {stats && members > 0 ? (
              <div className="hero-trust">
                <span style={{ fontWeight: 500 }}>
                  {`${members.toLocaleString('en-IN')} member${members === 1 ? '' : 's'} building on Lannent`}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </section>
      {/* ═══════════ PROBLEM ═══════════ */}
      <section className="section-problem">
        <div className="section-grid-bg"></div>
        <div className="container relative" style={{ zIndex: 1 }}>
          <div className="section-header reveal">
            <span className="pill pill-rose">⚡ The Problem</span>
            <h2 className="section-title">
              Why traditional platforms <span className="grad-rose">fail you</span>
            </h2>
            <p className="section-sub">The old way of hiring freelancers is broken. No validation, no trust, no protection.</p>
          </div>
          <div className="cards-3">
            <div className="problem-card reveal reveal-delay-1" style={{ background: '#fff1f3', border: '1.5px solid #ffe4e8', boxShadow: '0 2px 24px rgba(0,0,0,0.04)' }}>
              <div className="problem-card-accent" style={{ background: 'linear-gradient(90deg,#f43f5e,transparent)' }}></div>
              <div className="problem-card-body">
                <div className="problem-card-header">
                  <div className="problem-icon" style={{ background: '#f43f5e' }}>
                    <Icon name="search" style={{ color: 'white', width: 24, height: 24 }} />
                  </div>
                  <span className="problem-tag" style={{ color: '#f43f5e', borderColor: '#ffe4e8' }}>Quality Risk</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.2, marginBottom: 12, color: '#0f172a' }}>Poor Code Quality</h3>
                <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7 }}>
                  Deliverables that don't meet standards, with no way to validate technical quality before paying.
                </p>
              </div>
            </div>
            <div className="problem-card reveal reveal-delay-2" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', boxShadow: '0 2px 24px rgba(0,0,0,0.04)' }}>
              <div className="problem-card-accent" style={{ background: 'linear-gradient(90deg,#f97316,transparent)' }}></div>
              <div className="problem-card-body">
                <div className="problem-card-header">
                  <div className="problem-icon" style={{ background: '#f97316' }}>
                    <Icon name="banknote" style={{ color: 'white', width: 24, height: 24 }} />
                  </div>
                  <span className="problem-tag" style={{ color: '#f97316', borderColor: '#fed7aa' }}>Financial Risk</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.2, marginBottom: 12, color: '#0f172a' }}>Payment Disputes</h3>
                <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7 }}>
                  Clients and freelancers fight over incomplete work and missing payments with no fair resolution.
                </p>
              </div>
            </div>
            <div className="problem-card reveal reveal-delay-3" style={{ background: '#f5f3ff', border: '1.5px solid #e9d5ff', boxShadow: '0 2px 24px rgba(0,0,0,0.04)' }}>
              <div className="problem-card-accent" style={{ background: 'linear-gradient(90deg,#8b5cf6,transparent)' }}></div>
              <div className="problem-card-body">
                <div className="problem-card-header">
                  <div className="problem-icon" style={{ background: '#8b5cf6' }}>
                    <Icon name="shield-check" style={{ color: 'white', width: 24, height: 24 }} />
                  </div>
                  <span className="problem-tag" style={{ color: '#8b5cf6', borderColor: '#e9d5ff' }}>Trust Gap</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.2, marginBottom: 12, color: '#0f172a' }}>No Technical Validation</h3>
                <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7 }}>
                  No expert reviews to verify the work actually meets requirements, leaving clients guessing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="section-how" id="how-it-works">
        <div className="container relative" style={{ zIndex: 1 }}>
          <div className="section-header reveal">
            <span className="pill pill-indigo">✦ How It Works</span>
            <h2 className="section-title">
              From idea to <span className="grad-indigo">delivered</span> in four steps
            </h2>
          </div>
          <div className="steps-grid" style={{ position: 'relative' }}>
            <div className="steps-connector" id="stepsConnector"></div>
            <div className="step-item reveal reveal-delay-1">
              <div className="step-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                <Icon name="clipboard-list" style={{ color: 'white', width: 24, height: 24 }} />
              </div>
              <span className="step-num">01</span>
              <h3 className="step-title">Post a Task</h3>
              <p className="step-desc">Describe your project, define milestones, and fund the escrow wallet.</p>
            </div>
            <div className="step-item reveal reveal-delay-2">
              <div className="step-icon" style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>
                <Icon name="users" style={{ color: 'white', width: 24, height: 24 }} />
              </div>
              <span className="step-num">02</span>
              <h3 className="step-title">Hire Talent</h3>
              <p className="step-desc">Browse vetted profiles and hire the perfect gig worker for your project.</p>
            </div>
            <div className="step-item reveal reveal-delay-3">
              <div className="step-icon" style={{ background: 'linear-gradient(135deg,#a855f7,#9333ea)' }}>
                <Icon name="handshake" style={{ color: 'white', width: 24, height: 24 }} />
              </div>
              <span className="step-num">03</span>
              <h3 className="step-title">Collaborate</h3>
              <p className="step-desc">Track real-time progress in dedicated workrooms with live communication.</p>
            </div>
            <div className="step-item reveal reveal-delay-4">
              <div className="step-icon" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
                <Icon name="lock" style={{ color: 'white', width: 24, height: 24 }} />
              </div>
              <span className="step-num">04</span>
              <h3 className="step-title">Pay Securely</h3>
              <p className="step-desc">Funds unlock only after milestones pass quality checks and your approval.</p>
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════ FEATURES BENTO ═══════════ */}
      <section className="section-features" id="features" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.3),transparent)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.3),transparent)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(139,92,246,0.06) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }}></div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-header reveal">
            <span className="pill pill-violet">◈ Features</span>
            <h2 className="section-title">
              Every tool you need to <span className="grad-violet">ship great work</span>
            </h2>
            <p className="section-sub">
              Built for serious builders who demand transparency, quality, and security in every project.
            </p>
          </div>
          <div className="bento-grid">
            {/* Milestone (col 5) */}
            <div className="bento-card bento-col-5 reveal" style={{ background: 'linear-gradient(145deg,#eef2ff,#e0e7ff)', border: '1.5px solid #c7d2fe', minHeight: 320 }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 256, height: 256, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.3),transparent 70%)', transform: 'translate(30%,-30%)', opacity: 0.4, pointerEvents: 'none' }}></div>
              <div style={{ position: 'relative' }}>
                <div className="bento-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                  <Icon name="layout" style={{ color: 'white', width: 26, height: 26 }} />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 22, marginBottom: 12, color: '#0f172a', letterSpacing: '-0.025em' }}>Milestone-Based Tasks</h3>
                <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, maxWidth: 280 }}>
                  Break complex projects into crystal-clear milestones with deliverables, deadlines, and acceptance criteria.
                </p>
                <div style={{ marginTop: 32 }}>
                  <div className="bento-checkrow">
                    <div className="check-dot">✓</div>
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Define scope &amp; deliverables</span>
                  </div>
                  <div className="bento-checkrow">
                    <div className="check-dot">✓</div>
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Set payment per milestone</span>
                  </div>
                  <div className="bento-checkrow">
                    <div className="check-dot">✓</div>
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Track completion status</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Escrow (col 7) */}
            <div className="bento-card bento-col-7 reveal reveal-delay-1" style={{ background: 'linear-gradient(145deg,#ecfdf5,#d1fae5)', border: '1.5px solid #a7f3d0', minHeight: 320, display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 288, height: 288, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,0.4),transparent 70%)', transform: 'translate(20%,-20%)', opacity: 0.3, pointerEvents: 'none' }}></div>
              <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div className="bento-icon" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    <Icon name="lock" style={{ color: 'white', width: 26, height: 26 }} />
                  </div>
                  <div style={{ padding: '8px 16px', borderRadius: 16, fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid #a7f3d0' }}>🔒 Bank-grade</div>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 22, marginBottom: 12, color: '#0f172a' }}>Escrow-Secured Payments</h3>
                <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7 }}>
                  Funds are cryptographically held in escrow and released only when your quality checks pass. Zero risk for both parties.
                </p>
                <div style={{ marginTop: 'auto', paddingTop: 24 }}>
                  <div className="escrow-progress-wrap">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Escrow Status</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>● Active</span>
                    </div>
                    <div className="progress-bar-track" style={{ background: '#d1fae5' }}>
                      <div className="progress-bar-fill" style={{ width: '65%', background: 'linear-gradient(90deg,#10b981,#34d399)', boxShadow: '0 0 12px rgba(16,185,129,0.5)' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Released: ₹3,900</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Held: ₹2,100</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Expert Audits (col 7) */}
            <div className="bento-card bento-col-7 reveal" style={{ background: 'linear-gradient(145deg,#fdf4ff,#fae8ff)', border: '1.5px solid #e9d5ff', minHeight: 280 }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: 288, height: 288, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,85,247,0.4),transparent 70%)', transform: 'translate(-20%,30%)', opacity: 0.25, pointerEvents: 'none' }}></div>
              <div style={{ position: 'relative' }}>
                <div className="bento-icon" style={{ background: 'linear-gradient(135deg,#a855f7,#9333ea)' }}>
                  <Icon name="file-check" style={{ color: 'white', width: 26, height: 26 }} />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 22, marginBottom: 12, color: '#0f172a' }}>Expert Technical Audits</h3>
                <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, maxWidth: 360 }}>
                  Vetted senior engineers audit deliverables for security, performance, and code quality before a single cent is released.
                </p>
                <div className="audit-metrics">
                  <div className="audit-metric">
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Code Quality Score</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#a855f7' }}>94</span>
                  </div>
                  <div className="audit-metric">
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Security Issues</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#10b981' }}>0</span>
                  </div>
                  <div className="audit-metric">
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Performance Issues</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#6366f1' }}>2</span>
                  </div>
                  <div className="audit-metric">
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Document Score</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#f59e0b' }}>88</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Kanban (col 5) */}
            <div className="bento-card bento-col-5 reveal reveal-delay-1" style={{ background: 'linear-gradient(145deg,#f8fafc,#f1f5f9)', border: '1.5px solid #cbd5e1', minHeight: 280, padding: 24 }}>
              <div style={{ position: 'relative' }}>
                <div className="bento-icon" style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                  <Icon name="message-square" style={{ color: 'white', width: 26, height: 26 }} />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 22, marginBottom: 8, color: '#0f172a' }}>Project Kanban Board</h3>
                <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>Track milestones and deliverables in real-time</p>
                <div className="mini-kanban">
                  <div className="mini-col" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #e2e8f0' }}>
                    <div className="mini-col-header">
                      <div className="mini-dot" style={{ background: '#94a3b8' }}></div>
                      <span className="mini-col-title" style={{ color: '#475569' }}>To Do</span>
                      {' '}
                      <span className="mini-count" style={{ color: '#94a3b8' }}>1</span>
                    </div>
                    <div className="mini-card">
                      <p className="mini-card-title">UI Wireframes</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        <span style={{ fontSize: 9, color: '#059669', fontWeight: 500, padding: '2px 6px', borderRadius: 4, background: '#d1fae5' }}>₹800</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'white' }}>A</div>
                        <span style={{ fontSize: 9, color: '#64748b' }}>Due Mar 8</span>
                      </div>
                    </div>
                  </div>
                  <div className="mini-col" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #dbeafe' }}>
                    <div className="mini-col-header">
                      <div className="mini-dot" style={{ background: '#3b82f6' }}></div>
                      <span className="mini-col-title" style={{ color: '#3b82f6' }}>Active</span>
                      {' '}
                      <span className="mini-count" style={{ color: '#93c5fd' }}>1</span>
                    </div>
                    <div className="mini-card" style={{ borderColor: '#dbeafe' }}>
                      <p className="mini-card-title">Frontend</p>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 8, color: '#64748b' }}>Progress</span>
                          <span style={{ fontSize: 8, fontWeight: 700, color: '#3b82f6' }}>60%</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 9999, background: '#dbeafe', overflow: 'hidden' }}>
                          <div style={{ width: '60%', height: '100%', background: '#3b82f6', borderRadius: 9999 }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mini-col" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #fed7aa' }}>
                    <div className="mini-col-header">
                      <div className="mini-dot" style={{ background: '#f97316' }}></div>
                      <span className="mini-col-title" style={{ color: '#f97316' }}>Review</span>
                      {' '}
                      <span className="mini-count" style={{ color: '#fdba74' }}>1</span>
                    </div>
                    <div className="mini-card" style={{ borderColor: '#fed7aa' }}>
                      <p className="mini-card-title">Auth System</p>
                      <span style={{ fontSize: 9, color: '#c2410c', fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#ffedd5' }}>● Pending</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Dispute (col 6) */}
            <div className="bento-card bento-col-6 reveal" style={{ background: 'linear-gradient(145deg,#fff7ed,#ffedd5)', border: '1.5px solid #fed7aa', minHeight: 220 }}>
              <div className="bento-icon" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                <Icon name="shield-check" style={{ color: 'white', width: 26, height: 26 }} />
              </div>
              <h3 style={{ fontWeight: 600, fontSize: 20, marginBottom: 8, color: '#0f172a' }}>Dispute Resolution</h3>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7 }}>
                Fair, expert-mediated resolution with full transparency. The reviewer either releases the milestone or sends it back for rework.
              </p>
            </div>
            {/* Verified (col 6) */}
            <div className="bento-card bento-col-6 reveal reveal-delay-1" style={{ background: 'linear-gradient(145deg,#fefce8,#fef9c3)', border: '1.5px solid #fde68a', minHeight: 220 }}>
              <div className="bento-icon" style={{ background: 'linear-gradient(135deg,#eab308,#ca8a04)' }}>
                <Icon name="user-check" style={{ color: 'white', width: 26, height: 26 }} />
              </div>
              <h3 style={{ fontWeight: 600, fontSize: 20, marginBottom: 8, color: '#0f172a' }}>Verified Profiles</h3>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7 }}>
                Every freelancer passes skills verification, portfolio review, and background checks before joining.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════ PRODUCT DASHBOARD ═══════════ */}
      <section className="section-product" id="product">
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 60% at 50% 50%,rgba(224,231,255,0.5) 0%,transparent 65%)', pointerEvents: 'none' }}></div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-header reveal">
            <span className="pill pill-sky">◉ Product</span>
            <h2 className="section-title">
              Your project <span className="grad-sky">command center</span>
            </h2>
            <p className="section-sub" style={{ color: '#94a3b8' }}>Every project, milestone, and team member — orchestrated in one beautiful workspace.</p>
          </div>
          <div className="reveal" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -24, borderRadius: 40, background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(6,182,212,0.1),rgba(168,85,247,0.1))', filter: 'blur(24px)' }}></div>
            <div className="browser-window" style={{ position: 'relative' }}>
              <div className="browser-bar">
                <div className="browser-dots">
                  <div className="browser-dot browser-dot-red"></div>
                  <div className="browser-dot browser-dot-yellow"></div>
                  <div className="browser-dot browser-dot-green"></div>
                </div>
                <div className="browser-url">
                  <div className="url-bar">
                    <div className="url-dot"></div>
                    lannent.app/dashboard
                  </div>
                </div>
                <div className="browser-live" title="An illustration with sample data">
                  Example
                </div>
              </div>
              <div className="browser-content">
                <div className="dashboard-stats">
                  <div className="dash-stat">
                    <div className="dash-stat-label">Active Projects</div>
                    <div className="dash-stat-val" style={{ color: '#6366f1' }}>12</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-label">Total Earned</div>
                    <div className="dash-stat-val" style={{ color: '#10b981' }}>₹48.2K</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-label">Completion Rate</div>
                    <div className="dash-stat-val" style={{ color: '#f59e0b' }}>96.4%</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-label">Avg Response</div>
                    <div className="dash-stat-val" style={{ color: '#8b5cf6' }}>2.4h</div>
                  </div>
                </div>
                <div className="dashboard-kanban">
                  <div className="dash-col">
                    <div className="dash-col-header">
                      <div className="dash-col-dot" style={{ background: '#94a3b8' }}></div>
                      <span className="dash-col-title" style={{ color: '#64748b' }}>To Do</span>
                      {' '}
                      <span className="dash-badge" style={{ background: '#f3f4f6', color: '#6b7280' }}>2</span>
                    </div>
                    <div className="dash-card">
                      <div className="dash-card-title">UI Wireframes</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Alex Chen · Due Mar 8</div>
                    </div>
                    <div className="dash-card">
                      <div className="dash-card-title">Database Schema</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Emily R. · Due Mar 10</div>
                    </div>
                  </div>
                  <div className="dash-col" style={{ border: '1.5px solid #c7d2fe' }}>
                    <div className="dash-col-header">
                      <div className="dash-col-dot" style={{ background: '#6366f1', animation: 'pulse 2s infinite' }}></div>
                      <span className="dash-col-title" style={{ color: '#6366f1' }}>In Progress</span>
                      {' '}
                      <span className="dash-badge" style={{ background: '#eef2ff', color: '#6366f1' }}>2</span>
                    </div>
                    <div className="dash-card">
                      <div className="dash-card-title">Frontend Dashboard</div>
                      <div className="progress-row">
                        <span className="progress-label">Progress</span>
                        <span className="progress-pct">60%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: '60%', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }}></div>
                      </div>
                    </div>
                    <div className="dash-card">
                      <div className="dash-card-title">Payment Integration</div>
                      <div className="progress-row">
                        <span className="progress-label">Progress</span>
                        <span className="progress-pct">45%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: '45%', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="dash-col">
                    <div className="dash-col-header">
                      <div className="dash-col-dot" style={{ background: '#fbbf24' }}></div>
                      <span className="dash-col-title" style={{ color: '#f59e0b' }}>In Review</span>
                      {' '}
                      <span className="dash-badge" style={{ background: '#fffbeb', color: '#d97706' }}>2</span>
                    </div>
                    <div className="dash-card">
                      <div className="dash-card-title">Auth System</div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>● Pending Review</span>
                    </div>
                    <div className="dash-card">
                      <div className="dash-card-title">Landing Page UI</div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>● Client Review</span>
                    </div>
                  </div>
                </div>
                <div className="collaborators-bar">
                  <div className="avatar-stack">
                    <div className="avatar-sm" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}></div>
                    <div className="avatar-sm" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}></div>
                    <div className="avatar-sm" style={{ background: 'linear-gradient(135deg,#f43f5e,#db2777)' }}></div>
                  </div>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>3 collaborators active</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }}></div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>Live sync</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════ EXPERT REVIEW ═══════════ */}
      <section className="section-expert">
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.4),transparent)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', right: -160, top: 80, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,85,247,0.1),transparent 70%)', pointerEvents: 'none' }}></div>
        <div className="expert-layout">
          <div className="reveal">
            <span className="pill pill-violet">★ Expert Review</span>
            <h2 style={{ marginTop: 24, fontSize: 'clamp(34px,4.5vw,58px)', fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1.05 }}>
              Every deliverable <span style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>audited</span> by experts
            </h2>
            <p style={{ marginTop: 20, color: '#64748b', fontSize: 18, lineHeight: 1.6, maxWidth: 460 }}>
              Before you release a single payment, our vetted senior engineers audit every deliverable for security vulnerabilities, code quality, and completeness.
            </p>
            <div className="expert-features">
              <div className="expert-feature">
                <div className="expert-feature-icon" style={{ background: 'rgba(168,85,247,0.12)', border: '1.5px solid rgba(168,85,247,0.25)' }}>
                  <Icon name="file-check" style={{ color: '#a855f7', width: 18, height: 18 }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>Independent technical audits</p>
                  <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Senior engineers unaffiliated with your project review every submission</p>
                </div>
              </div>
              <div className="expert-feature">
                <div className="expert-feature-icon" style={{ background: 'rgba(99,102,241,0.12)', border: '1.5px solid rgba(99,102,241,0.25)' }}>
                  <Icon name="shield-check" style={{ color: '#6366f1', width: 18, height: 18 }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>Security &amp; performance checks</p>
                  <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>OWASP security scan, load testing, and performance benchmarks included</p>
                </div>
              </div>
              <div className="expert-feature">
                <div className="expert-feature-icon" style={{ background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.25)' }}>
                  <Icon name="trending-up" style={{ color: '#10b981', width: 18, height: 18 }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>Detailed quality reports</p>
                  <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Line-by-line feedback with actionable recommendations delivered</p>
                </div>
              </div>
            </div>
          </div>
          <div className="reveal reveal-delay-2" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -16, borderRadius: 32, background: 'linear-gradient(135deg,rgba(168,85,247,0.15),rgba(99,102,241,0.1))', filter: 'blur(20px)' }}></div>
            <div className="audit-card">
              <div className="audit-header">
                <div className="audit-header-icon">
                  <Icon name="file-check" style={{ color: 'white', width: 22, height: 22 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Technical Audit Report</p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>Reviewed by @expert_jane · 2 hours ago</p>
                </div>
                <div className="audit-passed">✓ All Passed</div>
              </div>
              <div>
                <div className="audit-row" style={{ background: '#f5f3ff', border: '1px solid rgba(168,85,247,0.14)' }}>
                  <div className="audit-row-top">
                    <span className="audit-row-label">Code Quality</span>
                    {' '}
                    <span className="audit-row-val" style={{ color: '#a855f7' }}>A+</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 9999, background: 'rgba(168,85,247,0.2)', overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ width: '95%', height: '100%', borderRadius: 9999, background: '#a855f7' }}></div>
                  </div>
                  <span className="audit-row-sub">Clean architecture, well-documented</span>
                </div>
                <div className="audit-row" style={{ background: '#ecfdf5', border: '1px solid rgba(16,185,129,0.14)' }}>
                  <div className="audit-row-top">
                    <span className="audit-row-label">Security Scan</span>
                    {' '}
                    <span className="audit-row-val" style={{ color: '#10b981' }}>Passed</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 9999, background: 'rgba(16,185,129,0.2)', overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: 9999, background: '#10b981' }}></div>
                  </div>
                  <span className="audit-row-sub">0 vulnerabilities found</span>
                </div>
                <div className="audit-row" style={{ background: '#eef2ff', border: '1px solid rgba(99,102,241,0.14)' }}>
                  <div className="audit-row-top">
                    <span className="audit-row-label">Performance Score</span>
                    {' '}
                    <span className="audit-row-val" style={{ color: '#6366f1' }}>96 / 100</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 9999, background: 'rgba(99,102,241,0.2)', overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ width: '96%', height: '100%', borderRadius: 9999, background: '#6366f1' }}></div>
                  </div>
                  <span className="audit-row-sub">LCP: 1.2s · CLS: 0.02</span>
                </div>
                <div className="audit-row" style={{ background: '#fffbeb', border: '1px solid rgba(245,158,11,0.14)' }}>
                  <div className="audit-row-top">
                    <span className="audit-row-label">Documentation</span>
                    {' '}
                    <span className="audit-row-val" style={{ color: '#f59e0b' }}>Complete</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 9999, background: 'rgba(245,158,11,0.2)', overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: 9999, background: '#f59e0b' }}></div>
                  </div>
                  <span className="audit-row-sub">100% API coverage</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════ METRICS ═══════════ */}
      <section className="section-metrics">
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 70% at 50% 50%,rgba(224,231,255,0.6) 0%,transparent 70%)', pointerEvents: 'none' }}></div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-header reveal">
            <span className="pill pill-cyan">◎ By the Numbers</span>
            <h2 className="section-title">
              Live from the <span className="grad-cyan">platform</span>
            </h2>
          </div>
          <div className="metrics-grid">
            <div className="metric-card reveal" style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe' }}>
              <div className="metric-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                <Icon name="users" style={{ color: 'white', width: 24, height: 24 }} />
              </div>
              <div className="metric-val" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stats ? stats.workers.toLocaleString('en-IN') : '—'}</div>
              <div className="metric-label">Gig workers on Lannent</div>
            </div>
            <div className="metric-card reveal reveal-delay-1" style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0' }}>
              <div className="metric-icon" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <Icon name="check-circle" style={{ color: 'white', width: 24, height: 24 }} />
              </div>
              <div className="metric-val" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stats ? stats.projectsCompleted.toLocaleString('en-IN') : '—'}</div>
              <div className="metric-label">{stats ? `Projects completed · ${stats.projectsInProgress} in progress` : 'Projects completed'}</div>
            </div>
            <div className="metric-card reveal reveal-delay-2" style={{ background: '#eff6ff', border: '1.5px solid #bae6fd' }}>
              <div className="metric-icon" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
                <Icon name="lock" style={{ color: 'white', width: 24, height: 24 }} />
              </div>
              <div className="metric-val" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stats ? compactMoney(stats.escrowHeld) : '—'}</div>
              <div className="metric-label">Held in escrow right now</div>
            </div>
            <div className="metric-card reveal reveal-delay-3" style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
              <div className="metric-icon" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                <Icon name="wallet" style={{ color: 'white', width: 24, height: 24 }} />
              </div>
              <div className="metric-val" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stats ? compactMoney(stats.paidToWorkers) : '—'}</div>
              <div className="metric-label">Paid to gig workers</div>
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════ CTA ═══════════ */}
      <section className="section-cta" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 50%,rgba(99,102,241,0.15) 0%,transparent 70%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }}></div>
        <div className="container" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 760 }}>
          <div className="reveal">
            <div className="cta-live-badge">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', animation: 'pulse 2s infinite' }}></div>
              Start building today — it's free
            </div>
            <h2 className="cta-title">
              Build projects with <span className="cta-highlight">confidence</span>
              .
            </h2>
            <p className="cta-sub">
              Join thousands of clients and freelancers shipping quality work on a platform built for trust, transparency, and excellence.
            </p>
            <Link to="/signup">
              <button className="btn-cta">
                Create Free Account <Icon name="arrow-right" style={{ width: 18, height: 18 }} />
              </button>
            </Link>
            <p className="cta-note">No credit card required · Free forever on Starter plan · Setup in 2 minutes</p>
          </div>
        </div>
      </section>
      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid footer-grid-3">
            <div>
              <h4 className="footer-col-title">Product</h4>
              <ul className="footer-col">
                <li><a href="#how-it-works">How it works</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#product">Product tour</a></li>
              </ul>
            </div>
            <div>
              <h4 className="footer-col-title">Get started</h4>
              <ul className="footer-col">
                <li><Link to="/signup">Create an account</Link></li>
                <li><Link to="/login">Log in</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="footer-col-title">Expert Reviewers</h4>
              <ul className="footer-col">
                <li><Link to="/expert-landing">Become a reviewer</Link></li>
                <li><Link to="/expert-signup">Apply</Link></li>
                <li><Link to="/expert-login">Reviewer login</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-brand">
              <div className="footer-logo-icon">
                <Icon name="zap" style={{ color: 'white', width: 14, height: 14 }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>Lannent</span>
              {' '}
              <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 4 }}>© 2026 All rights reserved.</span>
            </div>
            <div className="footer-badges">
              <div className="footer-badge" style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                <Icon name="lock" style={{ color: '#4f46e5', width: 13, height: 13 }} />
                {' '}
                <span style={{ color: '#3730a3' }}>Escrow Protected</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
