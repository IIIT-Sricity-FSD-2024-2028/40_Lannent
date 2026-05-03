import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { SEED_AUDIT_REPORTS } from '../seed/seed.data';
import { CreateAuditReportDto } from './dto/create-audit-report.dto';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';
import { MilestonesService } from '../milestones/milestones.service';

@Injectable()
export class AuditReportsService {
  private reports: any[] = JSON.parse(JSON.stringify(SEED_AUDIT_REPORTS));
  private counter = 100;

  constructor(
    @Inject(forwardRef(() => AuditRequestsService)) private auditRequestsService: AuditRequestsService,
    @Inject(forwardRef(() => MilestonesService)) private milestonesService: MilestonesService,
  ) {}

  private generateId(): string {
    return 'rep_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { taskId?: string; auditRequestId?: string }) {
    let result = this.reports;
    if (query?.taskId) result = result.filter(r => r.taskId === query.taskId);
    if (query?.auditRequestId) result = result.filter(r => r.auditRequestId === query.auditRequestId);
    return result;
  }

  findById(id: string) {
    const report = this.reports.find(r => r.id === id);
    if (!report) throw new NotFoundException(`Audit report with id "${id}" not found`);
    return report;
  }

  create(dto: CreateAuditReportDto) {
    // Upsert: if a report for this auditRequestId already exists, update it
    const existingIdx = this.reports.findIndex(r => r.auditRequestId === dto.auditRequestId);
    if (existingIdx >= 0) {
      this.reports[existingIdx] = {
        ...this.reports[existingIdx],
        ...dto,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      // Update audit request status
      try {
        this.auditRequestsService.update(dto.auditRequestId, { status: 'Completed' });
      } catch {}
      // Note: Expert audit reports do not change milestone status - that's for client approval only
      return this.reports[existingIdx];
    }

    // Create new report
    const report = {
      id: this.generateId(),
      createdAt: new Date().toISOString().slice(0, 10),
      ...dto,
    };
    this.reports.push(report);

    // Update audit request status
    try {
      this.auditRequestsService.update(dto.auditRequestId, { status: 'Completed' });
    } catch {}

    // Note: Expert audit reports do not change milestone status - that's for client approval only

    return report;
  }

  resetToSeed() {
    this.reports = JSON.parse(JSON.stringify(SEED_AUDIT_REPORTS));
  }
}
