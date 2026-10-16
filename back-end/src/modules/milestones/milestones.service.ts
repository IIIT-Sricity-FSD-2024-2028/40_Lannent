import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
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
import { Actor } from '../../common/decorators/actor.decorator';
import { assertAllowed, canViewAnyRecord, canViewTask } from '../../common/guards/viewer.util';
import { round2 } from '../ledger/fee-config';
import { AuditService } from '../audit/audit.service';

/** Statuses a worker moves their own milestone between while working on it. */
const WORKER_SETTABLE = ['pending', 'in-progress'];
/** Statuses from which a worker may pick the milestone back up. */
const WORKER_FROM = ['pending', 'in-progress', 'revision-needed'];
/** A milestone whose money has been paid out to the worker. */
export const SETTLED = ['completed', 'approved', 'audit-passed', 'done'];
/** Statuses a worker can submit (or resubmit) work from. */
const SUBMITTABLE = ['pending', 'in-progress', 'revision-needed', 'submitted'];

const DAY_MS = 86_400_000;
/** A submission the client neither approves, sends back nor disputes is paid after this long. */
export const AUTO_APPROVE_DAYS = 7;
/** How many times a client may send one milestone back before they must approve or dispute. */
export const MAX_REVISION_REQUESTS = 3;

/**
 * MilestonesService — Business Logic Layer
 *
 * Handles submission, approval, audit-request creation, and task-completion checks.
 * Delegates all data-access operations to MilestonesRepository.
 */
