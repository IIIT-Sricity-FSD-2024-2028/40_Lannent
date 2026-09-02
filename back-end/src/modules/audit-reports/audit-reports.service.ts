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
    const existing = this.auditReportsRepository.findByAuditRequestId(dto.auditRequestId);

    const report = existing
      ? this.auditReportsRepository.updateByIndex(dto.auditRequestId, {
          ...dto,
          createdAt: new Date().toISOString().slice(0, 10),
        })
      : (() => {
          const r = {
            id: this.auditReportsRepository.generateId(),
            createdAt: new Date().toISOString().slice(0, 10),
            ...dto,
          };
          this.auditReportsRepository.insert(r);
          return r;
        })();

    // Filing the report is what pays the expert. settle() refuses an audit that
    // is not in progress, so a report cannot be filed against an unfunded audit,
    // and it is idempotent, so re-submitting does not pay twice.
    // Deliberately NOT swallowed: a failed payout must surface, not vanish.
    const { payout } = this.auditRequestsService.settle(dto.auditRequestId);

    // Expert reports do not change milestone status — that stays with the client.
    return { ...report, payout };
  }

  resetToSeed() {
    this.auditReportsRepository.resetToSeed();
  }
}
