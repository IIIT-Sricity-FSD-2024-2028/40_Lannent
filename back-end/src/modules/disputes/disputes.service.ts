import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputesRepository } from './disputes.repository';
import { MilestonesService } from '../milestones/milestones.service';
import { TasksService } from '../tasks/tasks.service';
import { LedgerService } from '../ledger/ledger.service';
import { canViewTask, canViewAnyRecord } from '../../common/guards/viewer.util';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';
import { AppLoggerService } from '../../common/logging/app-logger.service';
import { UsersService } from '../users/users.service';
import { Actor } from '../../common/decorators/actor.decorator';
import { assertAllowed } from '../../common/guards/viewer.util';
import { NotificationsService } from '../notifications/notifications.service';
import { SETTLED } from '../milestones/milestones.service';
import { ROLES } from '../../common/constants/roles';
import { AuditService } from '../audit/audit.service';

const today = () => new Date().toISOString().slice(0, 10);
const DAY_MS = 86_400_000;
/**
 * A dispute's reviewer has this long to accept it, and then this long again
 * to give a verdict. Past either, the dispute expires: the reviewer fee goes
 * back and the milestone returns to the client's review queue. Without it an
 * unfunded $1 dispute froze a milestone — and the worker's pay — forever.
 */
export const DISPUTE_STEP_DAYS = 7;
/** After a dispute ends without a verdict, the client gets this long before the milestone auto-approves. */
const REVIEW_GRACE_DAYS = 2;

const VERDICT_TEXT: Record<string, string> = {
  'worker-favour': 'in favour of the worker — milestone paid',
  'client-favour': 'in favour of the client — milestone sent back to the worker',
};

/**
 * DisputesService — Business Logic Layer
 *
 * Handles dispute creation, resolution, and milestone status updates.
 * Delegates all data-access operations to DisputesRepository.
 */
