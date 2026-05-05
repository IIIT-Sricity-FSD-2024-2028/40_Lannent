import { Injectable } from '@nestjs/common';
import { SEED_AUDIT_REQUESTS } from '../seed/seed.data';

/**
 * AuditRequestsRepository — In-Memory Data Access Layer
 *
 * Manages the AUDIT_REQUESTS array and provides low-level CRUD operations.
 * Business logic belongs in AuditRequestsService.
 */
@Injectable()
export class AuditRequestsRepository {
  private auditRequests: any[] = JSON.parse(JSON.stringify(SEED_AUDIT_REQUESTS));
  private counter = 100;

  generateId(): string {
    return 'ar_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { expertId?: string; status?: string }): any[] {
    let result = this.auditRequests;
    if (query?.expertId) result = result.filter(a => a.expertId === query.expertId);
    if (query?.status) result = result.filter(a => a.status === query.status);
    return result;
  }

  findById(id: string): any | null {
    return this.auditRequests.find(a => a.id === id) || null;
  }

  insert(auditRequest: any): any {
    this.auditRequests.push(auditRequest);
    return auditRequest;
  }

  update(id: string, partial: any): any | null {
    const idx = this.auditRequests.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.auditRequests[idx] = { ...this.auditRequests[idx], ...partial };
    return this.auditRequests[idx];
  }

  resetToSeed(): void {
    this.auditRequests = JSON.parse(JSON.stringify(SEED_AUDIT_REQUESTS));
  }
}
