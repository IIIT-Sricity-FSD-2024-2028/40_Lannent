import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { CreateAuditReportDto } from './dto/create-audit-report.dto';
import { AuditReportsRepository } from './audit-reports.repository';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';
import { MilestonesService } from '../milestones/milestones.service';

/**
 * AuditReportsService — Business Logic Layer
 *
 * Handles report creation/upsert and audit-request status updates.
 * Delegates all data-access operations to AuditReportsRepository.
 */
@Injectable()
export class AuditReportsService {
  constructor(
    private readonly auditReportsRepository: AuditReportsRepository,
    @Inject(forwardRef(() => AuditRequestsService)) private auditRequestsService: AuditRequestsService,
    @Inject(forwardRef(() => MilestonesService)) private milestonesService: MilestonesService,
  ) {}

  findAll(query?: { taskId?: string; auditRequestId?: string }) {
    return this.auditReportsRepository.findAll(query);
  }

  findById(id: string) {
    const report = this.auditReportsRepository.findById(id);
    if (!report) throw new NotFoundException(`Audit report with id "${id}" not found`);
    return report;
  }

  create(dto: CreateAuditReportDto) {
    // Upsert: if a report for this auditRequestId already exists, update it
    const existing = this.auditReportsRepository.findByAuditRequestId(dto.auditRequestId);
    if (existing) {
      const updated = this.auditReportsRepository.updateByIndex(dto.auditRequestId, {
        ...dto,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      // Update audit request status
      try {
        this.auditRequestsService.update(dto.auditRequestId, { status: 'Completed' });
      } catch {}
      // Note: Expert audit reports do not change milestone status - that's for client approval only
      return updated;
    }

    // Create new report
    const report = {
      id: this.auditReportsRepository.generateId(),
      createdAt: new Date().toISOString().slice(0, 10),
      ...dto,
    };
    this.auditReportsRepository.insert(report);

    // Update audit request status
    try {
      this.auditRequestsService.update(dto.auditRequestId, { status: 'Completed' });
    } catch {}

    // Note: Expert audit reports do not change milestone status - that's for client approval only

    return report;
  }

  resetToSeed() {
    this.auditReportsRepository.resetToSeed();
  }
}
