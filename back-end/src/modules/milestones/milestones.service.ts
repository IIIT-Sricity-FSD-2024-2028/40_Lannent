import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MilestonesRepository } from './milestones.repository';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppLoggerService } from '../../common/logging/app-logger.service';

/**
 * MilestonesService — Business Logic Layer
 *
 * Handles submission, approval, audit-request creation, and task-completion checks.
 * Delegates all data-access operations to MilestonesRepository.
 */
@Injectable()
export class MilestonesService {
  constructor(
    private readonly milestonesRepository: MilestonesRepository,
    @Inject(forwardRef(() => TasksService)) private tasksService: TasksService,
    @Inject(forwardRef(() => UsersService)) private usersService: UsersService,
    @Inject(forwardRef(() => TransactionsService)) private transactionsService: TransactionsService,
    @Inject(forwardRef(() => LedgerService)) private ledger: LedgerService,
    @Inject(forwardRef(() => AuditRequestsService)) private auditRequestsService: AuditRequestsService,
    @Inject(forwardRef(() => NotificationsService)) private notificationsService: NotificationsService,
    private readonly log: AppLoggerService,
  ) {}

  findAll(query?: { taskId?: string }) {
    return this.milestonesRepository.findAll(query);
  }

  findById(id: string) {
    const ms = this.milestonesRepository.findById(id);
    if (!ms) throw new NotFoundException(`Milestone with id "${id}" not found`);
    return ms;
  }

  create(dto: CreateMilestoneDto) {
    const ms = {
      id: this.milestonesRepository.generateId(),
      status: 'pending',
      submittedAt: null,
      approvedAt: null,
      deliverable: null,
      progress: 0,
      priority: dto.priority || 'Medium',
      dueDate: dto.dueDate || null,
      ...dto,
    };
    return this.milestonesRepository.insert(ms);
  }

  update(id: string, dto: UpdateMilestoneDto) {
    const updated = this.milestonesRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Milestone with id "${id}" not found`);
    return updated;
  }

  submitDeliverable(id: string, deliverable?: any) {
    const ms = this.findById(id);
    ms.status = 'submitted';
    ms.submittedAt = new Date().toISOString().slice(0, 10);
    if (deliverable) ms.deliverable = deliverable;

    this.handOverToAuditor(ms);

    return ms;
  }

  /**
   * Points the project's audit engagement at the milestone that now needs
   * reviewing, and tells the reviewer.
   *
   * Two rules live here:
   *
   *  - **Only the assigned reviewer hears about it.** The page that used to do
   *    this looped over every expert account and notified all of them, so
   *    reviewers with no connection to the project were told about work they
   *    could not open.
   *  - **A milestone is audited once.** If a report already exists for it —
   *    the case when a dispute sends the work back and the worker resubmits —
   *    the engagement is left alone and nobody is notified again.
   */
  private handOverToAuditor(ms: any) {
    try {
      const task = this.tasksService.findById(ms.taskId);
      if (!task?.auditEnabled) return;

      const engagement = this.auditRequestsService.activeProjectAudit(ms.taskId);
      if (!engagement || !engagement.expertId) return;

      if (this.auditRequestsService.isMilestoneAudited(engagement, ms.id)) {
        this.log.log(
          'milestones.submit',
          `milestone ${ms.id} was already audited under ${engagement.id}; no second audit raised`,
        );
        return;
      }

      const workerName = this.usersService.findById(ms.workerId)?.name || 'Worker';
      this.auditRequestsService.update(engagement.id, {
        milestoneId: ms.id,
        worker: workerName,
        milestone: ms.title,
      });

      this.notificationsService.create({
        userId: engagement.expertId,
        type: 'audit-needed',
        text: 'New deliverable awaiting technical audit',
        subtext: `${ms.title || 'Milestone'} — ${task.title || 'Project'}`,
      } as any);
    } catch (e) {
      // Submission succeeded; only the audit hand-off failed. The reviewer
      // would just never see the milestone, with no clue why.
      this.log.warn(
        'milestones.submit',
        `could not attach milestone ${ms.id} to the active audit engagement`,
        e,
      );
    }
  }

  approveDeliverable(id: string) {
    const ms = this.findById(id);
    const task = this.tasksService.findById(ms.taskId);

    // Release before marking complete: if escrow cannot cover the milestone the
    // approval must fail rather than mark it paid. LedgerService is idempotent
    // per milestone, so approving twice cannot pay twice.
    const release = this.ledger.releaseMilestone({
      milestoneId: id,
      taskId: ms.taskId,
      clientId: task.clientId,
      workerId: ms.workerId,
      amount: ms.budget,
      description: `Payment for ${ms.title}`,
    });

    ms.status = 'completed';
    ms.approvedAt = new Date().toISOString().slice(0, 10);
    ms.progress = 100;

    this.checkTaskCompletion(ms.taskId);

    return { ...ms, release };
  }

  checkTaskCompletion(taskId: string) {
    if (!taskId) return;
    try {
      const task = this.tasksService.findById(taskId);
      const allMilestones = this.milestonesRepository.filterByTaskId(taskId);
      if (!allMilestones.length) return;

      const done = allMilestones.filter(m =>
        ['completed', 'approved', 'audit-passed', 'done'].includes(m.status)
      ).length;
      const pct = Math.round((done / allMilestones.length) * 100);

      this.tasksService.update(taskId, {
        progress: pct,
        status: pct === 100 ? 'completed' : 'in-progress',
      });
    } catch (e) {
      this.log.warn(
        'milestones.checkTaskCompletion',
        `could not roll progress up to task ${taskId}`,
        e,
      );
    }
  }

  resetToSeed() {
    this.milestonesRepository.resetToSeed();
  }
}