@Injectable()
export class MilestonesService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly milestonesRepository: MilestonesRepository,
    @Inject(forwardRef(() => TasksService)) private tasksService: TasksService,
    @Inject(forwardRef(() => UsersService)) private usersService: UsersService,
    @Inject(forwardRef(() => TransactionsService)) private transactionsService: TransactionsService,
    @Inject(forwardRef(() => LedgerService)) private ledger: LedgerService,
    @Inject(forwardRef(() => AuditRequestsService)) private auditRequestsService: AuditRequestsService,
    @Inject(forwardRef(() => NotificationsService)) private notificationsService: NotificationsService,
    private readonly log: AppLoggerService,
    private readonly audit: AuditService,
  ) {}

  /** Checks for expired review windows once a minute (not under test — tests move the clock themselves). */
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => this.autoApproveDue(), 60_000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Internal callers get every milestone. A viewer sees the full record on
   * projects they are part of; on someone else's project they see only an
   * open project's plan (so a worker can judge it before bidding) and never
   * the submitted work.
   */
  findAll(query?: { taskId?: string }, viewer?: { id?: string; role?: string }) {
    const all = this.milestonesRepository.findAll(query);
    if (!viewer || canViewAnyRecord(viewer.role)) return all;
    const out: any[] = [];
    const access: Record<string, 'full' | 'plan' | 'none'> = {};
    for (const m of all) {
      if (!(m.taskId in access)) access[m.taskId] = this.accessTo(m.taskId, viewer);
      if (access[m.taskId] === 'full') out.push(m);
      else if (access[m.taskId] === 'plan') out.push({ ...m, deliverable: null, revisionNote: null });
    }
    return out;
  }

  findById(id: string, viewer?: { id?: string; role?: string }) {
    const ms = this.milestonesRepository.findById(id);
    if (!ms) throw new NotFoundException(`Milestone with id "${id}" not found`);
    if (!viewer || canViewAnyRecord(viewer.role)) return ms;
    const access = this.accessTo(ms.taskId, viewer);
    if (access === 'none') throw new NotFoundException(`Milestone with id "${id}" not found`);
    return access === 'full' ? ms : { ...ms, deliverable: null, revisionNote: null };
  }

  private accessTo(taskId: string, viewer: { id?: string; role?: string }): 'full' | 'plan' | 'none' {
    let task: any = null;
    try { task = this.tasksService.findById(taskId); } catch { return 'none'; }
    if (canViewTask(viewer.id, viewer.role, task, ...this.tasksService.reviewersOf(taskId))) return 'full';
    return task.status === 'open' ? 'plan' : 'none';
  }

  /** What the milestones on a task add up to. */
  totalBudget(taskId: string, exceptId?: string) {
    return round2(
      this.milestonesRepository
        .filterByTaskId(taskId)
        .filter(m => m.id !== exceptId)
        .reduce((a, m) => a + (Number(m.budget) || 0), 0),
    );
  }

  removeAllForTask(taskId: string) {
    return this.milestonesRepository.deleteByTaskId(taskId);
  }

  /** Milestones are paid from the project budget, so together they cannot exceed it. */
  private assertWithinBudget(task: any, budget: number, exceptId?: string) {
    const others = this.totalBudget(task.id, exceptId);
    if (round2(others + budget) > task.budget) {
      const left = round2(task.budget - others);
      throw new BadRequestException(
        `Milestones cannot add up to more than the project budget of ₹${task.budget}. ` +
          `₹${left > 0 ? left : 0} is left to allocate.`,
      );
    }
  }

  /** The milestone's task, plus whether the caller is its client or its worker. */
  private roleOn(ms: any, actor: Actor) {
    const task = this.tasksService.findById(ms.taskId);
    return {
      task,
      // Only the project's own client — operations staff do not edit the
      // plan or approve work on a client's behalf (stuck cases go through
      // the dispute override instead).
      isClient: task.clientId === actor.id,
      isWorker: !!task.workerId && task.workerId === actor.id,
    };
  }

  create(dto: CreateMilestoneDto, actor: Actor) {
    const task = this.tasksService.findById(dto.taskId);
    assertAllowed(task.clientId === actor.id, 'Only the client who owns this project can add milestones to it.');
    if (['completed', 'cancelled'].includes(task.status)) {
      throw new BadRequestException(`Milestones cannot be added to a ${task.status} project.`);
    }
    assertDueDate(dto.dueDate, task);
    this.assertWithinBudget(task, dto.budget);
    return this.insertFor(task, dto);
  }

  /** A milestone posted together with its project (already validated by TasksService). */
  createForNewTask(task: any, m: { title: string; description?: string; budget: number; dueDate?: string; priority?: string }) {
    return this.insertFor(task, { ...m, taskId: task.id });
  }

  private insertFor(task: any, dto: any) {
    const { workerId: _ignored, ...fields } = dto;
    const ms = {
      ...fields,
      id: this.milestonesRepository.generateId(),
      status: 'pending',
      submittedAt: null,
      approvedAt: null,
      deliverable: null,
      progress: 0,
      priority: dto.priority || 'Medium',
      dueDate: dto.dueDate || null,
      // Payable to whoever is hired on the task — never to an id the body
      // names. A milestone created with the client's own id once paid
      // escrow straight back to them.
      workerId: task.workerId || null,
    };
    return this.milestonesRepository.insert(ms);
  }

  /**
   * The client removes a milestone from their plan. Only before anyone is
   * hired: after that the milestones are the contract the worker agreed to.
   */
  remove(id: string, actor: Actor) {
    const ms = this.findById(id);
    const task = this.tasksService.findById(ms.taskId);
    assertAllowed(task.clientId === actor.id, 'Only the client who owns this project can remove its milestones.');
    if (task.workerId || !['open', 'draft'].includes(task.status)) {
      throw new BadRequestException('A worker has been hired, so the milestones are part of the contract and cannot be removed.');
    }
    if (ms.status !== 'pending') {
      throw new BadRequestException('Only a milestone that has not started can be removed.');
    }
    this.milestonesRepository.deleteById(id);
    return { deleted: true, id };
  }

  /**
   * A person edits a milestone. The client owns the description and the
   * budget; the worker owns "I have started". Neither can reassign who is
   * paid, and nobody can mark it paid without the money moving — that is
   * what /approve and dispute resolution are for.
   */
  update(id: string, dto: UpdateMilestoneDto, actor: Actor) {
    const ms = this.findById(id);
    const { task, isClient, isWorker } = this.roleOn(ms, actor);
    assertAllowed(isClient || isWorker, 'Only the client and the worker on this project can change its milestones.');

    const patch: Record<string, any> = {};

    if (isClient) {
      for (const key of ['title', 'description', 'dueDate', 'priority'] as const) {
        if (dto[key] !== undefined) patch[key] = dto[key];
      }
      if (patch.dueDate !== undefined && patch.dueDate !== ms.dueDate) assertDueDate(patch.dueDate, task);
      if (dto.budget !== undefined && dto.budget !== ms.budget) {
        if (!['pending', 'in-progress'].includes(ms.status)) {
          throw new BadRequestException('The budget cannot change once work has been submitted.');
        }
        // Once a worker is hired the milestone amounts are what they agreed
        // to. Lowering one would cut their pay and hand the difference back
        // to the client when the project completes.
        if (task.workerId && dto.budget < ms.budget) {
          throw new BadRequestException('A worker has been hired, so a milestone\'s amount can be raised but not lowered.');
        }
        this.assertWithinBudget(task, dto.budget, ms.id);
        patch.budget = dto.budget;
      }
    }

    if (dto.progress !== undefined) {
      assertAllowed(isWorker, 'Only the worker reports progress on a milestone.');
      patch.progress = dto.progress;
    }

    if (dto.status !== undefined && dto.status !== ms.status) {
      if (isWorker && WORKER_SETTABLE.includes(dto.status) && WORKER_FROM.includes(ms.status)) {
        patch.status = dto.status;
      } else if (isClient && dto.status === 'revision-needed' && ['submitted', 'review'].includes(ms.status)) {
        // "Request changes" on a submission. The client's note is what the
        // worker revises against, so it is kept with the milestone.
        //
        // Capped: with no limit a client could send the same work back
        // forever and never pay for it.
        const used = Number(ms.revisionCount) || 0;
        if (used >= MAX_REVISION_REQUESTS) {
          throw new BadRequestException(
            `You have already asked for changes ${MAX_REVISION_REQUESTS} times on this milestone. ` +
              'Approve it, or raise a dispute and let a reviewer decide.',
          );
        }
        const note = dto.revisionNote ? String(dto.revisionNote).trim() : '';
        if (note.length < 10) throw new BadRequestException('Tell the worker what to change (at least 10 characters).');
        patch.status = dto.status;
        patch.revisionNote = note;
        patch.revisionRequestedAt = new Date().toISOString();
        patch.revisionCount = used + 1;
        // The auto-approval clock stops while the work is back with the worker.
        patch.reviewDueAt = null;
        this.notificationsService.notify(task.workerId, {
          type: 'revision',
          text: `Changes requested on "${ms.title}"`,
          subtext: patch.revisionNote ? patch.revisionNote.slice(0, 120) : task.title,
          link: `/worker-milestone-board?id=${task.id}`,
        });
      } else {
        throw new BadRequestException(
          `A milestone cannot move from "${ms.status}" to "${dto.status}" this way. ` +
            'Submitting, approving and disputing each have their own action.',
        );
      }
    }

    return this.milestonesRepository.update(id, patch);
  }

  /** Lifecycle writes the platform makes itself (dispute flags, hire backfill). */
  systemUpdate(id: string, partial: Record<string, any>) {
    const updated = this.milestonesRepository.update(id, partial);
    if (!updated) throw new NotFoundException(`Milestone with id "${id}" not found`);
    return updated;
  }

  submitDeliverable(id: string, deliverable: any, actor: Actor) {
    const ms = this.findById(id);
    const { task, isWorker } = this.roleOn(ms, actor);
    assertAllowed(isWorker, 'Only the worker hired on this project can submit its milestones.');
    if (SETTLED.includes(ms.status)) {
      throw new BadRequestException('This milestone has already been settled.');
    }
    if (ms.status === 'disputed') {
      throw new BadRequestException('This milestone is under dispute. Wait for the reviewer\'s verdict.');
    }
    if (!SUBMITTABLE.includes(ms.status)) {
      throw new BadRequestException(`A milestone cannot be submitted from "${ms.status}".`);
    }
    if (task.status !== 'in-progress') {
      throw new BadRequestException(`This project is ${task.status}, so work can no longer be submitted.`);
    }
    // Something has to be handed in: a file or a link to the work.
    if (!deliverable || (!(deliverable.files || []).length && !deliverable.link)) {
      throw new BadRequestException('Attach at least one file or a link to the work.');
    }
    const now = new Date();
    ms.status = 'submitted';
    ms.submittedAt = now.toISOString();
    // The client has this long to approve, ask for changes or dispute.
    ms.reviewDueAt = new Date(now.getTime() + AUTO_APPROVE_DAYS * DAY_MS).toISOString();
    ms.progress = 100;
    ms.deliverable = deliverable;

    this.handOverToAuditor(ms);
    this.notificationsService.notify(task.clientId, {
      type: 'milestone-submitted',
      text: `New deliverable: "${ms.title}"`,
      subtext: `${task.title} — ready for your review`,
      link: `/review-deliverable?milestoneId=${ms.id}`,
    });

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
      this.auditRequestsService.systemUpdate(engagement.id, {
        milestoneId: ms.id,
        worker: workerName,
        milestone: ms.title,
      });

      this.notificationsService.notify(engagement.expertId, {
        type: 'audit-needed',
        text: 'New deliverable awaiting technical audit',
        subtext: `${ms.title || 'Milestone'} — ${task.title || 'Project'}`,
        link: `/expert-audit-preview?id=${engagement.id}`,
      });
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

  approveDeliverable(id: string, actor: Actor) {
    const ms = this.findById(id);
    const task = this.tasksService.findById(ms.taskId);
    // Any client could approve any milestone, releasing another client's
    // escrow to the worker.
    assertAllowed(task.clientId === actor.id, 'Only the client who owns this project can approve its milestones.');
    if (ms.status === 'disputed') {
      // The dispute's verdict decides where this money goes; approving now
      // would pay the worker and still leave the verdict free to refund it.
      throw new BadRequestException('This milestone is under dispute. The reviewer verdict will settle it.');
    }
    if (SETTLED.includes(ms.status)) {
      throw new BadRequestException('This milestone has already been settled.');
    }
    if (!['submitted', 'review'].includes(ms.status)) {
      throw new BadRequestException('There is nothing to approve yet — the worker has not submitted this milestone.');
    }
    return this.payOut(ms, task, `Payment for ${ms.title}`, 'approved');
  }

  /**
   * Accepts a milestone and pays it: the client's approval, a worker-favour
   * verdict and auto-approval all end here, so they settle the worker and the
   * reviewer the same way.
   */
  payOut(ms: any, task: any, description: string, how: 'approved' | 'verdict' | 'auto-approved') {
    // Release before marking complete: if escrow cannot cover the milestone the
    // approval must fail rather than mark it paid. LedgerService is idempotent
    // per milestone, so approving twice cannot pay twice.
    const release = this.ledger.releaseMilestone({
      milestoneId: ms.id,
      taskId: ms.taskId,
      clientId: task.clientId,
      workerId: ms.workerId,
      amount: ms.budget,
      description,
      workerServiceTiers: task.rates?.workerService,
    });

    this.milestonesRepository.update(ms.id, {
      status: 'completed',
      approvedAt: new Date().toISOString().slice(0, 10),
      approvedHow: how,
      progress: 100,
      reviewDueAt: null,
    });
    const settled = this.milestonesRepository.findById(ms.id);

    // The reviewer's share for this milestone: paid, or — when the client
    // approved without a report after the reviewer's window — returned.
    const audit = this.auditRequestsService.settleMilestoneOnApproval(settled);

    this.checkTaskCompletion(ms.taskId);

    this.notificationsService.notify(ms.workerId, {
      type: 'payment',
      text: `"${ms.title}" ${how === 'auto-approved' ? 'was approved automatically' : 'approved'} — ₹${release.net ?? 0} paid to your wallet`,
      subtext: `${task.title} · ₹${ms.budget} less the service fee`,
      link: '/worker-wallet',
    });
    if (how === 'auto-approved') {
      this.notificationsService.notify(task.clientId, {
        type: 'payment',
        text: `"${ms.title}" was approved automatically`,
        subtext: `${task.title} — it waited ${AUTO_APPROVE_DAYS} days with no approval, change request or dispute.`,
        link: `/project-milestone-board?id=${task.id}`,
      });
    }

    return { ...settled, release, audit };
  }

  /**
   * Pays every submission whose review window has run out. Runs on a timer;
   * `now` is a parameter so tests can move the clock. Only milestones
   * submitted under the current rules carry `reviewDueAt`, so older records
   * are never approved behind anyone's back.
   */
  autoApproveDue(now = Date.now()) {
    const done: string[] = [];
    for (const ms of this.milestonesRepository.findAll({})) {
      if (!['submitted', 'review'].includes(ms.status) || !ms.reviewDueAt) continue;
      if (new Date(ms.reviewDueAt).getTime() > now) continue;
      try {
        const task = this.tasksService.findById(ms.taskId);
        this.payOut(ms, task, `Payment for ${ms.title} (approved automatically after ${AUTO_APPROVE_DAYS} days)`, 'auto-approved');
        done.push(ms.id);
        // No request caused this payout, so the money trail never saw it.
        // The compliance desk still needs every release on record.
        this.audit.record({
          kind: 'money', actorId: null, actorRole: 'system', method: 'AUTO', path: `/api/milestones/${ms.id}/auto-approve`,
          outcome: 'ok', detail: { reason: 'auto-approved', taskId: ms.taskId, milestoneId: ms.id, amount: ms.budget },
        });
      } catch (e) {
        this.log.warn('milestones.autoApprove', `could not auto-approve ${ms.id}`, e);
      }
    }
    return done;
  }

  checkTaskCompletion(taskId: string) {
    if (!taskId) return;
    try {
      const task = this.tasksService.findById(taskId);
      const allMilestones = this.milestonesRepository.filterByTaskId(taskId);
      if (!allMilestones.length) return;

      const done = allMilestones.filter(m => SETTLED.includes(m.status)).length;
      const pct = Math.round((done / allMilestones.length) * 100);

      if (!task.workerId) return;
      this.tasksService.setProgress(taskId, pct, pct === 100 ? 'completed' : 'in-progress');
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

/** A due date cannot be in the past, or after the project's deadline. */
function assertDueDate(dueDate: string | undefined | null, task: any) {
  if (!dueDate) return;
  const today = new Date().toISOString().slice(0, 10);
  if (String(dueDate).slice(0, 10) < today) {
    throw new BadRequestException('The due date is in the past. Choose today or a later date.');
  }
  if (task?.deadline && String(dueDate).slice(0, 10) > String(task.deadline).slice(0, 10)) {
    throw new BadRequestException(`The due date is after the project deadline (${task.deadline}).`);
  }
}
