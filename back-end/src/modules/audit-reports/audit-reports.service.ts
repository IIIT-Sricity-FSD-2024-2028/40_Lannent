import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { CreateAuditReportDto } from './dto/create-audit-report.dto';
import { AuditReportsRepository } from './audit-reports.repository';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';
import { MilestonesService } from '../milestones/milestones.service';
import { TasksService } from '../tasks/tasks.service';
import { canViewTask, canViewAnyRecord } from '../../common/guards/viewer.util';

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
    @Inject(forwardRef(() => TasksService)) private tasks: TasksService,
  ) {}

  findAll(query?: { taskId?: string; auditRequestId?: string },
          viewer?: { id?: string; role?: string }) {
    const all = this.auditReportsRepository.findAll(query);
    if (!viewer || canViewAnyRecord(viewer.role)) return all;
    // A report belongs to the project it audits. It was readable by anyone —
    // this route had no guard at all.
    return all.filter((r: any) => this.canView(r, viewer));
  }

  findById(id: string, viewer?: { id?: string; role?: string }) {
    const report = this.auditReportsRepository.findById(id);
    if (!report) throw new NotFoundException(`Audit report with id "${id}" not found`);
    if (viewer && !this.canView(report, viewer)) {
      throw new ForbiddenException(
        'You do not have access to this report. Only the people involved in the project can view it.',
      );
    }
    return report;
  }

  /**
   * A report carries no owner columns, so the parties are resolved by joining
   * to its task and its audit engagement.
   */
  private canView(report: any, viewer: { id?: string; role?: string }): boolean {
    const task = this.safe(() => this.tasks.findById(report.taskId));
    const engagement = report.auditRequestId
      ? this.safe(() => this.auditRequestsService.findById(report.auditRequestId))
      : null;
    return canViewTask(
      viewer.id, viewer.role, task,
      report.expertId, engagement?.expertId, engagement?.clientId, engagement?.workerId,
    );
  }

  private safe<T>(fn: () => T): T | null {
    try { return fn(); } catch { return null; }
  }

  create(dto: CreateAuditReportDto) {
    // Keyed on the milestone as well as the engagement: re-filing a report
    // updates that milestone's report, it does not replace another one.
    const existing = this.auditReportsRepository.findByEngagementAndMilestone(
      dto.auditRequestId,
      dto.milestoneId,
    );

    const report = existing
      ? this.auditReportsRepository.updateByEngagementAndMilestone(dto.auditRequestId, dto.milestoneId, {
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
    // The milestone id is what tells the engagement which part of the project
    // this report covers — without it a four-milestone audit cannot know when
    // it is done.
    const { payout } = this.auditRequestsService.settle(dto.auditRequestId, dto.milestoneId);

    // Expert reports do not change milestone status — that stays with the client.
    return { ...report, payout };
  }

  resetToSeed() {
    this.auditReportsRepository.resetToSeed();
  }
}
