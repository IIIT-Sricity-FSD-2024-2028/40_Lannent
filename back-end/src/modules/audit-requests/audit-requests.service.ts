import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { CreateAuditRequestDto } from './dto/create-audit-request.dto';
import { UpdateAuditRequestDto } from './dto/update-audit-request.dto';
import { CreateOfferDto, AcceptAuditDto, DeclineAuditDto } from './dto/audit-offer.dto';
import { AuditRequestsRepository } from './audit-requests.repository';
import { AUDIT_STATUS, AUDIT_KIND, NEGOTIABLE, TERMINAL } from './audit-request.constants';
import { TasksService } from '../tasks/tasks.service';
import { MilestonesService } from '../milestones/milestones.service';
import { UsersService } from '../users/users.service';
import { DisputesService } from '../disputes/disputes.service';
import { LedgerService } from '../ledger/ledger.service';

/**
 * AuditRequestsService — the Expert Reviewer engagement.
 *
 * An audit is hired, priced and paid here: the expert previews the work before
 * committing, both sides exchange offers until they agree, the client funds the
 * agreed fee into escrow, and the expert is paid from it when the report lands.
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
  ) {}

  findAll(query?: { expertId?: string; status?: string; taskId?: string; kind?: string }) {
    return this.auditRequestsRepository.findAll(query);
  }

  findById(id: string) {
    const ar = this.auditRequestsRepository.findById(id);
    if (!ar) throw new NotFoundException(`Audit request with id "${id}" not found`);
    return ar;
  }

  create(dto: CreateAuditRequestDto) {
    const { openingOffer, ...rest } = dto;
    // Spread the payload FIRST, then apply defaults. The reverse order — which
    // this codebase uses widely — lets a key that is present but undefined
    // clobber its own default, producing an engagement with no status at all.
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
      agreedAmount: null as number | null,
      offers: [] as any[],
    };
    this.auditRequestsRepository.insert(ar);

    // A client can open with a price so experts see a number in their queue.
    if (openingOffer) {
      this.addOffer(ar.id, { amount: openingOffer, offeredBy: 'client', note: 'Opening offer' });
    }
    return this.auditRequestsRepository.findById(ar.id);
  }

  update(id: string, dto: UpdateAuditRequestDto) {
    const updated = this.auditRequestsRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Audit request with id "${id}" not found`);
    return updated;
  }

  /**
   * Everything the expert needs to judge the job before accepting it — the
   * project, its milestones, the client, and for a dispute audit the claim
   * itself. Previously an expert accepted with no visibility at all.
   */
  preview(id: string) {
    const ar = this.findById(id);
    const task = this.safe(() => this.tasks.findById(ar.taskId));
    const client = this.safe(() => this.users.findById(ar.clientId));
    const worker = ar.workerId ? this.safe(() => this.users.findById(ar.workerId)) : null;
    const milestones = ar.taskId ? this.safe(() => this.milestones.findAll({ taskId: ar.taskId })) || [] : [];
    const dispute = ar.disputeId ? this.safe(() => this.disputes.findById(ar.disputeId)) : null;
    const focus = ar.milestoneId ? milestones.find((m: any) => m.id === ar.milestoneId) : null;

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
      worker: worker ? { id: worker.id, name: worker.name, rating: worker.rating, skills: worker.skills, avatar: worker.avatar, avatarColor: worker.avatarColor } : null,
      milestones: milestones.map((m: any) => ({
        id: m.id, title: m.title, description: m.description, budget: m.budget,
        status: m.status, deliverable: m.deliverable,
      })),
      focusMilestone: focus || null,
      dispute: dispute
        ? { id: dispute.id, reason: dispute.reason, raisedByName: dispute.raisedByName, againstName: dispute.againstName, amount: dispute.amount, status: dispute.status }
        : null,
      offers: ar.offers || [],
      agreedAmount: ar.agreedAmount,
    };
  }

  /** Records an offer or counter-offer. Either side may open or counter. */
  addOffer(id: string, dto: CreateOfferDto) {
    const ar = this.findById(id);
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
  acceptOffer(id: string, offerId: string, acceptedBy: string) {
    const ar = this.findById(id);
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
    return this.auditRequestsRepository.update(id, ar);
  }

  /** Client moves the agreed fee into escrow. Nothing can start before this. */
  fund(id: string) {
    const ar = this.findById(id);
    if (ar.status !== AUDIT_STATUS.AGREED) {
      throw new BadRequestException(
        `Escrow can only be funded once a fee is agreed (current status: ${ar.status}).`,
      );
    }
    if (!ar.agreedAmount) throw new BadRequestException('No agreed amount to fund.');

    this.ledger.fundAuditEscrow(ar.taskId, ar.clientId, ar.agreedAmount, 'technical audit');
    ar.status = AUDIT_STATUS.ESCROW_FUNDED;
    return this.auditRequestsRepository.update(id, ar);
  }

  /**
   * Expert takes the engagement. For a project audit this is what releases the
   * project from draft — the client's project only goes live once an expert has
   * committed and the fee is in escrow.
   */
  accept(id: string, dto: AcceptAuditDto) {
    const ar = this.findById(id);
    if (ar.status !== AUDIT_STATUS.ESCROW_FUNDED) {
      throw new BadRequestException(
        `An audit can only be accepted once its fee is in escrow (current status: ${ar.status}).`,
      );
    }
    // The payee comes from the request body, so it has to be checked: without
    // this, an audit could name a client — or any user — as the reviewer and
    // pay them the fee.
    const expert = this.safe(() => this.users.findById(dto.expertId));
    if (!expert) throw new BadRequestException(`No user found with id "${dto.expertId}".`);
    if (expert.role !== 'expert') {
      throw new BadRequestException(`${expert.name} is not an Expert Reviewer.`);
    }
    if (expert.status !== 'active') {
      throw new BadRequestException(`${expert.name}'s account is not active.`);
    }

    ar.expertId = dto.expertId;
    ar.status = AUDIT_STATUS.IN_PROGRESS;
    this.auditRequestsRepository.update(id, ar);

    if (ar.kind === AUDIT_KIND.PROJECT) {
      this.safe(() => this.tasks.publishDraft(ar.taskId));
    }
    return this.auditRequestsRepository.findById(id);
  }

  decline(id: string, dto: DeclineAuditDto) {
    const ar = this.findById(id);
    if (TERMINAL.includes(ar.status)) {
      throw new BadRequestException(`This audit is already ${ar.status}.`);
    }
    ar.status = AUDIT_STATUS.DECLINED;
    ar.declineReason = dto.reason || null;
    return this.auditRequestsRepository.update(id, ar);
  }

  /** Called by AuditReportsService once a report is filed. Pays the expert. */
  settle(id: string) {
    const ar = this.findById(id);
    if (ar.status === AUDIT_STATUS.PAID) return { auditRequest: ar, payout: { alreadyPaid: true } };
    if (ar.status !== AUDIT_STATUS.IN_PROGRESS && ar.status !== AUDIT_STATUS.REPORT_SUBMITTED) {
      throw new BadRequestException(
        `A report can only be filed against an audit in progress (current status: ${ar.status}).`,
      );
    }

    const payout = this.ledger.releaseAuditFee({
      auditRequestId: ar.id,
      taskId: ar.taskId,
      expertId: ar.expertId,
      amount: ar.agreedAmount,
    });

    ar.status = AUDIT_STATUS.PAID;
    this.auditRequestsRepository.update(id, ar);

    // Credit the expert's review count — this was never incremented before.
    this.safe(() => {
      const expert = this.users.findById(ar.expertId);
      this.users.update(ar.expertId, { reviewsDone: (expert?.reviewsDone || 0) + 1 });
    });

    return { auditRequest: this.auditRequestsRepository.findById(id), payout };
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
