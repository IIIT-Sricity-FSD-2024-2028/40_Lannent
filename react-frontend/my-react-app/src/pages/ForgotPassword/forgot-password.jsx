import { KeyRound, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import './forgot-password.css'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setError('Email address is required.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setError('')
    setSubmitted(true)
  }

  return (
    <main className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-brand">
          <Link to="/" className="forgot-password-brand-link">
            Lannent<span>.</span>
          </Link>
        </div>

        {!submitted ? (
          <section className="auth-card" aria-labelledby="forgot-password-title">
            <div className="forgot-password-intro">
              <div className="forgot-password-icon" aria-hidden="true">
                <KeyRound size={24} />
              </div>
              <h1 id="forgot-password-title">Forgot your password?</h1>
              <p>No problem. Enter your email and we will send you a reset link.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">
                  Email address
                </label>
                <input
                  id="forgot-email"
                  className={`form-input${error ? ' input-error' : ''}`}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setError('')
                  }}
                  aria-describedby={error ? 'forgot-email-error' : undefined}
                  aria-invalid={Boolean(error)}
                />
                {error && (
                  <p id="forgot-email-error" className="form-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <button type="submit" className="btn-submit">
                Send Reset Link
              </button>
            </form>

            <p className="auth-footer-text">
              <Link to="/login">← Back to login</Link>
            </p>
          </section>
        ) : (
          <section className="auth-card success-card" aria-labelledby="email-sent-title">
            <div className="success-icon" aria-hidden="true">
              <Mail size={32} />
            </div>
            <h1 id="email-sent-title">Check your email</h1>
            <p>
              We have sent a password reset link to your email address. Check your
              inbox (and spam folder).
            </p>
            <Link to="/login" className="btn-primary">
              Back to Login
            </Link>
          </section>
        )}
      </div>
    </main>
  )
}

export default ForgotPassword