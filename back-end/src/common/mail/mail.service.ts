import { Injectable, OnModuleInit } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { AppLoggerService } from '../logging/app-logger.service';

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends the platform's email over SMTP.
 *
 * Configured from .env — SMTP_USER and SMTP_PASS are the only required
 * values; the rest default to Gmail (smtp.gmail.com:465 over TLS). For a
 * Gmail account SMTP_PASS is an App Password, not the account password.
 *
 * Nothing here falls back to printing mail to the console: an email that
 * did not go out is reported as not sent, so a reset link never "arrives"
 * only in a terminal nobody is watching.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor(private readonly log: AppLoggerService) {
    const user = process.env.SMTP_USER || '';
    // Google displays App Passwords in groups of four; the spaces are not part of it.
    const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
    this.from = process.env.MAIL_FROM || (user ? `Lannent <${user}>` : '');
    if (user && pass) {
      const port = Number(process.env.SMTP_PORT) || 465;
      this.transporter = createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
        auth: { user, pass },
      });
    }
  }

  /** Checks the credentials at boot, so a wrong App Password shows up now rather than at the first reset. */
  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    if (!this.transporter) {
      this.log.warn('mail', 'SMTP_USER / SMTP_PASS are not set in back-end/.env — password reset emails cannot be sent.');
      return;
    }
    try {
      await this.transporter.verify();
      this.log.log('mail', `SMTP ready — sending as ${this.from}`);
    } catch (e) {
      this.log.error('mail', 'SMTP login failed — check SMTP_USER and SMTP_PASS (a Gmail App Password) in back-end/.env', e);
    }
  }

  isConfigured(): boolean {
    return !!this.transporter;
  }

  async send(mail: OutgoingMail): Promise<void> {
    if (!this.transporter) throw new Error('Email is not configured on this server.');
    await this.transporter.sendMail({ from: this.from, ...mail });
  }
}
