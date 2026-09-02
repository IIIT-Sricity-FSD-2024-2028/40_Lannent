import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request context, carried implicitly.
 *
 * Services need the request id to log anything useful, but threading it through
 * every method signature would mean `ledger.releaseMilestone()` taking a logging
 * parameter. AsyncLocalStorage keeps the id available for the life of the
 * request without touching a single service signature.
 */
export interface RequestContext {
  requestId: string;
  /** Resolved actor. Comes from the header today; from the token once auth lands. */
  userId?: string;
  role?: string;
  method: string;
  path: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Runs `fn` with `ctx` available to everything it calls, however deep. */
export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Short form for log lines — the full uuid is too wide to scan. */
export function shortId(id?: string): string {
  return (id ?? getContext()?.requestId ?? '--------').slice(0, 8);
}

/** "u1/client" — who the request is acting as, for log lines. */
export function actor(): string {
  const ctx = getContext();
  if (!ctx?.userId && !ctx?.role) return 'anon';
  return `${ctx.userId ?? '-'}/${ctx.role ?? '-'}`;
}
