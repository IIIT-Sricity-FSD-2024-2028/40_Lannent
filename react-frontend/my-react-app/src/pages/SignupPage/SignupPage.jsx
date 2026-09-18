import { useState } from 'react';
import './SignupPage.css';
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.5 2.7 8.7 7 10 4.3-1.3 7-5.5 7-10V6l-7-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="m9.5 12 1.6 1.6 3.4-3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 11V8a4 4 0 1 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 12.5 10.2 15.8 17 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function HandshakeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 9.2 7 11.7l2.5 2.5m7-7.5 2.5 2.5-2.5 2.5M6 17.5l4.5-4.5 2 2 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.5 16 7 12.5l2.5 2.5L6 17.5l-2.5-1Zm17 0-3.5-3.5-2.5 2.5L18 17.5l2.5-1Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4.5h6a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M9 5.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9 10h6M9 14h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.2 6.4a3.8 3.8 0 0 1 5.4 5.4l-1.5 1.5-3.2-3.2 1.5-1.5a3.7 3.7 0 0 1-2.2-1.2Zm-3.5 3.5-7 7a2 2 0 0 0-.5 1.7l.4 2.4 2.4-.4a2 2 0 0 0 1.7-.5l7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10.6 10.6A2.2 2.2 0 0 0 13.4 13.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9.1 5.5A11.2 11.2 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-4.9 6.3M6.3 6.3A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 5.7-1.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
export default function SignupPage() {
  const [selectedRole, setSelectedRole] = useState('client');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordType = showPassword ? 'text' : 'password';
  const confirmPasswordType = showConfirmPassword ? 'text' : 'password';
  return (
    <div className="auth-page">
      <div className="auth-video-wrap" style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <video className="auth-video" autoPlay muted loop playsInline>
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4"
            type="video/mp4"
          />
        </video>
        <div className="auth-overlay" />
      </div>
      <div className="auth-left" style={{ position: 'sticky', top: 0, height: '100vh' }}>
        <h1 className="auth-title">
          Build projects with <span className="serif">confidence</span>.
        </h1>
        <p className="auth-sub">
          Hire skilled gig workers, collaborate in real-time, and release secure escrow payments only when milestones are approved.
        </p>
        <div className="auth-features">
          <div className="auth-feature">
            <div className="auth-feature-icon">
              <LockIcon />
            </div>
            <span>Escrow-secured payments</span>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">
              <CheckIcon />
            </div>
            <span>Expert technical audits</span>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">
              <HandshakeIcon />
            </div>
            <span>Milestone-based collaboration</span>
          </div>
        </div>
      </div>
      <div className="auth-right" style={{ position: 'relative', zIndex: 1, alignItems: 'flex-start', paddingTop: 48, paddingBottom: 48 }}>
        <div className="auth-card">
          <div className="auth-card-brand">
            <ShieldIcon />
            <span className="auth-card-brand-name">GigBoard</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 24, marginBottom: 4 }}>
            Create your account
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 24 }}>
            Get started with your first project
          </p>
          <form id="signupForm">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" placeholder="John Doe" id="signupName" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="you@example.com" id="signupEmail" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="form-input-wrap">
                <input type={passwordType} className="form-input form-input-pr" placeholder="••••••••" id="signupPw" />
                <button type="button" className="form-input-icon-right" onClick={() => setShowPassword((p) => !p)}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="form-input-wrap">
                <input type={confirmPasswordType} className="form-input form-input-pr" placeholder="••••••••" id="signupConfirm" />
                <button type="button" className="form-input-icon-right" onClick={() => setShowConfirmPassword((p) => !p)}>
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">I want to</label>
              <div className="role-grid" id="roleGroup">
                <button
                  type="button"
                  className={selectedRole === 'client' ? 'role-card active' : 'role-card'}
                  onClick={() => setSelectedRole('client')}
                >
                  <div className="role-card-icon">
                    <ClipboardIcon />
                  </div>
                  <p className="role-card-title">Client</p>
                  <p className="role-card-desc">Post tasks and hire gig workers</p>
                </button>
                <button
                  type="button"
                  className={selectedRole === 'worker' ? 'role-card active' : 'role-card'}
                  onClick={() => setSelectedRole('worker')}
                >
                  <div className="role-card-icon">
                    <WrenchIcon />
                  </div>
                  <p className="role-card-title">Gig Worker</p>
                  <p className="role-card-desc">Find projects and submit deliverables</p>
                </button>
              </div>
            </div>
            <button type="submit" className="btn-submit" style={{ marginTop: 4 }}>
              Create Account
            </button>
          </form>
          <p className="auth-footer-text">
            Already have an account? <a href="#">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
