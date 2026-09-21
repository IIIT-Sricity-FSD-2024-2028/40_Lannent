import { Injectable } from '@nestjs/common';
import { AuditRepository, AuditEvent } from './audit.repository';
import { getContext } from '../../common/logging/request-context';

export interface RecordInput {
  kind: string;
  method?: string | null;
  path?: string | null;
  status?: number | null;
  outcome?: 'ok' | 'refused' | null;
  detail?: Record<string, any> | null;
  /** Only when the actor is not the one on the current request. */
  actorId?: string | null;
  actorRole?: string | null;
}

/**
 * AuditService — Business Logic Layer
 *
 * The actor and the request id come from the request context, so a caller
 * records *what happened* and never has to remember to attach *who*. That is
 * the same reason the context exists for logging: an audit line that depends
 * on every call site passing the actor is an audit line that will eventually
 * be missing one.
 */
@Injectable()
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  record(input: RecordInput): AuditEvent {
    const ctx = getContext();
    return this.repo.append({
      id: this.repo.generateId(),
      at: new Date().toISOString(),
      requestId: ctx?.requestId ?? null,
      actorId: input.actorId ?? ctx?.userId ?? null,
      actorRole: input.actorRole ?? ctx?.role ?? null,
      kind: input.kind,
      method: input.method ?? ctx?.method ?? null,
      path: input.path ?? ctx?.path ?? null,
      status: input.status ?? null,
      outcome: input.outcome ?? null,
      detail: input.detail ?? null,
    });
  }

  findAll(query?: { actorId?: string; actorRole?: string; kind?: string; from?: string; to?: string; limit?: number }) {
    const rows = this.repo.findAll(query);
    const limit = Math.min(Math.max(Number(query?.limit) || 200, 1), 1000);
    return {
      total: rows.length,
      stored: this.repo.count(),
      droppedFromCapacity: this.repo.droppedCount(),
      events: rows.slice(0, limit),
    };
  }

  /** The same rows as CSV, for taking the trail somewhere else. */
  toCsv(rows: AuditEvent[]): string {
    const header = ['at', 'requestId', 'actorId', 'actorRole', 'kind', 'method', 'path', 'status', 'outcome', 'detail'];
    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [header.join(','), ...rows.map(r => header.map(h => escape((r as any)[h])).join(','))].join('\n');
  }
}
