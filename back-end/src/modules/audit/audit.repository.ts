import { Injectable, Logger } from '@nestjs/common';

export interface AuditEvent {
  id: string;
  at: string;
  requestId: string | null;
  actorId: string | null;
  actorRole: string | null;
  /** admin.read · admin.change · money · fee.change */
  kind: string;
  method: string | null;
  path: string | null;
  status: number | null;
  outcome: 'ok' | 'refused' | null;
  detail: Record<string, any> | null;
}

/**
 * AuditRepository — In-Memory Data Access Layer
 *
 * **Append-only by construction.** There is no update and no delete, and none
 * should be added: a trail the platform can quietly edit is not a trail. The
 * controller exposes reads only, so nothing in the application can rewrite
 * what happened.
 *
 * Records live for the life of the process, like everything else here. That is
 * honest rather than ideal — persistence is a question the whole app has, and
 * solving it for this one module would be pretending.
 */
@Injectable()
export class AuditRepository {
  private readonly logger = new Logger('Audit');
  private events: AuditEvent[] = [];
  private counter = 1;

  /** Newest first, so a reader sees recent activity without paging. */
  private static readonly CAPACITY = 20_000;
  private dropped = 0;

  generateId(): string {
    return 'ev_' + Date.now() + '_' + this.counter++;
  }

  append(event: AuditEvent): AuditEvent {
    this.events.push(event);
    if (this.events.length > AuditRepository.CAPACITY) {
      // Rolling off the oldest is a compromise, not a feature — say so out
      // loud rather than letting the trail silently lose its beginning.
      const removed = this.events.splice(0, this.events.length - AuditRepository.CAPACITY);
      this.dropped += removed.length;
      this.logger.warn(
        `audit log is at capacity (${AuditRepository.CAPACITY}); dropped ${this.dropped} oldest event(s) so far`,
      );
    }
    return event;
  }

  findAll(query?: {
    actorId?: string;
    actorRole?: string;
    kind?: string;
    from?: string;
    to?: string;
  }): AuditEvent[] {
    let result = this.events;
    if (query?.actorId) result = result.filter(e => e.actorId === query.actorId);
    if (query?.actorRole) result = result.filter(e => e.actorRole === query.actorRole);
    if (query?.kind) result = result.filter(e => e.kind === query.kind);
    if (query?.from) result = result.filter(e => e.at >= query.from!);
    if (query?.to) result = result.filter(e => e.at <= query.to!);
    return [...result].reverse();
  }

  count(): number {
    return this.events.length;
  }

  droppedCount(): number {
    return this.dropped;
  }

  /**
   * Note the absence of `resetToSeed()`. Every other repository has one, and
   * `POST /seed/reset` calls it — wiping the record of who did what is exactly
   * what an audit trail must not offer.
   */
}
