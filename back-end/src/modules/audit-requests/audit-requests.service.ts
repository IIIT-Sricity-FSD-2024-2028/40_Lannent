import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { CreateAuditRequestDto } from './dto/create-audit-request.dto';
import { UpdateAuditRequestDto } from './dto/update-audit-request.dto';
import { CreateOfferDto, AcceptAuditDto, DeclineAuditDto, ReassignAuditDto } from './dto/audit-offer.dto';
import { AuditRequestsRepository } from './audit-requests.repository';
import { AUDIT_STATUS, AUDIT_KIND, NEGOTIABLE, TERMINAL } from './audit-request.constants';
import { canViewTask, assertCanViewTask, canViewAnyRecord, assertAllowed } from '../../common/guards/viewer.util';
import { TasksService } from '../tasks/tasks.service';
import { MilestonesService } from '../milestones/milestones.service';
import { UsersService } from '../users/users.service';
import { DisputesService } from '../disputes/disputes.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Actor } from '../../common/decorators/actor.decorator';
import { round2 } from '../ledger/fee-config';

/** Which side of an engagement someone is on. The client always pays; the reviewer quotes. */
type Side = 'client' | 'expert';

/**
 * AuditRequestsService — the Expert Reviewer engagement.
 *
 * An audit is hired, priced and paid here: the expert previews the work before
 * committing, both sides exchange offers until they agree, the payer funds the
 * agreed fee into escrow, and the expert is paid from it when the work is done
 * — every milestone reported on for a technical audit, the verdict given for a
 * dispute.
 *
 * Technical-audit fees and dispute fees are held in separate escrow buckets,
 * so neither is ever reported as the other.
 */
@Injectable()
export class AuditRequestsService {
  constructor(
    private readonly auditRequestsRepository: AuditRequestsRepository,
    @Inject(forwardRef(() => TasksService)) private tasks: TasksService,
    @Inject(forwardRef(() => MilestonesService)) private milestones: MilestonesService,
    @Inject(forwardRef(() => UsersService)) private users: UsersService,
    @Inject(forwardRef(() => DisputesService)) private disputes: DisputesService,
    @Inject(forwardRef(() => LedgerService)) private ledger: LedgerService,
    @Inject(forwardRef(() => NotificationsService)) private notifications: NotificationsService,
  ) {}

  // ── Reads ─────────────────────────────────────────────────────────────────

  findAll(query?: { expertId?: string; status?: string; taskId?: string; kind?: string },
          viewer?: { id?: string; role?: string }) {
    const all = this.auditRequestsRepository.findAll(query);
    const visible = !viewer || canViewAnyRecord(viewer.role)
      ? all
      // An engagement is only visible to its assigned reviewer and the parties
      // to the work. Previously every reviewer saw every project's audit.
      : all.filter((ar: any) =>
          canViewTask(viewer.id, viewer.role, this.taskOf(ar), ar.expertId, ar.clientId, ar.workerId, ar.payerId),
        );
    return visible.map((ar: any) => this.withProgress(ar));
  }

  findById(id: string, viewer?: { id?: string; role?: string }) {
    const ar = this.auditRequestsRepository.findById(id);
    if (!ar) throw new NotFoundException(`Audit request with id "${id}" not found`);
    if (viewer) {
      assertCanViewTask(viewer.id, viewer.role, this.taskOf(ar), ar.expertId, ar.clientId, ar.workerId, ar.payerId);
    }
    return this.withProgress(ar);
  }

  /** The stored row, for mutation. */
  private raw(id: string) {
    const ar = this.auditRequestsRepository.findById(id);
    if (!ar) throw new NotFoundException(`Audit request with id "${id}" not found`);
    return ar;
  }

  /** Best-effort task lookup for scoping; a missing task must not throw here. */
  private taskOf(ar: any) {
    return ar?.taskId ? this.safe(() => this.tasks.findById(ar.taskId)) : null;
  }

  /** How many engagements this reviewer has completed and been paid for. */
  paidReviewCount(expertId: string): number {
    return this.auditRequestsRepository
      .findAll({ expertId })
      .filter((a: any) => a.status === AUDIT_STATUS.PAID && a.feePaid !== false && (a.paidAmount === undefined || a.paidAmount > 0))
      .length;
  }

  /** Who pays this engagement's fee. */
  payerOf(ar: any): string {
    // Only clients pay reviewers — for a technical audit and for a dispute
    // they raise. Workers cannot raise disputes, so never pay a reviewer.
    return ar.clientId;
  }

  private bucketOf(ar: any): 'audit' | 'dispute' {
    return ar.kind === AUDIT_KIND.DISPUTE ? 'dispute' : 'audit';
  }

  private label(ar: any) {
    return ar.kind === AUDIT_KIND.DISPUTE ? 'dispute review' : 'technical audit';
  }

  // ── Creation ──────────────────────────────────────────────────────────────

