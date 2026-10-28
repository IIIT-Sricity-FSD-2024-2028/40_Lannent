import { Injectable, Inject, forwardRef, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { UsersService } from '../users/users.service';
import { MailService } from '../../common/mail/mail.service';
import { AppLoggerService } from '../../common/logging/app-logger.service';
import { SEED_USERS } from '../seed/seed.data';

/**
 * The seeded demo accounts. Their addresses (client@gmail.com and the rest)
 * are real inboxes that belong to strangers, so mail for them is never sent
 * there: it goes to DEMO_MAIL_TO, or nowhere. Accounts people sign up with
 * are not in this list and get their own email as normal.
 */
const DEMO_EMAILS = new Set(SEED_USERS.map(u => u.email.toLowerCase()));

/** How long a reset link works. */
export const RESET_TOKEN_TTL_MS = 30 * 60_000;
/** One email per account per minute, five an hour — enough to retry, not enough to flood an inbox. */
const RESEND_COOLDOWN_MS = 60_000;
const MAX_EMAILS_PER_HOUR = 5;

const INVALID_LINK = 'This reset link is invalid or has expired. Request a new one.';

interface ResetRecord {
  tokenHash: string;
  expiresAt: number;
  /** The account's token version when the link was issued. Any password change bumps it, which kills the link. */
  tokenVersion: number;
}

/**
 * Forgot-password, by email.
 *
 * Self-service on purpose: there is no route for staff to set someone's
 * password (an operator who could would sign in as that person and withdraw
 * their wallet), so proving you own the mailbox is the only way back in.
 *
 *   - The link carries a random 256-bit token; only its SHA-256 is kept, so
 *     the store itself cannot be used to reset anyone.
 *   - One live link per account. A new request replaces the old one; using it,
 *     or changing the password any other way, ends it.
 *   - The answer to "send me a link" is the same whether or not the email has
 *     an account — the login route already refuses to say which emails exist.
 */
@Injectable()
export class PasswordResetService {
  private byUser = new Map<string, ResetRecord>();
  private sentAt = new Map<string, number[]>();

  constructor(
    @Inject(forwardRef(() => UsersService)) private readonly users: UsersService,
    private readonly mail: MailService,
    private readonly log: AppLoggerService,
  ) {}

  /** Emails a reset link if the address belongs to an active account. Always answers the same way. */
  request(email: string) {
    // Said for every address alike, so it reveals nothing about who has an account.
    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException('Password reset by email is not set up on this server yet. Contact support.');
    }
    const user = this.users.findByEmail(String(email || '').trim());
    const recipient = user ? this.recipientFor(user) : null;
    if (user && recipient && user.status === 'active' && this.mayEmail(user.id)) {
      const token = randomBytes(32).toString('base64url');
      this.byUser.set(user.id, {
        tokenHash: hash(token),
        expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
        tokenVersion: user.tokenVersion || 0,
      });
      // Not awaited: an address with an account would otherwise answer a
      // second later than one without, which says which emails are
      // registered. A failed send is logged; MailService checks the SMTP
      // login at boot so a misconfiguration is caught before anyone asks.
      this.mail
        .send(resetEmail(user.email, user.name, linkFor(token), recipient))
        .then(() => this.log.log('auth.reset', `reset link for ${user.id} emailed${recipient !== user.email ? ' to the demo inbox' : ''}`))
        .catch(e => this.log.error('auth.reset', `could not email the reset link to ${user.id}`, e));
    }
    return { sent: true, expiresInMinutes: RESET_TOKEN_TTL_MS / 60_000 };
  }

  /** Whether a link is still usable — so the page can say so before the user types a new password. */
  check(token: string) {
    this.find(token);
    return { valid: true };
  }

  /** Sets the new password and spends the link. Every existing session is signed out. */
  reset(token: string, password: string) {
    const { userId } = this.find(token);
    // A weak password throws here, before the link is spent, so the user can try again with it.
    this.users.resetPassword(userId, password);
    this.byUser.delete(userId);
    this.log.log('auth.reset', `password reset by email for ${userId}`);
    return { reset: true };
  }

  private find(token: string): { userId: string } {
    const wanted = hash(String(token || ''));
    for (const [userId, rec] of this.byUser) {
      if (rec.tokenHash !== wanted) continue;
      let user: any = null;
      try { user = this.users.findById(userId); } catch { user = null; }
      const live = rec.expiresAt > Date.now() && user && user.status === 'active'
        && (user.tokenVersion || 0) === rec.tokenVersion;
      if (!live) {
        this.byUser.delete(userId);
        break;
      }
      return { userId };
    }
    throw new BadRequestException(INVALID_LINK);
  }

  /** Where this account's mail goes: its own address, the demo inbox, or — for a demo account with no demo inbox set — nowhere. */
  private recipientFor(user: any): string | null {
    if (!DEMO_EMAILS.has(String(user.email).toLowerCase())) return user.email;
    const demoInbox = (process.env.DEMO_MAIL_TO || '').trim();
    if (!demoInbox) {
      this.log.warn('auth.reset', `${user.email} is a demo account and DEMO_MAIL_TO is not set, so no reset email was sent`);
      return null;
    }
    return demoInbox;
  }

  /** Records the send if it is within the per-account limits. */
  private mayEmail(userId: string): boolean {
    const now = Date.now();
    const recent = (this.sentAt.get(userId) || []).filter(t => now - t < 3_600_000);
    if (recent.length && now - recent[recent.length - 1] < RESEND_COOLDOWN_MS) return false;
    if (recent.length >= MAX_EMAILS_PER_HOUR) return false;
    this.sentAt.set(userId, [...recent, now]);
    return true;
  }

  /** A seed reset replaces every account, so links issued for the old ones go too. */
  resetToSeed() {
    this.byUser.clear();
    this.sentAt.clear();
  }
}

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Where the link points: the React app, which reads the token from the
 * #fragment. A fragment is never sent to a server, so the token stays out of
 * access logs and Referer headers.
 */
