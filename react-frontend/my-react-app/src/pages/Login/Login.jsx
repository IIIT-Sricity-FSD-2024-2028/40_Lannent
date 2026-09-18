import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Login.css'

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false)

  return (
    <div className="auth-page">

      <div className="auth-video-wrap">
        <video className="auth-video" autoPlay muted loop playsInline>
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4" type="video/mp4" />
        </video>
        <div className="auth-overlay" />
      </div>

      <div className="auth-left">
        <h1 className="auth-title">Build projects with <span className="serif">confidence</span>.</h1>
        <p className="auth-sub">Hire skilled gig workers, collaborate in real-time, and release secure escrow payments only when milestones are approved.</p>
        <div className="auth-features">
          <div className="auth-feature">
            <div className="auth-feature-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></svg>
            </div>
            <span style={{ fontSize: 14 }}>Escrow-secured payments</span>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
            </div>
            <span style={{ fontSize: 14 }}>Expert technical audits</span>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 9.2 7 11.7l2.5 2.5m7-7.5 2.5 2.5-2.5 2.5"/></svg>
            </div>
            <span style={{ fontSize: 14 }}>Milestone-based collaboration</span>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.5 2.7 8.7 7 10 4.3-1.3 7-5.5 7-10V6l-7-3Z"/><path d="m9.5 12 1.6 1.6 3.4-3.6"/></svg>
            <span className="auth-card-brand-name">GigBoard</span>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 24, marginBottom: 4 }}>Welcome back</h2>
          <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 32 }}>Sign in to your account to continue</p>

          <form id="loginForm">
            <div className="form-group">
              <label className="form-label" htmlFor="loginEmail">Email</label>
              <input type="email" className="form-input" placeholder="you@example.com" id="loginEmail" />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" htmlFor="loginPassword" style={{ marginBottom: 0 }}>Password</label>
                <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
              </div>
              <div className="form-input-wrap">
                <input type={showPw ? 'text' : 'password'} className="form-input form-input-pr" placeholder="••••••••" id="loginPassword" />
                <button type="button" className="form-input-icon-right" onClick={() => setShowPw(v => !v)}>
                  {showPw
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18"/><path d="M10.6 10.6A2.2 2.2 0 0 0 13.4 13.4"/><path d="M9.1 5.5A11.2 11.2 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-4.9 6.3M6.3 6.3A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 5.7-1.7"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" style={{ marginTop: 4 }}>Sign In</button>
          </form>

          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">or continue with</span>
            <div className="divider-line" />
          </div>

          <div className="social-btns">
            <button className="btn-social">
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </button>
            <button className="btn-social">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </button>
          </div>

          <p className="auth-footer-text">Don&apos;t have an account? <Link to="/signup">Sign up</Link></p>

          <div style={{ marginTop: 20, padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
            <strong style={{ color: '#334155', display: 'block', marginBottom: 4 }}>🔑 Demo Credentials</strong>
            <span style={{ display: 'block' }}>Client: <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>client@gmail.com</code> / <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>Password@123</code></span>
            <span style={{ display: 'block' }}>Worker: <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>worker@gmail.com</code> / <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>Password@123</code></span>
            <span style={{ display: 'block' }}>Expert: <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>expert@gmail.com</code> / <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>Password@123</code></span>
            <span style={{ display: 'block' }}>Super Admin: <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>super@gmail.com</code> / <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>Superadmin@123</code></span>
            <span style={{ display: 'block' }}>Revenue Admin: <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>admin@gmail.com</code> / <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>Admin@123</code></span>
            <span style={{ display: 'block' }}>Intake Admin: <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>intake@gmail.com</code> / <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>Intake@123</code></span>
            <span style={{ display: 'block' }}>Compliance Admin: <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>compliance@gmail.com</code> / <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>Compliance@123</code></span>
          </div>
        </div>
      </div>
    </div>
  )
}
