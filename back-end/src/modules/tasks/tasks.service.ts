import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksRepository } from './tasks.repository';
import { LedgerService } from '../ledger/ledger.service';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';
import { UsersService } from '../users/users.service';
import { MilestonesService } from '../milestones/milestones.service';
import { ProposalsService } from '../proposals/proposals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Actor } from '../../common/decorators/actor.decorator';
import { canViewAnyRecord, assertAllowed } from '../../common/guards/viewer.util';
import { ROLES } from '../../common/constants/roles';
import { FEE_CONFIG, cancellationRate, round2 } from '../ledger/fee-config';

/** Milestones whose money has been paid out (mirrors milestones.service SETTLED). */
const SETTLED_MILESTONE = ['completed', 'approved', 'audit-passed', 'done'];

/** Refuses a date before today. Dates are compared as YYYY-MM-DD. */
function assertNotPast(date: string | undefined | null, what: string) {
  if (!date) return;
  const today = new Date().toISOString().slice(0, 10);
  if (String(date).slice(0, 10) < today) {
    throw new BadRequestException(`${what} is in the past. Choose today or a later date.`);
  }
}

/**
 * TasksService — Business Logic Layer
 *
 * Handles validation and error handling.
 * Delegates all data-access operations to TasksRepository.
 *
 * Two kinds of write live here, and they are kept apart on purpose:
 *   - `update()` is what a person asks for over HTTP. It is checked against
 *     the caller and may only touch descriptive fields.
 *   - `assignWorker()` / `setProgress()` are the lifecycle moves the platform
 *     makes itself (a hire, a milestone approval). They used to share the
 *     public `update()`, which is why that route accepted `workerId`,
 *     `status` and `progress` from anyone.
 */
@Injectable()
export class TasksService implements OnModuleInit {
  constructor(
    private readonly tasksRepository: TasksRepository,
    @Inject(forwardRef(() => LedgerService)) private ledger: LedgerService,
    @Inject(forwardRef(() => AuditRequestsService)) private auditRequests: AuditRequestsService,
    @Inject(forwardRef(() => UsersService)) private users: UsersService,
    @Inject(forwardRef(() => MilestonesService)) private milestones: MilestonesService,
    @Inject(forwardRef(() => ProposalsService)) private proposals: ProposalsService,
    @Inject(forwardRef(() => NotificationsService)) private notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.users.setStatsProvider((id, role) => this.statsFor(id, role));
  }

  /**
   * A person's track record, worked out from what actually happened:
   *   - workers and clients: projects completed and in progress;
   *   - experts: engagements completed and paid.
   * Nothing here is stored, so nothing can be typed in or go stale. (There is
   * no rating system, so no rating is reported.)
   */
  statsFor(id: string, role: string): Record<string, any> {
    if (role === ROLES.EXPERT) {
      return { reviewsDone: this.safeCount(() => this.auditRequests.paidReviewCount(id)) };
    }
    if (role !== ROLES.WORKER && role !== ROLES.CLIENT) return {};
    const side = role === ROLES.WORKER ? 'workerId' : 'clientId';
    const mine = this.tasksRepository.findAll({}).filter((t: any) => t[side] === id);
    return {
      completedProjects: mine.filter((t: any) => t.status === 'completed').length,
      activeProjects: mine.filter((t: any) => t.status === 'in-progress').length,
    };
  }

  private safeCount(fn: () => number): number {
    try { return fn(); } catch { return 0; }
  }

  /**
   * A draft is an audit-gated project that has not gone live yet. It is
   * visible to its own client and to staff who may read any record — never in
   * anyone else's listing. Previously `?status=draft` (or any `clientId`
   * filter) skipped this check and listed every draft on the platform.
   */
  findAll(
    query?: { clientId?: string; workerId?: string; status?: string },
    viewer?: { id?: string; role?: string } | 'system',
  ) {
    const tasks = this.tasksRepository.findAll(query || {});
    if (viewer === 'system') return tasks;
    if (viewer && canViewAnyRecord(viewer.role)) return tasks;
    const viewerId = viewer ? viewer.id : undefined;
    return tasks.filter(t => t.status !== 'draft' || (viewerId && this.canSeeDraft(t, viewerId)));
  }