  create(dto: CreateAuditRequestDto & { payerId?: string }) {
    const { openingOffer, ...rest } = dto;
    // Spread the payload FIRST, then apply defaults. The reverse order lets a
    // key that is present but undefined clobber its own default.
    const ar = {
      ...rest,
      id: this.auditRequestsRepository.generateId(),
      kind: dto.kind || AUDIT_KIND.PROJECT,
      status: dto.status || AUDIT_STATUS.PREVIEW_SENT,
      severity: dto.severity || 'Medium',
      createdAt: new Date().toISOString().slice(0, 10),
      expertId: dto.expertId || null,
      disputeId: dto.disputeId || null,
      milestoneId: dto.milestoneId || null,
      workerId: dto.workerId || null,
      payerId: dto.clientId,
      agreedAmount: null as number | null,
      offers: [] as any[],
      // Which milestones this engagement has already reported on. An audit is
      // per-milestone even though the engagement is per-project, so this is
      // what stops a milestone being audited twice and what decides when the
      // whole engagement is finished.
      auditedMilestoneIds: [] as string[],
    };
    if (ar.expertId) this.assertAssignableExpert(ar.expertId, dto.category);
    this.auditRequestsRepository.insert(ar);

    // The payer opens with a price so the reviewer sees a number in their queue.
    if (openingOffer) {
      this.recordOffer(ar, { amount: openingOffer, offeredBy: this.payerSide(ar), note: 'Opening offer' });
    }
    return this.auditRequestsRepository.findById(ar.id);
  }

  /**
   * A client opens a technical audit on their own project. Ownership, the
   * worker and the kind come from the task, not the body: a dispute audit is
   * only ever opened by a dispute.
   */
  createForClient(dto: CreateAuditRequestDto, actor: Actor) {
    const task = this.tasks.findById(dto.taskId);
    assertAllowed(
      task.clientId === actor.id,
      'You can only request an audit of your own project.',
    );
    // An audit reviews work still to come. On a finished or cancelled project
    // nothing could ever be reported, and the fee would sit in escrow forever.
    if (!['open', 'in-progress'].includes(task.status)) {
      throw new BadRequestException(`This project is ${task.status}, so there is nothing left to audit.`);
    }
    if (dto.milestoneId) {
      const ms = this.safe(() => this.milestones.findById(dto.milestoneId!));
      if (!ms || ms.taskId !== task.id) throw new BadRequestException('That milestone does not belong to this project.');
    }
    if (!dto.expertId) throw new BadRequestException('Choose the Expert Reviewer you want to audit this project.');
    if (!dto.openingOffer || dto.openingOffer < 1) throw new BadRequestException('Enter an opening offer of at least ₹1.');
    if (this.activeProjectAudit(task.id) || this.liveEngagements(task.id, AUDIT_KIND.PROJECT).length) {
      throw new BadRequestException('This project already has an audit engagement in progress.');
    }
    const created = this.create({
      taskId: task.id,
      clientId: task.clientId,
      workerId: task.workerId || undefined,
      expertId: dto.expertId,
      milestoneId: dto.milestoneId,
      severity: dto.severity,
      dueDate: dto.dueDate,
      openingOffer: dto.openingOffer,
      project: task.title,
      category: task.category,
      kind: AUDIT_KIND.PROJECT,
    });
    this.notifyExpertOfRequest(created, task);
    return created;
  }

  /**
   * After a reviewer declines, the payer chooses someone else. A fresh
   * engagement replaces the declined one, carrying the same project, dispute
   * and payer; the old one stays in the history, marked as replaced.
   */
  reassign(id: string, dto: ReassignAuditDto, actor: Actor) {
    const old = this.raw(id);
    assertAllowed(actor.id === this.payerOf(old), 'Only the person paying for this review can choose another reviewer.');
    if (old.status !== AUDIT_STATUS.DECLINED) {
      throw new BadRequestException('You can only choose another reviewer after the current one has declined.');
    }
    if (old.replacedBy) throw new BadRequestException('Another reviewer has already been chosen for this.');
    if (dto.expertId === old.declinedBy) {
      throw new BadRequestException('That reviewer has already declined. Choose someone else.');
    }

    const task = this.tasks.findById(old.taskId);
    if (old.kind === AUDIT_KIND.PROJECT && task.status !== 'draft') {
      throw new BadRequestException('This project is no longer waiting on its technical audit.');
    }
    let dispute: any = null;
    if (old.kind === AUDIT_KIND.DISPUTE) {
      dispute = this.disputes.findById(old.disputeId);
      if (dispute.status !== 'open') throw new BadRequestException('This dispute is no longer open.');
    }

    const created = this.create({
      kind: old.kind,
      taskId: old.taskId,
      clientId: old.clientId,
      workerId: old.workerId || undefined,
      payerId: this.payerOf(old),
      disputeId: old.disputeId || undefined,
      milestoneId: old.milestoneId || undefined,
      expertId: dto.expertId,
      category: task.category,
      severity: old.severity,
      project: old.project,
      milestone: old.milestone,
      worker: old.worker,
      dueDate: old.dueDate,
      openingOffer: dto.openingOffer,
    });
    this.auditRequestsRepository.update(old.id, { replacedBy: created.id });
    if (dispute) this.disputes.setReviewer(dispute.id, dto.expertId, created.id);
    this.notifyExpertOfRequest(created, task);
    return created;
  }

  private notifyExpertOfRequest(ar: any, task: any) {
    this.notifications.notify(ar.expertId, {
      type: ar.kind === AUDIT_KIND.DISPUTE ? 'dispute' : 'audit-request',
      text: ar.kind === AUDIT_KIND.DISPUTE ? 'You have been asked to arbitrate a dispute' : 'You have been asked to audit a project',
      subtext: `${task.title} — review it and send your quote`,
      link: `/expert-audit-preview?id=${ar.id}`,
    });
  }

  /**
   * Descriptive fields only, by a party to the engagement. This accepted
   * `expertId` from any client or expert, which let a reviewer write
   * themselves onto someone else's funded engagement and then accept it.
   */
  update(id: string, dto: UpdateAuditRequestDto, actor: Actor) {
    const ar = this.raw(id);
    this.sideOf(ar, actor);
    const patch: Record<string, any> = {};
    for (const key of ['severity', 'dueDate', 'project', 'worker', 'milestone'] as const) {
      if (dto[key] !== undefined) patch[key] = dto[key];
    }
    return this.withProgress(this.auditRequestsRepository.update(id, patch));
  }

