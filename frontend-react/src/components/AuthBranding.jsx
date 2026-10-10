/**
 * LANNENT — AuthBranding
 * The left half of the login / signup pages: background video, headline and
 * three feature bullets. Defaults are the client & worker version; the expert
 * login page passes its own headline, text and features.
 *
 * @param {ReactNode} title          - headline (default "Build projects with confidence.")
 * @param {string}    subtitle       - paragraph under the headline
 * @param {Array}     features       - [{ icon, text }] bullet list
 * @param {Object}    videoWrapStyle - extra style for the video wrapper (signup pins it)
 * @param {Object}    leftStyle      - extra style for the left column (signup makes it sticky)
 */
import Icon from './Icon';

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4';

const DEFAULT_TITLE = (
  <>Build projects with <span className="serif">confidence</span>.</>
);
const DEFAULT_SUBTITLE = 'Hire skilled gig workers, collaborate in real-time, and release secure escrow payments only when milestones are approved.';
const DEFAULT_FEATURES = [
  { icon: 'lock', text: 'Escrow-secured payments' },
  { icon: 'file-check', text: 'Expert technical audits' },
  { icon: 'handshake', text: 'Milestone-based collaboration' },
];

export default function AuthBranding({
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  features = DEFAULT_FEATURES,
  videoWrapStyle,
  leftStyle,
}) {
  return (
    <>
      {/* Background video */}
      <div className="auth-video-wrap" style={videoWrapStyle}>
        <video className="auth-video" autoPlay muted loop playsInline>
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div className="auth-overlay"></div>
      </div>

      {/* LEFT — Branding */}
      <div className="auth-left" style={leftStyle}>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-sub">{subtitle}</p>
        <div className="auth-features">
          {features.map(f => (
            <div className="auth-feature" key={f.text}>
              <div className="auth-feature-icon">
                <Icon name={f.icon} style={{ width: 15, height: 15 }} />
              </div>
              <span style={{ fontSize: 14 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
