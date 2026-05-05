import { Injectable } from '@nestjs/common';
import { SEED_AUDIT_REPORTS } from '../seed/seed.data';

/**
 * AuditReportsRepository — In-Memory Data Access Layer
 *
 * Manages the AUDIT_REPORTS array and provides low-level CRUD operations.
 * Business logic (upsert, status updates) belongs in AuditReportsService.
 */
@Injectable()
export class AuditReportsRepository {
  private reports: any[] = JSON.parse(JSON.stringify(SEED_AUDIT_REPORTS));
  private counter = 100;

  generateId(): string {
    return 'rep_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { taskId?: string; auditRequestId?: string }): any[] {
    let result = this.reports;
    if (query?.taskId) result = result.filter(r => r.taskId === query.taskId);
    if (query?.auditRequestId) result = result.filter(r => r.auditRequestId === query.auditRequestId);
    return result;
  }

  findById(id: string): any | null {
    return this.reports.find(r => r.id === id) || null;
  }

  findByAuditRequestId(auditRequestId: string): any | null {
    return this.reports.find(r => r.auditRequestId === auditRequestId) || null;
  }

  insert(report: any): any {
    this.reports.push(report);
    return report;
  }

  updateByIndex(auditRequestId: string, partial: any): any | null {
    const idx = this.reports.findIndex(r => r.auditRequestId === auditRequestId);
    if (idx === -1) return null;
    this.reports[idx] = { ...this.reports[idx], ...partial };
    return this.reports[idx];
  }

  resetToSeed(): void {
    this.reports = JSON.parse(JSON.stringify(SEED_AUDIT_REPORTS));
  }
}