  /** Lifecycle writes the platform makes itself (milestone hand-over). */
  systemUpdate(id: string, partial: Record<string, any>) {
    const updated = this.auditRequestsRepository.update(id, partial);
    if (!updated) throw new NotFoundException(`Audit request with id "${id}" not found`);
    return updated;
  }

  /** The side the payer is on — always the client. */
  private payerSide(_ar: any): Side {
    return 'client';
  }

  /**
   * Which side of the engagement the caller is on. The offer endpoints took
   * `offeredBy` from the request body, so a reviewer could post an offer
   * "from the client" and then accept it themselves.
   */
  private sideOf(ar: any, actor: Actor): Side {
    if (actor.id && actor.id === ar.expertId) return 'expert';
    if (actor.id && actor.id === this.payerOf(ar)) return this.payerSide(ar);
    throw new ForbiddenException('Only the person paying for this review and the assigned reviewer can act on it.');
  }

  /** The other party to notify when one side acts. */
  private counterpartOf(ar: any, side: Side) {
    return side === 'expert' ? this.payerOf(ar) : ar.expertId;
  }

  private linkFor(ar: any, userId: string) {
    if (userId === ar.expertId) return `/expert-audit-preview?id=${ar.id}`;
    return '/audit-offers';
  }

  /**
   * Everything the expert needs to judge the job before accepting it — the
   * project, its milestones, the client, and for a dispute audit the claim
   * itself. Previously an expert accepted with no visibility at all.
   */
  preview(id: string, viewer?: { id?: string; role?: string }) {
    const ar = this.findById(id, viewer);
    const task = this.safe(() => this.tasks.findById(ar.taskId));
    const client = this.safe(() => this.users.findById(ar.clientId));
    const worker = ar.workerId ? this.safe(() => this.users.findById(ar.workerId)) : null;
    const milestones = ar.taskId ? this.safe(() => this.milestones.findAll({ taskId: ar.taskId })) || [] : [];
    const dispute = ar.disputeId ? this.safe(() => this.disputes.findById(ar.disputeId)) : null;
    const focus = ar.milestoneId ? milestones.find((m: any) => m.id === ar.milestoneId) : null;
    const payer = this.safe(() => this.users.findById(this.payerOf(ar)));

    return {
      auditRequest: ar,
      kind: ar.kind,
      project: task
        ? {
            id: task.id, title: task.title, description: task.description,
            category: task.category, budget: task.budget, currency: task.currency,
            deadline: task.deadline, skills: task.skills, status: task.status,
            progress: task.progress,
          }
        : null,
      client: client ? { id: client.id, name: client.name, company: client.company, avatar: client.avatar, avatarColor: client.avatarColor } : null,
      worker: worker ? { id: worker.id, name: worker.name, completedProjects: worker.completedProjects, skills: worker.skills, avatar: worker.avatar, avatarColor: worker.avatarColor } : null,
      payer: payer ? { id: payer.id, name: payer.name, role: payer.role } : null,
      milestones: milestones.map((m: any) => ({
        id: m.id, title: m.title, description: m.description, budget: m.budget,
        status: m.status, deliverable: m.deliverable,
      })),
      focusMilestone: focus || null,
      dispute: dispute
        ? {
            id: dispute.id, reason: dispute.reason, details: dispute.details, outcome: dispute.outcome,
            raisedByName: dispute.raisedByName, againstName: dispute.againstName,
            amount: dispute.amount, status: dispute.status, milestoneId: dispute.milestoneId,
          }
        : null,
      offers: ar.offers || [],
      agreedAmount: ar.agreedAmount,
    };
  }

  // ── Negotiation ───────────────────────────────────────────────────────────

  /** Records an offer or counter-offer. Either side may open or counter. */
  addOffer(id: string, dto: CreateOfferDto, actor: Actor) {
    const ar = this.raw(id);
    const side = this.sideOf(ar, actor);
    const updated = this.recordOffer(ar, { amount: dto.amount, note: dto.note, offeredBy: side });
    const to = this.counterpartOf(ar, side);
    this.notifications.notify(to, {
      type: 'audit-offer',
      text: `New ${this.label(ar)} offer: ₹${dto.amount}`,
      subtext: `${ar.project || 'Project'} — accept it or send a counter-offer`,
      link: this.linkFor(ar, to),
    });
    return this.withProgress(updated);
  }

