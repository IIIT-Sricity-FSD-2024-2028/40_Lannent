import { Injectable, Inject, forwardRef, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { JWT_EXPIRES_IN } from '../../common/security/jwt.config';

export interface TokenClaims {
  sub: string;
  role: string;
  email: string;
  /** The account's token version when this was issued. A password change bumps it. */
  tv?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(forwardRef(() => UsersService)) private readonly users: UsersService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Authenticates and issues a token.
   *
   * Delegates the credential check to `UsersService.login`, so the rules that
   * refuse a suspended account or a wrong password live in one place.
   */
  login(email: string, password: string) {
    let found: ReturnType<UsersService['login']>;
    try {
      found = this.users.login(email, password);
    } catch (e) {
      // No account yet: an Expert Reviewer applicant is told where their
      // application stands — but only after proving it is theirs with the
      // password they applied with. A public "does this email have an
      // application" lookup told anyone which addresses had applied.
      const status = this.applicationStatus(email, password);
      if (status === 'pending') {
        throw new ForbiddenException('Your application is under review. You will be able to sign in once it is approved.');
      }
      if (status === 'rejected') {
        throw new ForbiddenException('Your application was not approved. Contact support for more information.');
      }
      throw e;
    }
    const { user, session } = found;
    const { password: _omit, ...safeUser } = user;
    return {
      ...this.issueFor(user.id),
      user: safeUser,
      session,
    };
  }

  /** A fresh token for an account, carrying its current token version. */
  issueFor(userId: string) {
    const user = this.users.findById(userId);
    const claims: TokenClaims = { sub: user.id, role: user.role, email: user.email, tv: user.tokenVersion || 0 };
    return { token: this.jwt.sign(claims), expiresIn: JWT_EXPIRES_IN };
  }

  /** Verifies a token, returning its claims or null. Never throws. */
  verify(token: string): TokenClaims | null {
    try {
      return this.jwt.verify<TokenClaims>(token);
    } catch {
      return null;
    }
  }

  /**
   * Checks a verified token still belongs to a usable account. A token
   * outlives the decision to suspend or delete its owner by up to twelve
   * hours otherwise — and, before token versions, outlived a password change.
   */
  accountProblem(claims: TokenClaims): string | null {
    let user: any = null;
    try { user = this.users.findById(claims.sub); } catch { user = null; }
    if (!user) return 'This account no longer exists.';
    if (user.status === 'suspended') return 'This account has been suspended. Contact support.';
    if ((claims.tv || 0) !== (user.tokenVersion || 0)) {
      return 'Your password was changed, so this session has ended. Sign in again.';
    }
    return null;
  }

  /** Whether the account must choose its own password before doing anything else. */
  mustChangePassword(userId: string): boolean {
    try { return !!this.users.findById(userId).mustChangePassword; } catch { return false; }
  }

  /** Confirms a token is still good and reports who it belongs to. */
  whoami(token: string) {
    const claims = this.verify(token);
    if (!claims || this.accountProblem(claims)) return { valid: false, user: null };
    const user = this.users.findById(claims.sub);
    const { password: _omit, ...safeUser } = user || ({} as any);
    return { valid: true, user: user ? safeUser : null };
  }

  /** The status of an application whose password matches, or null. */
  private applicationStatus(email: string, password: string): string | null {
    try {
      // Resolved lazily: the applications module depends on users, which
      // depends on this one.
      const { ExpertApplicationsService } = require('../expert-applications/expert-applications.service');
      const apps = this.moduleRef.get(ExpertApplicationsService, { strict: false });
      return apps.statusForCredentials(email, password);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      return null;
    }
  }
}
