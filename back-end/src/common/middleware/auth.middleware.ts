import { Injectable, NestMiddleware, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../modules/auth/auth.service';
import { getContext, shortId } from '../logging/request-context';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; role: string; email?: string; via: 'token' | 'header' };
    /** What the caller actually sent, before a verified token overrode it. */
    claimed?: { role?: string; userId?: string };
  }
}

/**
 * Whether the `role` / `user-id` headers may still identify a caller.
 *
 * Off unless explicitly enabled, and never available in production. The
 * frontend obtains a token at login and sends it on every call, so the
 * fallback now exists only for tooling that has not been given credentials.
 * Leaving it on by default meant anyone could send `role: admin` and satisfy
 * every check in the app — the middleware asked whether a caller was
 * *identified*, which a header answers, not whether they were *authenticated*,
 * which only a signature answers.
 */
const HEADER_FALLBACK =
  process.env.NODE_ENV !== 'production' && process.env.AUTH_HEADER_FALLBACK === '1';

/**
 * Resolves who is making the request.
 *
 * Two rules, in this order:
 *
 *  1. **A credential that is presented must be valid.** An `Authorization`
 *     header carrying a token that does not verify is rejected outright — it
 *     never falls through to the headers. Previously a forged token plus a
 *     `role` header returned 200, because the bad signature was logged and
 *     then quietly ignored; presenting a broken credential now fails closed.
 *  2. **No credential at all** leaves the request unidentified, unless the
 *     header fallback is explicitly enabled. Refusing an unidentified request
 *     is `RequireAuthMiddleware`'s job, applied per module.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Auth');
  /** One line per route per process, or a busy dashboard floods the log. */
  private readonly reported = new Set<string>();

  constructor(private readonly auth: AuthService) {}

  use(req: Request, res: Response, next: NextFunction) {
    req.claimed = { role: req.get('role'), userId: req.get('user-id') };

    const header = req.get('authorization') || '';
    if (header) {
      const token = header.replace(/^Bearer\s+/i, '').trim();
      const claims = token ? this.auth.verify(token) : null;

      if (!claims) {
        this.logger.warn(
          `[${shortId(req.id)}] rejected an invalid bearer token on ${req.method} ${req.originalUrl}`,
        );
        throw new UnauthorizedException(
          'That token is not valid or has expired. Sign in again to get a new one.',
        );
      }

      req.user = { id: claims.sub, role: claims.role, email: claims.email, via: 'token' };
      // The token is the authority, so the request is made to agree with it.
      // Twenty handlers across six controllers read identity from these two
      // headers; rewriting them here means a signed token beats whatever the
      // caller typed, everywhere, without each of those reads changing. The
      // originals stay on `req.claimed` so a mismatch is visible rather than
      // silently erased.
      if (
        (req.claimed.role && req.claimed.role !== claims.role) ||
        (req.claimed.userId && req.claimed.userId !== claims.sub)
      ) {
        this.logger.warn(
          `[${shortId(req.id)}] headers claimed ${req.claimed.userId ?? '-'}/${req.claimed.role ?? '-'} ` +
            `but the token says ${claims.sub}/${claims.role} — the token wins`,
        );
      }
      req.headers['role'] = claims.role;
      req.headers['user-id'] = claims.sub;
      this.syncContext(req);
      return next();
    }

    if (HEADER_FALLBACK && req.claimed.role) {
      req.user = { id: req.claimed.userId || '', role: req.claimed.role, via: 'header' };
      this.noteFallback(req);
    }

    this.syncContext(req);
    next();
  }

  /** Keeps the log context aligned with whoever the token says this is. */
  private syncContext(req: Request) {
    const ctx = getContext();
    if (!ctx || !req.user) return;
    ctx.userId = req.user.id || ctx.userId;
    ctx.role = req.user.role || ctx.role;
  }

  private noteFallback(req: Request) {
    const route = `${req.method} ${req.route?.path || req.originalUrl.split('?')[0]}`;
    if (this.reported.has(route)) return;
    this.reported.add(route);
    this.logger.warn(`auth.fallback — ${route} identified by the role header, with no bearer token`);
  }
}