  private recordOffer(ar: any, dto: { amount: number; offeredBy: string; note?: string }) {
    const id = ar.id;
    this.assertNegotiable(ar);

    // A new offer supersedes any outstanding one.
    (ar.offers || []).forEach((o: any) => {
      if (o.status === 'pending') o.status = 'countered';
    });

    const offer = {
      id: 'of_' + Date.now() + '_' + ((ar.offers?.length || 0) + 1),
      offeredBy: dto.offeredBy,
      amount: dto.amount,
      note: dto.note || '',
      status: 'pending',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    ar.offers = [...(ar.offers || []), offer];
    ar.status = AUDIT_STATUS.NEGOTIATING;
    return this.auditRequestsRepository.update(id, ar);
  }

  /** Accepts an outstanding offer, fixing the fee. The other side must accept. */
  acceptOffer(id: string, offerId: string, actor: Actor) {
    const ar = this.raw(id);
    const acceptedBy = this.sideOf(ar, actor);
    this.assertNegotiable(ar);

    const offer = (ar.offers || []).find((o: any) => o.id === offerId);
    if (!offer) throw new NotFoundException(`Offer "${offerId}" not found on this audit request.`);
    if (offer.status !== 'pending') {
      throw new BadRequestException(`That offer is no longer open (status: ${offer.status}).`);
    }
    if (offer.offeredBy === acceptedBy) {
      throw new BadRequestException('You cannot accept your own offer — wait for the other side.');
    }

    offer.status = 'accepted';
    ar.agreedAmount = offer.amount;
    ar.status = AUDIT_STATUS.AGREED;
    const updated = this.auditRequestsRepository.update(id, ar);

    const payer = this.payerOf(ar);
    this.notifications.notify(acceptedBy === 'expert' ? payer : ar.expertId, {
      type: 'audit-offer',
      text: `Fee agreed at ₹${offer.amount}`,
      subtext: acceptedBy === 'expert'
        ? `${ar.project || 'Project'} — fund the escrow so the reviewer can start`
        : `${ar.project || 'Project'} — waiting for the fee to be funded`,
      link: this.linkFor(ar, acceptedBy === 'expert' ? payer : ar.expertId),
    });
    return this.withProgress(updated);
  }

  /** The payer moves the agreed fee into escrow. Nothing can start before this. */
  fund(id: string, actor: Actor) {
    const ar = this.raw(id);
    assertAllowed(actor.id === this.payerOf(ar), 'Only the person paying for this review can fund it.');
    if (ar.status !== AUDIT_STATUS.AGREED) {
      throw new BadRequestException(
        `Escrow can only be funded once a fee is agreed (current status: ${ar.status}).`,
      );
    }
    if (!ar.agreedAmount) throw new BadRequestException('No agreed amount to fund.');

    this.ledger.fundAuditEscrow(ar.taskId, this.payerOf(ar), ar.agreedAmount, this.label(ar), this.bucketOf(ar));
    ar.status = AUDIT_STATUS.ESCROW_FUNDED;
    // The commission in force when the fee was put up is the one taken from it.
    ar.commissionPercent = this.ledger.expertCommissionSnapshot();
    ar.fundedAt = new Date().toISOString();
    const updated = this.auditRequestsRepository.update(id, ar);
    this.notifications.notify(ar.expertId, {
      type: 'audit-funded',
      text: `₹${ar.agreedAmount} is in escrow for your ${this.label(ar)}`,
      subtext: `${ar.project || 'Project'} — accept the engagement to start`,
      link: `/expert-audit-preview?id=${ar.id}`,
    });
    return this.withProgress(updated);
  }

  /**
   * Expert takes the engagement. For a project audit this is what releases the
   * project from draft — the client's project only goes live once an expert has
   * committed and the fee is in escrow.
   */
  accept(id: string, dto: AcceptAuditDto, actor: Actor) {
    const ar = this.raw(id);
    // The reviewer taking the job is the caller — nobody accepts on their behalf.
    dto = { ...dto, expertId: actor.id };
    if (ar.status !== AUDIT_STATUS.ESCROW_FUNDED) {
      throw new BadRequestException(
        `An engagement can only be accepted once its fee is in escrow (current status: ${ar.status}).`,
      );
    }
    if (!dto.expertId) throw new BadRequestException('Name the Expert Reviewer taking this audit.');
    this.assertAssignableExpert(dto.expertId);
    if (ar.expertId && ar.expertId !== dto.expertId) {
      throw new BadRequestException('This engagement is assigned to a different Expert Reviewer.');
    }

    ar.expertId = dto.expertId;
    ar.status = AUDIT_STATUS.IN_PROGRESS;
    ar.acceptedAt = new Date().toISOString();
    this.auditRequestsRepository.update(id, ar);
    if (ar.kind === AUDIT_KIND.DISPUTE && ar.disputeId) {
      this.safe(() => this.disputes.reviewerAccepted(ar.disputeId));
    }

    if (ar.kind === AUDIT_KIND.PROJECT) {
      this.safe(() => this.tasks.publishDraft(ar.taskId));
    }
    const expert = this.safe(() => this.users.findById(ar.expertId));
    this.notifications.notify(this.payerOf(ar), {
      type: 'audit-accepted',
      text: `${expert?.name || 'Your reviewer'} accepted the ${this.label(ar)}`,
      subtext: ar.kind === AUDIT_KIND.PROJECT
        ? `${ar.project || 'Project'} is now live — workers can accept it`
        : `${ar.project || 'Project'} — the dispute is under review`,
      link: ar.kind === AUDIT_KIND.PROJECT ? '/client-my-projects' : '/audit-offers',
    });
    return this.withProgress(this.auditRequestsRepository.findById(id));
  }

  decline(id: string, dto: DeclineAuditDto, actor: Actor) {
    const ar = this.raw(id);
    assertAllowed(
      !!ar.expertId && ar.expertId === actor.id,
      'Only the assigned reviewer can decline this engagement.',
    );
    if (TERMINAL.includes(ar.status)) {
      throw new BadRequestException(`This engagement is already ${ar.status}.`);
    }
    if (ar.status === AUDIT_STATUS.IN_PROGRESS
        && ((ar.auditedMilestoneIds || []).length || Object.keys(ar.milestonePayouts || {}).length)) {
      throw new BadRequestException('You have already been paid for part of this project, so it can no longer be declined.');
    }
    // A decline after funding goes home to whoever paid.
    const refund = this.refundHeld(ar, `${this.label(ar)} declined — fee returned`);
    const declinedBy = ar.expertId;
    const updated = this.auditRequestsRepository.update(id, {
      refund,
      status: AUDIT_STATUS.DECLINED,
      declineReason: dto.reason || null,
      // Release the assignment so the payer can pick someone else.
      declinedBy,
      expertId: null,
    });
    if (ar.kind === AUDIT_KIND.DISPUTE && ar.disputeId) {
      this.safe(() => this.disputes.setReviewer(ar.disputeId, null, ar.id));
    }
    const expert = this.safe(() => this.users.findById(declinedBy));
    this.notifications.notify(this.payerOf(ar), {
      type: 'audit-declined',
      text: `${expert?.name || 'The reviewer'} declined the ${this.label(ar)}`,
      subtext: `${refund ? `₹${refund.amount} returned to your wallet. ` : ''}Choose another reviewer under Audit Offers.`,
      link: '/audit-offers',
    });
    return this.withProgress(updated);
  }

  /** Returns this engagement's funded, unpaid fee to its payer. */
  private refundHeld(ar: any, reason: string) {
    const funded = [AUDIT_STATUS.ESCROW_FUNDED, AUDIT_STATUS.IN_PROGRESS].includes(ar.status as any);
    if (!funded || ar.feePaid || !(ar.agreedAmount > 0)) return null;
    const bucket = this.bucketOf(ar);
    const held = this.ledger.getEscrow(ar.taskId)[bucket === 'dispute' ? 'disputeHeld' : 'auditHeld'];
    const amount = Math.min(held, ar.agreedAmount);
    if (amount <= 0) return null;
    return this.ledger.refundAuditEscrow({ taskId: ar.taskId, clientId: this.payerOf(ar), amount, reason, bucket });
  }

  /**
   * The payer withdraws a request the reviewer has not taken on yet, and gets
   * back anything they funded. Without this a reviewer who never answered
   * held the client's money indefinitely. A dispute's engagement is withdrawn
   * by withdrawing the dispute itself.
   */
  cancelByPayer(id: string, actor: Actor) {
    const ar = this.raw(id);
    assertAllowed(actor.id === this.payerOf(ar), 'Only the person paying for this review can withdraw it.');
    if (ar.kind === AUDIT_KIND.DISPUTE) {
      return this.disputes.withdraw(ar.disputeId, actor);
    }
    if (ar.status === AUDIT_STATUS.IN_PROGRESS || TERMINAL.includes(ar.status)) {
      throw new BadRequestException(
        ar.status === AUDIT_STATUS.IN_PROGRESS
          ? 'The reviewer has already started, so this audit can no longer be withdrawn.'
          : `This engagement is already ${ar.status}.`,
      );
    }
    const task = this.safe(() => this.tasks.findById(ar.taskId));
    if (task && task.status === 'draft') {
      throw new BadRequestException('This project cannot go live without its audit. Cancel the draft project instead to get everything back.');
    }
    const refund = this.refundHeld(ar, `${this.label(ar)} withdrawn — fee returned`);
    const updated = this.auditRequestsRepository.update(id, { status: AUDIT_STATUS.CANCELLED, refund, cancelledBy: actor.id });
    if (ar.expertId) {
      this.notifications.notify(ar.expertId, {
        type: 'audit-cancelled',
        text: `The ${this.label(ar)} for "${ar.project || 'a project'}" was withdrawn`,
        subtext: 'The client withdrew the request before you accepted it.',
        link: '/expert-audit-requests',
      });
    }
    return this.withProgress(updated);
  }

  /** Every engagement on a project that is not finished, declined or cancelled. */
  private liveEngagements(taskId: string, kind?: string) {
    return this.auditRequestsRepository
      .findAll({ taskId, kind })
      .filter((a: any) => !TERMINAL.includes(a.status));
  }

  /**
   * A project is going away before any audit started. Its open engagements
   * are cancelled; the caller has already returned the escrow.
   */
  cancelOpenForTask(taskId: string) {
    for (const a of this.liveEngagements(taskId)) {
      this.auditRequestsRepository.update(a.id, { status: AUDIT_STATUS.CANCELLED });
      if (a.expertId) {
        this.notifications.notify(a.expertId, {
          type: 'audit-cancelled',
          text: `The ${this.label(a)} for "${a.project || 'a project'}" was cancelled`,
          subtext: 'The client withdrew the project.',
          link: '/expert-audit-requests',
        });
      }
    }
  }

  // ── Settlement ────────────────────────────────────────────────────────────
  //
  // A technical audit is paid milestone by milestone. Each milestone carries a
  // share of the agreed fee in proportion to its budget (the last one takes
  // whatever paise are left), and the share is settled once:
  //
  //   - the reviewer files that milestone's report            → paid
  //   - the client approves it within 5 days of submission,
  //     report or not                                         → paid
  //   - the client approves it later, with no report filed     → forfeited:
  //                                         the share goes back to the client
  //
  // Settled shares are recorded on the engagement in `milestonePayouts`.

  /** Days the reviewer has after a submission before an approval without their report costs them that milestone. */
  static readonly REPORT_WINDOW_DAYS = 5;

  private payoutsOf(ar: any): Record<string, any> {
    return ar.milestonePayouts || {};
  }

  private recordedTotal(ar: any) {
    return round2(Object.values(this.payoutsOf(ar)).reduce((a: number, p: any) => a + (Number(p.amount) || 0), 0));
  }

  /** This milestone's share of the agreed fee. */
  private shareFor(ar: any, milestoneId: string) {
    const agreed = Number(ar.agreedAmount) || 0;
    const remaining = round2(Math.max(0, agreed - this.recordedTotal(ar)));
    if (remaining <= 0) return 0;
    const milestones = this.milestones.findAll({ taskId: ar.taskId });
    const payouts = this.payoutsOf(ar);
    const others = milestones.filter((m: any) => m.id !== milestoneId && !payouts[m.id]);
    if (!others.length) return remaining;
    const total = milestones.reduce((a: number, m: any) => a + (Number(m.budget) || 0), 0);
    const ms = milestones.find((m: any) => m.id === milestoneId);
    if (!ms || total <= 0) return 0;
    return Math.min(remaining, round2(agreed * (Number(ms.budget) || 0) / total));
  }

  /** Pays or returns one milestone's share, once. */
  private settleShare(ar: any, ms: any, outcome: 'paid' | 'forfeited', why: string) {
    if (this.payoutsOf(ar)[ms.id]) return this.payoutsOf(ar)[ms.id];
    const amount = this.shareFor(ar, ms.id);
    let payout: any = null;
    let refund: any = null;
    if (amount > 0 && outcome === 'paid') {
      payout = this.ledger.releaseAuditFee({
        auditRequestId: ar.id, taskId: ar.taskId, expertId: ar.expertId, amount, bucket: 'audit',
        payoutKey: `${ar.id}:${ms.id}`,
        commissionPercent: ar.commissionPercent,
        description: `Audit fee for "${ms.title}" (₹${amount} less commission)`,
      });
    } else if (amount > 0) {
      const held = this.ledger.getEscrow(ar.taskId).auditHeld;
      const back = Math.min(held, amount);
      if (back > 0) {
        refund = this.ledger.refundAuditEscrow({
          taskId: ar.taskId, clientId: this.payerOf(ar), amount: back, bucket: 'audit',
          reason: `"${ms.title}" was approved without an audit report — that part of the audit fee is returned`,
        });
      }
    }
    const entry = { status: outcome, amount, net: payout?.net ?? 0, why, at: new Date().toISOString() };
    const payouts: Record<string, any> = { ...this.payoutsOf(ar), [ms.id]: entry };
    const paidAmount = round2(Object.values(payouts).filter((p: any) => p.status === 'paid').reduce((a: number, p: any) => a + (Number(p.amount) || 0), 0));
    const milestones = this.milestones.findAll({ taskId: ar.taskId });
    const allSettled = milestones.length > 0 && milestones.every((m: any) => payouts[m.id]);
    this.auditRequestsRepository.update(ar.id, {
      milestonePayouts: payouts,
      paidAmount,
      feePaid: paidAmount > 0,
      paidAt: paidAmount > 0 ? (ar.paidAt || new Date().toISOString().slice(0, 10)) : ar.paidAt,
      ...(allSettled ? { status: AUDIT_STATUS.PAID } : {}),
    });

    if (payout) {
      this.notifications.notify(ar.expertId, {
        type: 'payment',
        text: `₹${payout.net ?? 0} paid for your audit of "${ms.title}"`,
        subtext: `${ar.project || 'Project'} — ${why}`,
        link: '/expert-wallet',
      });
    } else if (outcome === 'forfeited' && amount > 0) {
      this.notifications.notify(ar.expertId, {
        type: 'audit-forfeited',
        text: `"${ms.title}" was approved without your report`,
        subtext: `No report was filed within ${AuditRequestsService.REPORT_WINDOW_DAYS} days of submission, so its ₹${amount} share went back to the client.`,
        link: '/expert-audit-requests',
      });
      this.notifications.notify(this.payerOf(ar), {
        type: 'payment',
        text: `₹${refund?.amount ?? amount} of the audit fee returned`,
        subtext: `"${ms.title}" was approved without an audit report.`,
        link: '/client-wallet',
      });
    }
    return entry;
  }

  /**
   * A milestone was accepted (approved, auto-approved or won by the worker in
   * a dispute). Settles the reviewer's share for it if their report has not
   * already done so.
   */
  settleMilestoneOnApproval(ms: any) {
    const ar = this.auditRequestsRepository
      .findAll({ taskId: ms.taskId, kind: AUDIT_KIND.PROJECT })
      .find((a: any) => a.expertId && a.status === AUDIT_STATUS.IN_PROGRESS);
    if (!ar || this.payoutsOf(ar)[ms.id]) return null;
    if (this.isMilestoneAudited(ar, ms.id)) {
      return this.settleShare(ar, ms, 'paid', 'report filed');
    }
    const submitted = ms.submittedAt ? new Date(ms.submittedAt).getTime() : NaN;
    const windowMs = AuditRequestsService.REPORT_WINDOW_DAYS * 86_400_000;
    const late = !Number.isFinite(submitted) || Date.now() - submitted >= windowMs;
    return late
      ? this.settleShare(ar, ms, 'forfeited', `approved with no report after ${AuditRequestsService.REPORT_WINDOW_DAYS} days`)
      : this.settleShare(ar, ms, 'paid', 'approved by the client before the report was due');
  }

  /**
   * Refuses a report that cannot be filed — checked BEFORE the report is
   * written. It used to be checked after, so a refused report (on a closed
   * audit, say) still overwrote the stored one and the caller just saw a 400.
   */
  assertCanFile(id: string, milestoneId?: string) {
    const ar = this.raw(id);
    if (ar.kind !== AUDIT_KIND.PROJECT) {
      throw new BadRequestException('A dispute is settled by its verdict, not by an audit report.');
    }
    if (!milestoneId) throw new BadRequestException('Name the milestone this report covers.');
    if (ar.closedEarly) {
      throw new BadRequestException('This project has ended and its audit was closed, so no more reports can be filed.');
    }
    const fileable = [AUDIT_STATUS.IN_PROGRESS, AUDIT_STATUS.REPORT_SUBMITTED, AUDIT_STATUS.PAID];
    if (!fileable.includes(ar.status as any)) {
      throw new BadRequestException(
        `A report can only be filed against an audit in progress (current status: ${ar.status}).`,
      );
    }
    const record = this.payoutsOf(ar)[milestoneId];
    if (record?.status === 'forfeited') {
      throw new BadRequestException(
        `This milestone was approved without a report after the ${AuditRequestsService.REPORT_WINDOW_DAYS}-day window, so it is closed.`,
      );
    }
    const ms = this.safe(() => this.milestones.findById(milestoneId));
    if (ms && ['completed', 'approved', 'cancelled'].includes(ms.status) && this.isMilestoneAudited(ar, milestoneId)) {
      throw new BadRequestException('This milestone is settled and its report is final.');
    }
    return ar;
  }

  /**
   * Called by AuditReportsService once a technical-audit report is filed:
   * records coverage and pays this milestone's share.
   */
  settle(id: string, milestoneId?: string) {
    this.assertCanFile(id, milestoneId);
    this.recordMilestoneAudited(id, milestoneId);
    const ar = this.raw(id);
    const ms = this.milestones.findById(milestoneId!);
    const entry = this.settleShare(ar, ms, 'paid', 'report filed');
    const progress = this.auditProgress(this.raw(id));
    return {
      auditRequest: this.withProgress(this.raw(id)),
      payout: { milestoneId, ...entry, audited: progress?.audited, total: progress?.total },
    };
  }

  /**
   * The project has ended — completed, or the contract ended for
   * non-delivery. Its technical audit is closed: anything not yet started is
   * cancelled and refunded; for an audit under way every milestone without a
   * settled share is forfeited (there is nothing left to report on), and
   * whatever is still held for the engagement goes back to the client.
   */
  closeProjectAudit(taskId: string, why = 'Project ended') {
    const results: any[] = [];
    for (const a of this.liveEngagements(taskId, AUDIT_KIND.PROJECT)) {
      if (a.status !== AUDIT_STATUS.IN_PROGRESS) {
        const refund = this.refundHeld(a, `${why} before the audit started — fee returned`);
        this.auditRequestsRepository.update(a.id, { status: AUDIT_STATUS.CANCELLED, refund });
        results.push({ id: a.id, refund });
        continue;
      }
      for (const ms of this.milestones.findAll({ taskId })) {
        if (!this.payoutsOf(this.raw(a.id))[ms.id]) {
          this.settleShare(this.raw(a.id), ms, 'forfeited', `${why} before this milestone was audited`);
        }
      }
      const fresh = this.raw(a.id);
      const leftover = round2(Math.max(0, (Number(fresh.agreedAmount) || 0) - this.recordedTotal(fresh)));
      const held = this.ledger.getEscrow(taskId).auditHeld;
      const back = Math.min(held, leftover);
      const refund = back > 0
        ? this.ledger.refundAuditEscrow({ taskId, clientId: this.payerOf(fresh), amount: back, bucket: 'audit', reason: `${why} — unused audit fee returned` })
        : null;
      this.auditRequestsRepository.update(a.id, {
        status: AUDIT_STATUS.PAID, closedEarly: true, closedAt: new Date().toISOString().slice(0, 10), closeRefund: refund,
      });
      results.push({ id: a.id, paidAmount: fresh.paidAmount || 0, refund });
    }
    return results;
  }

  /**
   * Called by DisputesService when the assigned reviewer gives their verdict:
   * the dispute is what they were hired for, so the verdict is what pays them.
   */
  settleDispute(id: string) {
    const ar = this.raw(id);
    if (ar.kind !== AUDIT_KIND.DISPUTE) throw new BadRequestException('Not a dispute engagement.');
    if (ar.status !== AUDIT_STATUS.IN_PROGRESS) {
      throw new BadRequestException(
        'The reviewer fee for this dispute has not been agreed, funded and accepted yet, so it cannot be resolved.',
      );
    }
    return this.payExpert(ar);
  }

  /**
   * The dispute was settled by operations instead of its reviewer. Any fee
   * held for the reviewer goes back to whoever paid it.
   */
  closeForDispute(disputeId: string, reason: string) {
    const refunds: any[] = [];
    for (const a of this.auditRequestsRepository.findAll({ kind: AUDIT_KIND.DISPUTE })) {
      if (a.disputeId !== disputeId || TERMINAL.includes(a.status)) continue;
      const refund = this.refundHeld(a, reason);
      if (refund) refunds.push(refund);
      this.auditRequestsRepository.update(a.id, { status: AUDIT_STATUS.CANCELLED, refund });
      if (a.expertId) {
        this.notifications.notify(a.expertId, {
          type: 'audit-cancelled',
          text: `The dispute on "${a.project || 'a project'}" was settled by operations`,
          subtext: 'Your engagement has been closed.',
          link: '/expert-dispute-cases',
        });
      }
    }
    return refunds;
  }

  private payExpert(ar: any) {
    const firstPayout = !ar.feePaid;
    const payout = this.ledger.releaseAuditFee({
      auditRequestId: ar.id,
      taskId: ar.taskId,
      expertId: ar.expertId,
      amount: ar.agreedAmount,
      bucket: this.bucketOf(ar),
      commissionPercent: ar.commissionPercent,
    });
    this.auditRequestsRepository.update(ar.id, {
      feePaid: true,
      paidAt: ar.paidAt || new Date().toISOString().slice(0, 10),
      status: AUDIT_STATUS.PAID,
    });

    // The expert's "reviews done" count is derived from paid engagements.
    if (firstPayout) {
      if (!payout.alreadyPaid) {
        this.notifications.notify(ar.expertId, {
          type: 'payment',
          text: `₹${payout.net} paid to your wallet`,
          subtext: `${ar.project || 'Project'} — ${this.label(ar)} fee less the platform commission`,
          link: '/expert-wallet',
        });
      }
    }
    return payout;
  }

  // ── Per-milestone audit progress ──────────────────────────────────────────

  /**
   * How far through the project this engagement is. Completion is a fact
   * about coverage: every milestone on the task has a report.
   */
  auditProgress(ar: any) {
    if (!ar || ar.kind !== AUDIT_KIND.PROJECT) return null;
    const milestones = ar.taskId
      ? this.safe(() => this.milestones.findAll({ taskId: ar.taskId })) || []
      : [];
    const audited: string[] = ar.auditedMilestoneIds || [];
    const payouts = ar.milestonePayouts || {};

    const auditedIds = milestones.filter((m: any) => audited.includes(m.id)).map((m: any) => m.id);
    // Settled — reported on, or its share already paid or returned.
    const pending = milestones.filter((m: any) => !audited.includes(m.id) && !payouts[m.id]);
    // Submitted and waiting on the reviewer, versus not yet handed over at all.
    const awaitingReview = pending.filter((m: any) =>
      ['submitted', 'review', 'disputed'].includes(m.status) || !!m.deliverable,
    );

    return {
      total: milestones.length,
      audited: auditedIds.length,
      auditedMilestoneIds: auditedIds,
      awaitingReview: awaitingReview.length,
      awaitingReviewMilestoneIds: awaitingReview.map((m: any) => m.id),
      pendingMilestoneIds: pending.map((m: any) => m.id),
      payouts,
      paidAmount: Number(ar.paidAmount) || 0,
      // No milestones means nothing left to audit, rather than never finished —
      // otherwise the fee could never be released.
      complete: pending.length === 0,
    };
  }

  /** Read shape: the stored row plus its computed coverage. */
  private withProgress(ar: any) {
    if (!ar) return ar;
    const progress = this.auditProgress(ar);
    return progress ? { ...ar, auditProgress: progress } : ar;
  }

  /** True once a report has been filed for this milestone under this engagement. */
  isMilestoneAudited(ar: any, milestoneId?: string): boolean {
    if (!ar || !milestoneId) return false;
    return (ar.auditedMilestoneIds || []).includes(milestoneId);
  }

  /** Records that a milestone has been reported on. Idempotent. */
  recordMilestoneAudited(id: string, milestoneId?: string) {
    if (!milestoneId) return null;
    const ar = this.auditRequestsRepository.findById(id);
    if (!ar) return null;
    const audited: string[] = ar.auditedMilestoneIds || [];
    if (!audited.includes(milestoneId)) {
      this.auditRequestsRepository.update(id, { auditedMilestoneIds: [...audited, milestoneId] });
    }
    return this.auditRequestsRepository.findById(id);
  }

  /**
   * The live project audit for a task, if there is one. An engagement stays
   * live after it has been paid while milestones remain unaudited.
   */
  activeProjectAudit(taskId: string) {
    const candidates = this.auditRequestsRepository
      .findAll({ taskId, kind: AUDIT_KIND.PROJECT })
      .filter((a: any) => ![AUDIT_STATUS.DECLINED, AUDIT_STATUS.CANCELLED].includes(a.status));
    // An engagement an expert has actually taken on comes first.
    return (
      candidates.find((a: any) => a.expertId && a.status === AUDIT_STATUS.IN_PROGRESS) ||
      candidates.find((a: any) => a.expertId && !this.auditProgress(a)?.complete) ||
      candidates.find((a: any) => a.expertId) ||
      null
    );
  }

  /**
   * A reviewer must exist, be an expert, and be active. When a category is
   * given, their domains must cover it — the client only ever sees
   * domain-matched reviewers, so a mismatch means a tampered request.
   */
  assertAssignableExpert(expertId: string, category?: string) {
    const expert = this.safe(() => this.users.findById(expertId));
    if (!expert) throw new BadRequestException(`No user found with id "${expertId}".`);
    if (expert.role !== 'expert') throw new BadRequestException(`${expert.name} is not an Expert Reviewer.`);
    if (expert.status !== 'active') throw new BadRequestException(`${expert.name}'s account is not active.`);
    // A reviewer with no domains covers nothing — not everything.
    if (category && !(Array.isArray(expert.domains) && expert.domains.includes(category))) {
      throw new BadRequestException(`${expert.name} does not review ${category} work.`);
    }
    // A category is only given when someone is being asked to take on a new
    // case; a reviewer who has marked themselves unavailable is not offered.
    if (category && expert.availability && typeof expert.availability === 'object'
        && expert.availability.status === 'Unavailable') {
      throw new BadRequestException(`${expert.name} is not taking new cases right now. Choose another reviewer.`);
    }
    return expert;
  }

  private assertNegotiable(ar: any) {
    if (!NEGOTIABLE.includes(ar.status)) {
      throw new BadRequestException(
        `Offers can only be exchanged while negotiating (current status: ${ar.status}).`,
      );
    }
  }

  /** Cross-module reads are best-effort — a missing task must not break a preview. */
  private safe<T>(fn: () => T): T | null {
    try { return fn(); } catch { return null; }
  }

  resetToSeed() {
    this.auditRequestsRepository.resetToSeed();
  }
}