@Injectable()
export class DisputesService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly disputesRepository: DisputesRepository,
    @Inject(forwardRef(() => MilestonesService)) private milestonesService: MilestonesService,
    @Inject(forwardRef(() => TasksService)) private tasksService: TasksService,
    @Inject(forwardRef(() => LedgerService)) private ledger: LedgerService,
    @Inject(forwardRef(() => AuditRequestsService)) private auditRequests: AuditRequestsService,
    @Inject(forwardRef(() => UsersService)) private users: UsersService,
    private readonly log: AppLoggerService,
    @Inject(forwardRef(() => NotificationsService)) private notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => this.expireDue(), 60_000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  findAll(viewer?: { id?: string; role?: string }) {
    const all = this.disputesRepository.findAll();
    if (!viewer || canViewAnyRecord(viewer.role)) return all;
    // Visible to the parties and the reviewer arbitrating it — not to every
    // reviewer on the platform, which is what an unguarded GET allowed.
    return all.filter((d: any) => this.canView(d, viewer));
  }

  findById(id: string, viewer?: { id?: string; role?: string }) {
    const d = this.disputesRepository.findById(id);
    if (!d) throw new NotFoundException(`Dispute with id "${id}" not found`);
    if (viewer && !this.canView(d, viewer)) {
      throw new ForbiddenException(
        'You do not have access to this dispute. Only the people involved can view it.',
      );
    }
    return d;
  }

  private canView(d: any, viewer: { id?: string; role?: string }): boolean {
    const task = d.taskId ? this.safe(() => this.tasksService.findById(d.taskId)) : null;
    return canViewTask(viewer.id, viewer.role, task, d.expertId, d.raisedBy, d.againstId, ...this.reviewersOfDispute(d));
  }

  /** Reviewers who were engaged on this dispute at any point (so a past reviewer can still read it). */
  private reviewersOfDispute(d: any): string[] {
    return this.safe(() =>
      this.auditRequests.findAll({ kind: 'dispute-audit' })
        .filter((a: any) => a.disputeId === d.id)
        .flatMap((a: any) => [a.expertId, a.declinedBy])
        .filter(Boolean),
    ) || [];
  }

  private safe<T>(fn: () => T): T | null {
    try { return fn(); } catch { return null; }
  }

  create(dto: CreateDisputeDto, actor: Actor) {
    // Parties come from the project, not the body. `raisedBy` and `againstId`
    // were taken as sent, so anyone could open a dispute in someone else's
    // name — on a project they had nothing to do with.
    const task = this.tasksService.findById(dto.taskId);
    if (!task.workerId) {
      throw new BadRequestException('A dispute needs a hired worker — nobody is working on this project yet.');
    }
    if (task.status !== 'in-progress') {
      throw new BadRequestException(`This project is ${task.status}, so its milestones can no longer be disputed.`);
    }
    // Disputes are the client's remedy against submitted work. A worker whose
    // submission is not being approved talks to the client in the workroom.
    assertAllowed(task.clientId === actor.id, 'Only the client on this project can raise a dispute.');
    const againstId = task.workerId;

    if (!dto.milestoneId) throw new BadRequestException('Choose the milestone this dispute is about.');
    const ms = this.milestonesService.findById(dto.milestoneId);
    if (ms.taskId !== task.id) throw new BadRequestException('That milestone does not belong to this project.');
    if (SETTLED.includes(ms.status)) {
      throw new BadRequestException('This milestone has already been settled and can no longer be disputed.');
    }
    // There is only something to dispute once the worker has handed work in.
    if (!['submitted', 'review'].includes(ms.status)) {
      throw new BadRequestException('A dispute can only be raised on a milestone the worker has submitted.');
    }
    const open = this.disputesRepository
      .findAll()
      .find((d: any) => d.milestoneId === dto.milestoneId && d.status === 'open');
    if (open) throw new BadRequestException('There is already an open dispute on this milestone.');

    // Check the reviewer before recording anything, so a dispute is never
    // stored with a reviewer who could not take the case.
    if (!dto.expertId) throw new BadRequestException('Choose the Expert Reviewer who will arbitrate this dispute.');
    if (!dto.reviewerFee || dto.reviewerFee < 1) {
      throw new BadRequestException('Enter the fee you will pay the reviewer (at least ₹1).');
    }
    this.auditRequests.assertAssignableExpert(dto.expertId, task.category);

    const nameOf = (id: string) => this.safe(() => this.users.findById(id))?.name || '';
    const dispute: any = {
      taskId: task.id,
      milestoneId: ms.id,
      reason: dto.reason,
      details: dto.details || '',
      outcome: dto.outcome || '',
      project: task.title,
      milestone: ms.title,
      // What is actually at stake is the milestone's escrow, not a typed string.
      amount: `₹${ms.budget}`,
      raisedBy: actor.id,
      raisedByName: nameOf(actor.id),
      againstId,
      againstName: nameOf(againstId),
      // The client raises the dispute and pays the reviewer to arbitrate it.
      payerId: task.clientId,
      reviewerFee: dto.reviewerFee,
      id: this.disputesRepository.generateId(),
      status: 'open',
      expertId: dto.expertId,
      verdict: null,
      resolution: null,
      createdAt: new Date().toISOString().slice(0, 10),
      resolvedAt: null,
      milestoneStatusBefore: ms.status,
      raisedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + DISPUTE_STEP_DAYS * DAY_MS).toISOString(),
    };

    // Open the engagement first: if it cannot be opened, no dispute is stored
    // and the milestone is untouched.
    const auditRequest = this.auditRequests.create({
      kind: 'dispute-audit',
      taskId: task.id,
      milestoneId: ms.id,
      clientId: task.clientId,
      workerId: task.workerId,
      payerId: task.clientId,
      disputeId: dispute.id,
      expertId: dto.expertId,
      category: task.category,
      severity: 'High',
      project: task.title,
      milestone: ms.title,
      status: 'preview-sent',
      openingOffer: dto.reviewerFee,
    });
    dispute.auditRequestId = auditRequest.id;
    this.disputesRepository.insert(dispute);
    // The auto-approval clock stops while a reviewer looks at the work.
    this.milestonesService.systemUpdate(ms.id, { status: 'disputed', reviewDueAt: null });

    this.notifications.notify(againstId, {
      type: 'dispute',
      text: `${dispute.raisedByName || 'The client'} raised a dispute`,
      subtext: `${task.title} — ${ms.title}: ${dto.reason}`,
      link: `/worker-milestone-board?id=${task.id}`,
    });
    this.notifications.notify(dto.expertId, {
      type: 'dispute',
      text: 'You have been asked to arbitrate a dispute',
      subtext: `${task.title} — review the claim and send your quote`,
      link: `/expert-audit-preview?id=${auditRequest.id}`,
    });

    return dispute;
  }

  /** The dispute's reviewer changed — a decline cleared it, or the payer chose someone else. */
  setReviewer(disputeId: string, expertId: string | null, auditRequestId: string) {
    const d = this.disputesRepository.findById(disputeId);
    if (!d || d.status !== 'open') return d;
    const patch: any = { expertId, auditRequestId };
    // A new reviewer gets a fresh week to accept.
    if (expertId) patch.expiresAt = new Date(Date.now() + DISPUTE_STEP_DAYS * DAY_MS).toISOString();
    return this.disputesRepository.update(disputeId, patch);
  }

  /** The reviewer accepted: they now have a week to give a verdict. */
  reviewerAccepted(disputeId: string) {
    const d = this.disputesRepository.findById(disputeId);
    if (!d || d.status !== 'open') return d;
    return this.disputesRepository.update(disputeId, {
      acceptedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + DISPUTE_STEP_DAYS * DAY_MS).toISOString(),
    });
  }

  /**
   * The client withdraws their dispute before a reviewer has taken it on.
   * Any fee they funded comes back, and the milestone returns to their review
   * queue — approve it, ask for changes, or dispute it again.
   */
  withdraw(id: string, actor: Actor) {
    const d = this.findById(id);
    assertAllowed(d.raisedBy === actor.id, 'Only the client who raised this dispute can withdraw it.');
    if (d.status !== 'open') throw new BadRequestException(`This dispute is already ${d.status}.`);
    const engagement = d.auditRequestId ? this.safe(() => this.auditRequests.findById(d.auditRequestId)) : null;
    if (engagement && engagement.status === 'in-progress') {
      throw new BadRequestException(
        'The reviewer has accepted this dispute, so it can no longer be withdrawn. They have until ' +
          `${String(d.expiresAt || '').slice(0, 10) || 'the deadline'} to give a verdict, after which it expires and your fee is returned.`,
      );
    }
    return this.endWithoutVerdict(d, 'withdrawn', 'Dispute withdrawn by the client — reviewer fee returned');
  }

  /**
   * Ends every open dispute whose reviewer missed their step. Runs on a timer;
   * `now` is a parameter so tests can move the clock. Disputes raised before
   * these rules carry no `expiresAt` and are left alone.
   */
  expireDue(now = Date.now()) {
    const ended: string[] = [];
    for (const d of this.disputesRepository.findAll()) {
      if (d.status !== 'open' || !d.expiresAt || new Date(d.expiresAt).getTime() > now) continue;
      try {
        const result = this.endWithoutVerdict(d, 'expired', 'Dispute expired with no verdict — reviewer fee returned');
        ended.push(d.id);
        // The expiry refunds the reviewer fee with no request behind it, so it is recorded here.
        this.audit.record({
          kind: 'money', actorId: null, actorRole: 'system', method: 'AUTO', path: `/api/disputes/${d.id}/expire`,
          outcome: 'ok', detail: { reason: 'dispute-expired', taskId: d.taskId, milestoneId: d.milestoneId, refunds: result.refunds },
        });
      } catch (e) {
        this.log.warn('disputes.expire', `could not expire dispute ${d.id}`, e);
      }
    }
    return ended;
  }

  private endWithoutVerdict(d: any, status: 'withdrawn' | 'expired', reason: string) {
    const refunds = this.auditRequests.closeForDispute(d.id, reason);
    const ms = d.milestoneId ? this.safe(() => this.milestonesService.findById(d.milestoneId)) : null;
    if (ms && ms.status === 'disputed') {
      this.milestonesService.systemUpdate(ms.id, {
        status: d.milestoneStatusBefore === 'review' ? 'review' : 'submitted',
        // The client has a short window to act before the work is paid.
        reviewDueAt: new Date(Date.now() + REVIEW_GRACE_DAYS * DAY_MS).toISOString(),
      });
    }
    const updated = this.disputesRepository.update(d.id, { status, resolvedAt: today(), endedReason: reason });
    const text = status === 'withdrawn' ? 'The client withdrew the dispute' : 'The dispute expired without a verdict';
    for (const userId of [d.raisedBy, d.againstId, d.expertId]) {
      this.notifications.notify(userId, {
        type: 'dispute-resolved',
        text,
        subtext: `${d.project || 'Project'} — ${d.milestone || 'milestone'} is back with the client for review (auto-approves in ${REVIEW_GRACE_DAYS} days).`,
        link: userId === d.againstId ? `/worker-milestone-board?id=${d.taskId}` : userId === d.expertId ? '/expert-dispute-cases' : `/review-deliverable?milestoneId=${d.milestoneId}`,
      });
    }
    return { ...updated, refunds };
  }

  /**
   * The verdict. It moves the milestone's escrow, closes the milestone, and —
   * when given by the assigned reviewer — pays that reviewer the fee they were
   * hired for. Operations staff may override a stuck dispute; the reviewer's
   * held fee then goes back to whoever paid it.
   */
  resolve(id: string, dto: ResolveDisputeDto, actor: Actor) {
    const dispute = this.findById(id);
    if (dispute.status !== 'open') {
      throw new BadRequestException(`This dispute is already ${dispute.status}.`);
    }
    const override = actor.role === ROLES.SUPERUSER;
    if (!override) {
      assertAllowed(
        dispute.expertId && dispute.expertId === actor.id,
        'Only the Expert Reviewer assigned to this dispute can resolve it.',
      );
    }

    // Refuse before any money moves.
    let engagement: any = null;
    if (!override) {
      engagement = dispute.auditRequestId ? this.safe(() => this.auditRequests.findById(dispute.auditRequestId)) : null;
      if (!engagement || engagement.status !== 'in-progress') {
        throw new BadRequestException(
          'Agree your fee, have it funded and accept the engagement before giving a verdict.',
        );
      }
    }

    const ms = dispute.milestoneId ? this.milestonesService.findById(dispute.milestoneId) : null;
    const task = this.tasksService.findById(dispute.taskId);
    if (ms && this.ledger.isMilestoneReleased(ms.id)) {
      throw new BadRequestException('This milestone has already been paid out.');
    }

    // Move the money the verdict implies.
    let settlement: any = null;
    if (ms) {
      if (dto.verdict === 'worker-favour') {
        // The same path as an approval, so the worker's agreed fee rate and
        // the audit reviewer's share are settled exactly as they would be.
        settlement = this.milestonesService.payOut(ms, task, `Dispute resolved in the worker's favour — ${ms.title}`, 'verdict').release;
      } else if (dto.verdict === 'client-favour') {
        // The work is not accepted: the milestone goes back to the worker's
        // To Do list with the reviewer's notes, exactly like a revision
        // request. No money moves — the escrow stays behind the milestone
        // until the reworked submission is approved.
        this.milestonesService.systemUpdate(ms.id, {
          status: 'revision-needed', progress: 0,
          revisionNote: dto.resolution, revisionRequestedAt: new Date().toISOString(),
        });
      }
    }

    // The reviewer is paid for the verdict; an override refunds their held fee.
    const reviewerPayout = override
      ? { refunded: this.auditRequests.closeForDispute(dispute.id, 'Dispute settled by operations — reviewer fee returned') }
      : this.auditRequests.settleDispute(engagement.id);

    const resolved = this.disputesRepository.update(id, {
      status: 'resolved',
      verdict: dto.verdict,
      resolution: dto.resolution,
      resolvedAt: today(),
      resolvedBy: actor.id,
      overriddenBy: override ? actor.id : null,
    });
    if (ms) this.milestonesService.checkTaskCompletion(dispute.taskId);

    const label = VERDICT_TEXT[dto.verdict] || dto.verdict;
    for (const userId of [dispute.raisedBy, dispute.againstId, override ? dispute.expertId : null]) {
      this.notifications.notify(userId, {
        type: 'dispute-resolved',
        text: `Dispute resolved: ${label}`,
        subtext: `${dispute.project || task.title} — ${dispute.milestone || 'milestone'}`,
        link: `/expert-report-dispute?id=${dispute.id}`,
      });
    }

    return { ...resolved, settlement, reviewerPayout };
  }

  resetToSeed() {
    this.disputesRepository.resetToSeed();
  }
}