  /**
   * A single task. A draft is visible to its client, staff who read every
   * record, and the reviewer it is waiting on — not to anyone with the id.
   */
  findById(id: string, viewer?: { id?: string; role?: string }) {
    const task = this.tasksRepository.findById(id);
    if (!task) throw new NotFoundException(`Task with id "${id}" not found`);
    if (viewer && task.status === 'draft' && !canViewAnyRecord(viewer.role) && !this.canSeeDraft(task, viewer.id)) {
      throw new NotFoundException(`Task with id "${id}" not found`);
    }
    return task;
  }

  private canSeeDraft(task: any, viewerId?: string) {
    if (!viewerId) return false;
    return task.clientId === viewerId || this.reviewersOf(task.id).includes(viewerId);
  }

  /** Every reviewer engaged on this task — its audits and its disputes. */
  reviewersOf(taskId: string): string[] {
    try {
      return this.auditRequests
        .findAll({ taskId })
        .map((a: any) => a.expertId)
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  /** The task, if the caller is its client (or operations staff). */
  private findOwned(id: string, actor: Actor) {
    const task = this.findById(id);
    assertAllowed(
      task.clientId === actor.id || actor.role === ROLES.SUPERUSER,
      'Only the client who owns this project can change it.',
    );
    return task;
  }

  create(dto: CreateTaskDto, actor: Actor) {
    // The owner is the caller, not whatever `clientId` the body named — a
    // client could otherwise post projects on another client's account. Only
    // clients post projects: the budget comes out of the poster's own wallet,
    // so nobody (operations staff included) can post one for someone else.
    assertAllowed(actor.role === ROLES.CLIENT, 'Only clients can post projects.');
    const clientId = actor.id;
    assertNotPast(dto.deadline, 'The deadline');

    // Milestones posted with the project are checked before any money moves,
    // so a refused milestone never leaves a funded project to clean up.
    const plan = dto.milestones || [];
    for (const m of plan) {
      assertNotPast(m.dueDate, `"${m.title}" is due on a date that`);
      if (dto.deadline && m.dueDate && m.dueDate > dto.deadline) {
        throw new BadRequestException(`"${m.title}" is due after the project deadline.`);
      }
    }
    const planned = round2(plan.reduce((a, m) => a + m.budget, 0));
    if (plan.length && planned !== round2(dto.budget)) {
      throw new BadRequestException(
        `The milestones add up to ₹${planned}, but the budget is ₹${dto.budget}. They must match.`,
      );
    }

    // Validate the reviewer before anything is stored or charged.
    if (dto.auditEnabled) {
      if (!dto.auditExpertId) {
        throw new BadRequestException('Select an Expert Reviewer for the technical audit before publishing.');
      }
      if (!dto.auditFee || dto.auditFee < 1) {
        throw new BadRequestException('Enter an opening offer of at least ₹1 for the technical audit.');
      }
      this.auditRequests.assertAssignableExpert(dto.auditExpertId, dto.category);
    }

    // A project that requires a technical audit is not fully created until an
    // expert has accepted and their fee is in escrow. Until then it is a draft:
    // invisible in browse listings and un-hireable.
    const id = this.tasksRepository.generateId();
    const { milestones: _plan, ...fields } = dto;
    const task = {
      ...fields,
      id,
      clientId,
      status: dto.auditEnabled ? 'draft' : 'open',
      progress: 0,
      workerId: null,
      createdAt: new Date().toISOString().slice(0, 10),
      // When workers could first see it — the cancellation clock. A draft
      // goes live when its audit is accepted.
      publishedAt: dto.auditEnabled ? null : new Date().toISOString(),
      // The most this project has ever held, so a client cannot cut the
      // budget to a rupee and then cancel for a rupee's fee.
      peakBudget: dto.budget,
      currency: 'INR',
      skills: dto.skills || [],
      auditEnabled: !!dto.auditEnabled,
    };
    delete (task as any).auditDomain;

    // The budget moves into escrow as the project is posted. If the client
    // cannot cover it, nothing is stored.
    this.ledger.fundProjectBudget(id, clientId, task.budget, task.title);
    this.tasksRepository.insert(task);
    for (const m of plan) this.milestones.createForNewTask(task, m);

    // An audited project opens its expert engagement immediately, carrying the
    // client's opening offer. The project stays a draft until an expert accepts.
    if (task.auditEnabled) {
      try {
        this.auditRequests.create({
          kind: 'project-audit',
          taskId: task.id,
          clientId: task.clientId,
          // The client picks one reviewer; only they can see this engagement.
          expertId: dto.auditExpertId,
          category: task.category,
          severity: 'Medium',
          project: task.title,
          status: 'preview-sent',
          openingOffer: dto.auditFee,
          dueDate: task.deadline,
        });
      } catch (e) {
        // The reviewer was checked above, so this is unexpected — but a draft
        // with no engagement could never go live, so undo it completely.
        this.ledger.refundRemaining(id, clientId, 'Project could not be created — budget returned');
        this.milestones.removeAllForTask(task.id);
        this.tasksRepository.deleteById(task.id);
        throw e;
      }
    }

    this.notify(task.auditEnabled ? dto.auditExpertId : null, {
      type: 'audit-request',
      text: 'You have been asked to audit a project',
      subtext: `${task.title} — review the scope and send your quote`,
      link: '/expert-audit-requests',
    });

    return this.tasksRepository.findById(task.id);
  }

  /** Releases a draft project once its audit is funded and accepted. */
  publishDraft(id: string) {
    const task = this.findById(id);
    if (task.status !== 'draft') return task;
    return this.tasksRepository.update(id, { status: 'open', publishedAt: new Date().toISOString() });
  }

  /**
   * What cancelling would cost. Only a project nobody has been hired for can
   * be cancelled; once a worker is on it the contract stands and nothing is
   * refunded by cancelling. The fee applies to the project budget only —
   * audit and dispute escrow is always returned in full.
   */
  cancellationQuote(id: string, actor?: Actor) {
    const task = actor ? this.findOwned(id, actor) : this.findById(id);
    const escrow = this.ledger.getEscrow(id);
    const base = round2(Math.max(Number(task.peakBudget) || 0, Number(task.budget) || 0));
    const liveSince = task.publishedAt || (task.status === 'open' ? task.createdAt : null);
    const hoursLive = liveSince ? Math.max(0, (Date.now() - new Date(liveSince).getTime()) / 3600000) : 0;
    const cancellable = !task.workerId && ['open', 'draft'].includes(task.status);
    // A draft has never been visible to workers, so it costs nothing.
    const rate = task.status === 'draft' || !liveSince ? 0 : cancellationRate(hoursLive);
    const fee = round2(Math.min(round2(base * (rate / 100)), escrow.projectHeld));
    return {
      cancellable,
      reason: cancellable ? null : task.workerId
        ? 'A worker has been hired, so this project can no longer be cancelled or refunded.'
        : `A ${task.status} project cannot be cancelled.`,
      status: task.status,
      hoursLive: Math.round(hoursLive * 10) / 10,
      rate,
      base,
      fee,
      refund: {
        project: round2(escrow.projectHeld - fee),
        audit: escrow.auditHeld,
        dispute: escrow.disputeHeld,
        total: round2(escrow.projectHeld - fee + escrow.auditHeld + escrow.disputeHeld),
      },
      policy: { ...FEE_CONFIG.cancellation },
    };
  }

  /** Keeps the cancellation fee, then returns everything else held for the project. */
  private settleCancellation(task: any, reason: string, chargeFee: boolean) {
    const quote = this.cancellationQuote(task.id);
    const fee = chargeFee && quote.fee > 0
      ? this.ledger.chargeCancellationFee({
          taskId: task.id, clientId: task.clientId, amount: quote.fee, rate: quote.rate, base: quote.base, title: task.title,
        })
      : null;
    const refunds = this.ledger.refundRemaining(task.id, task.clientId, reason, ['project', 'audit', 'dispute']);
    this.auditRequests.cancelOpenForTask(task.id);
    this.proposals.closeAllForTask(task.id);
    return { fee, refunds };
  }

  /**
   * A client edits their own project.
   *
   * Only descriptive fields. The budget is fixed once the project is posted —
   * it is the price workers accept — so a client who wants a different one
   * deletes the project and posts it again. The only status a client may set is `cancelled`, on a project
   * nobody has been hired for — everything else is the lifecycle's to decide
   * (hire → in-progress, last milestone settled → completed).
   */
  update(id: string, dto: UpdateTaskDto, actor: Actor) {
    const existing = this.findOwned(id, actor);
    const patch: Record<string, any> = {};

    if (dto.budget !== undefined && dto.budget !== existing.budget) {
      throw new BadRequestException(
        'The budget cannot be changed after a project is posted. Delete the project and post it again with the new budget.',
      );
    }

    for (const key of ['title', 'description', 'category', 'deadline', 'skills'] as const) {
      if (dto[key] !== undefined) patch[key] = dto[key];
    }
    if (patch.deadline !== undefined && patch.deadline !== existing.deadline) assertNotPast(patch.deadline, 'The deadline');
    if (patch.category && patch.category !== existing.category && existing.status !== 'open') {
      throw new BadRequestException('The category cannot change once the project has a reviewer or a worker.');
    }

    if (dto.status !== undefined && dto.status !== existing.status) {
      if (existing.status === 'draft') {
        throw new BadRequestException(
          'This project is awaiting its technical audit. Cancel the draft from Audit Offers to get your money back.',
        );
      }
      if (dto.status === 'cancelled' && existing.workerId) {
        throw new BadRequestException(
          'A worker has been hired, so this project can no longer be cancelled or refunded.',
        );
      }
      if (dto.status !== 'cancelled' || existing.status !== 'open') {
        throw new BadRequestException(
          'Project status follows the work: it starts when you hire and completes when the last milestone is settled. ' +
            'You can only cancel an open project with nobody hired.',
        );
      }
      patch.status = 'cancelled';
    }

    let cancellation: any = null;
    if (patch.status === 'cancelled') {
      cancellation = this.settleCancellation(existing, `Project cancelled — ${existing.title}`, true);
      patch.cancelledAt = new Date().toISOString();
    }

    const updated = this.tasksRepository.update(id, patch);
    return cancellation ? { ...updated, cancellation } : updated;
  }

  /**
   * Lifecycle: a worker accepted and the contract was funded. The contract
   * records its price (the posted budget), when it started (the non-delivery
   * clock) and the worker fee schedule in force, so a later rate change does
   * not reach back into work already agreed.
   */
  assignWorker(id: string, workerId: string) {
    const existing = this.tasksRepository.findById(id);
    return this.tasksRepository.update(id, {
      workerId,
      status: 'in-progress',
      contractPrice: existing?.budget,
      hiredAt: new Date().toISOString(),
      rates: { workerService: this.ledger.workerServiceSnapshot() },
    });
  }

  /**
   * Whether the client may end a contract because the worker stopped
   * delivering, and from when.
   *
   * The worker must have nothing waiting for review (no submitted or disputed
   * milestone) and nothing handed in for 14 days. Then: 14 days past the
   * project deadline, or — with no deadline — 30 days after the contract
   * started or the last submission, whichever is later.
   */
  nonDeliveryStatus(id: string, actor?: Actor) {
    const task = actor ? this.findOwned(id, actor) : this.findById(id);
    const DAY = 86_400_000;
    const now = Date.now();
    const base = { eligible: false, eligibleFrom: null as string | null, reason: '' };
    if (task.status !== 'in-progress' || !task.workerId) {
      return { ...base, reason: 'Only a contract in progress can be ended this way.' };
    }
    const milestones = this.milestones.findAll({ taskId: id });
    if (milestones.some((m: any) => ['submitted', 'review', 'disputed'].includes(m.status))) {
      return { ...base, reason: 'The worker has work waiting for your review. Approve it, request changes or raise a dispute instead.' };
    }
    const stamp = (v: any) => (v ? new Date(v).getTime() : NaN);
    const lastSubmission = Math.max(0, ...milestones.map((m: any) => stamp(m.submittedAt)).filter(Number.isFinite));
    const started = stamp(task.hiredAt) || stamp(task.createdAt) || now;
    const fromDeadline = task.deadline ? stamp(task.deadline) + 14 * DAY : NaN;
    const from = Math.max(
      Number.isFinite(fromDeadline) ? fromDeadline : Math.max(started, lastSubmission) + 30 * DAY,
      lastSubmission + 14 * DAY,
    );
    const eligibleFrom = new Date(from).toISOString();
    if (now < from) {
      return {
        ...base,
        eligibleFrom,
        reason: task.deadline
          ? 'You can end the contract 14 days after the deadline if the worker has still not delivered.'
          : 'You can end the contract 30 days after it started if the worker has not delivered.',
      };
    }
    return { eligible: true, eligibleFrom, reason: '' };
  }

  /**
   * The client ends a contract the worker stopped delivering on. Milestones
   * already paid stay paid; every milestone not yet delivered is cancelled and
   * its money returned. Nobody is charged a fee — the worker did not deliver.
   * The reviewer keeps what they earned; the rest of the audit fee comes back.
   */
  endForNonDelivery(id: string, actor: Actor) {
    const task = this.findOwned(id, actor);
    assertAllowed(task.clientId === actor.id, 'Only the client who owns this project can end its contract.');
    const status = this.nonDeliveryStatus(id);
    if (!status.eligible) throw new BadRequestException(status.reason);

    const cancelled: string[] = [];
    for (const m of this.milestones.findAll({ taskId: id })) {
      if (!SETTLED_MILESTONE.includes(m.status)) {
        this.milestones.systemUpdate(m.id, { status: 'cancelled', cancelledAt: new Date().toISOString() });
        cancelled.push(m.id);
      }
    }
    const audit = this.auditRequests.closeProjectAudit(id, 'Contract ended for non-delivery');
    const refunds = this.ledger.refundRemaining(id, task.clientId, `Contract ended — worker did not deliver (${task.title})`, ['project', 'audit', 'dispute']);
    const updated = this.tasksRepository.update(id, {
      status: 'cancelled',
      endedReason: 'non-delivery',
      cancelledAt: new Date().toISOString(),
    });
    this.notify(task.workerId, {
      type: 'contract-ended',
      text: `The client ended the contract for "${task.title}"`,
      subtext: 'Nothing was delivered after the deadline. Milestones already paid stay paid.',
      link: '/worker-my-projects',
    });
    return { task: updated, cancelledMilestones: cancelled, refunds, audit };
  }

  /**
   * Lifecycle: milestone settlements roll up into the task. When the last one
   * settles, whatever is still held for the project — a budget the milestones
   * did not use up, the odd cent of a split — goes back to the client, so a
   * finished project holds nothing.
   */
  setProgress(id: string, progress: number, status: string) {
    const before = this.tasksRepository.findById(id);
    const updated = this.tasksRepository.update(id, { progress, status });
    if (status === 'completed' && before && before.status !== 'completed') {
      this.ledger.refundRemaining(id, before.clientId, `Project completed — unused budget returned (${before.title})`);
      this.auditRequests.closeProjectAudit(id, 'Project completed');
    }
    return updated;
  }

  /**
   * Abandons a draft project and returns every cent held for it — the budget
   * and any audit escrow — to the client.
   */
  cancelDraft(id: string, actor: Actor) {
    const task = this.findOwned(id, actor);
    if (task.status !== 'draft') {
      throw new BadRequestException('Only a draft project can be cancelled this way.');
    }
    const refunds = this.ledger.refundRemaining(id, task.clientId, `Draft project cancelled — ${task.title}`, ['project', 'audit']);
    this.auditRequests.cancelOpenForTask(id);
    // Written through the repository: mutating the object only worked while
    // findById happened to hand back the stored reference.
    const cancelled = this.tasksRepository.update(id, { status: 'cancelled', cancelledAt: new Date().toISOString() });
    return { task: cancelled, refunds };
  }

  /**
   * Deletes a project nobody was hired for. Anything still held for it is
   * refunded first, so deleting never strands money.
   */
  delete(id: string, actor: Actor) {
    const task = this.findOwned(id, actor);
    if (task.workerId) {
      throw new ForbiddenException('A project with a hired worker cannot be deleted.');
    }
    if (!['open', 'cancelled', 'draft'].includes(task.status)) {
      throw new ForbiddenException('Only a project that never started can be deleted.');
    }
    // Deleting a live project is a cancellation too, so the client pays the
    // same fee — otherwise deleting would be a free way round it. A superuser
    // removing a project (moderation) returns everything.
    const chargeFee = task.status === 'open' && actor.role !== ROLES.SUPERUSER;
    const { fee, refunds } = this.settleCancellation(task, `Project deleted — ${task.title}`, chargeFee);
    this.milestones.removeAllForTask(id);
    this.tasksRepository.deleteById(id);
    return { deleted: true, fee, refunds };
  }

  private notify(userId: string | null | undefined, n: { type: string; text: string; subtext?: string; link?: string }) {
    if (!userId) return;
    try { this.notifications.create({ userId, ...n } as any); } catch { /* best-effort */ }
  }

  resetToSeed() {
    this.tasksRepository.resetToSeed();
  }
}