function linkFor(token: string): string {
  const base = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}/reset-password#token=${token}`;
}

/**
 * `account` is the address the reset is for; `to` is where it is delivered.
 * They differ only for a demo account redirected to DEMO_MAIL_TO, and then
 * the email says so plainly.
 */
function resetEmail(account: string, name: string, link: string, to: string = account) {
  const demo = to !== account;
  const minutes = RESET_TOKEN_TTL_MS / 60_000;
  const first = String(name || '').trim().split(/\s+/)[0] || 'there';
  const demoText = demo ? `[Demo account — delivered to the demo inbox instead of ${account}]\n\n` : '';
  const demoHtml = demo
    ? `<p style="font-size:13px;background:#fef3c7;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:10px 12px;margin:0 0 20px">Demo account — this was sent to the demo inbox instead of <strong>${escapeHtml(account)}</strong>.</p>`
    : '';
  const text =
    demoText +
    `Hi ${first},\n\n` +
    `Someone asked to reset the password for your Lannent account (${account}).\n\n` +
    `Choose a new password here — the link works once and expires in ${minutes} minutes:\n${link}\n\n` +
    `If this wasn't you, ignore this email. Your password stays the same.\n\n— Lannent`;
  const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
  <div style="font-size:20px;font-weight:700;margin-bottom:24px">Lannent<span style="color:#f43f5e">.</span></div>
  ${demoHtml}
  <p style="font-size:15px;margin:0 0 12px">Hi ${escapeHtml(first)},</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 20px">Someone asked to reset the password for your Lannent account (<strong>${escapeHtml(account)}</strong>).</p>
  <p style="margin:0 0 20px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:15px">Choose a new password</a></p>
  <p style="font-size:13px;line-height:1.6;color:#64748b;margin:0 0 8px">The link works once and expires in ${minutes} minutes.</p>
  <p style="font-size:13px;line-height:1.6;color:#64748b;margin:0">If this wasn't you, ignore this email — your password stays the same.</p>
</div>`;
  const subject = demo ? `[Demo: ${account}] Reset your Lannent password` : 'Reset your Lannent password';
  return { to, subject, text, html };
}

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}
