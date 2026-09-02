import { Injectable, Logger, Scope } from '@nestjs/common';
import { getContext, shortId, actor } from './request-context';

/**
 * The logger services inject.
 *
 * Nest's own `Logger` is fine, but every call site would have to remember to
 * attach the request id and the acting user — so in practice none of them do.
 * This reads both off the request context, so a service just says what
 * happened and the line comes out correlated.
 *
 * Deliberately singleton-scoped: the context comes from AsyncLocalStorage, not
 * from the instance, so there is no reason to build one of these per request.
 */
@Injectable({ scope: Scope.DEFAULT })
export class AppLoggerService {
  private readonly logger = new Logger('App');

  /** `[a1b2c3d4] u1/client` — the prefix every line below shares. */
  private prefix(): string {
    return `[${shortId()}] ${actor()}`;
  }

  log(context: string, message: string) {
    this.logger.log(`${this.prefix()} ${context} — ${message}`);
  }

  warn(context: string, message: string, error?: unknown) {
    const detail = error ? ` (${describe(error)})` : '';
    this.logger.warn(`${this.prefix()} ${context} — ${message}${detail}`);
  }

  error(context: string, message: string, error?: unknown) {
    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`${this.prefix()} ${context} — ${message}`, stack);
  }

  debug(context: string, message: string) {
    this.logger.debug(`${this.prefix()} ${context} — ${message}`);
  }

  /**
   * A value movement. Kept separate from `log` because these lines are the
   * money audit trail and want to be greppable as one thing: every escrow
   * move, fee and payout carries the MONEY tag.
   *
   *   [a1b2c3d4] u1/client MONEY escrow.fund task=t1 gross=1264.99 fee=114.99 net=1150.00 u1 -> escrow
   */
  money(event: string, fields: Record<string, string | number | undefined>) {
    const parts = Object.entries(fields)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    this.logger.log(`${this.prefix()} \x1b[35mMONEY\x1b[0m ${event} ${parts}`);
  }

  /** The route this line belongs to, when a message needs to name it. */
  route(): string {
    const ctx = getContext();
    return ctx ? `${ctx.method} ${ctx.path}` : 'no-request';
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
