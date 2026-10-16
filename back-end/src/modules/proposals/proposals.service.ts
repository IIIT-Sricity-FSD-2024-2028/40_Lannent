import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { ProposalsRepository } from './proposals.repository';
import { TasksService } from '../tasks/tasks.service';
import { LedgerService } from '../ledger/ledger.service';
import { MilestonesService } from '../milestones/milestones.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Actor } from '../../common/decorators/actor.decorator';
import { assertAllowed, canViewAnyRecord } from '../../common/guards/viewer.util';
import { ROLES } from '../../common/constants/roles';
import { round2 } from '../ledger/fee-config';

/** How many applications one worker may send to one project, withdrawn ones included. */
const MAX_APPLICATIONS_PER_PROJECT = 3;

export const PROPOSAL_TYPE = { APPLICATION: 'application', INVITATION: 'invitation' } as const;

/**
 * ProposalsService — Business Logic Layer
 *
 * There is no bidding: the client's posted budget is the price. Either side
 * can start a contract, and the other side says yes:
 *   - a worker applies to an open project; the client accepts (hires) or
 *     rejects the application;
 *   - a client invites a worker; the worker accepts (and starts straight
 *     away) or declines.
 * Whoever sent a pending one may withdraw it. When someone is hired, every
 * other pending application and invitation on the project closes.
 */
@Injectable()
export class ProposalsService {
  constructor(
    private readonly proposalsRepository: ProposalsRepository,
    @Inject(forwardRef(() => TasksService)) private tasksService: TasksService,
    @Inject(forwardRef(() => LedgerService)) private ledger: LedgerService,
    @Inject(forwardRef(() => MilestonesService)) private milestonesService: MilestonesService,
    @Inject(forwardRef(() => UsersService)) private users: UsersService,
    @Inject(forwardRef(() => NotificationsService)) private notifications: NotificationsService,
  ) {}

  /**
   * Internal callers get every row. A worker sees their own applications and
   * invitations; a client sees the ones on their own projects. Nobody sees
   * another worker's.
   */
  findAll(query?: { taskId?: string; workerId?: string; type?: string }, viewer?: { id?: string; role?: string }) {
    const all = this.proposalsRepository.findAll(query);
    if (!viewer || canViewAnyRecord(viewer.role)) return all;
    const ownerOf: Record<string, string | null> = {};
    return all.filter((p: any) => {
      if (p.workerId === viewer.id) return true;
      if (!(p.taskId in ownerOf)) ownerOf[p.taskId] = this.safeTask(p.taskId)?.clientId ?? null;
      return ownerOf[p.taskId] === viewer.id;
    });
  }

  findById(id: string, viewer?: { id?: string; role?: string }) {
    const prop = this.proposalsRepository.findById(id);
    if (!prop) throw new NotFoundException(`Proposal with id "${id}" not found`);
    if (viewer && !canViewAnyRecord(viewer.role) && prop.workerId !== viewer.id) {
      const task = this.tasksService.findById(prop.taskId);
      if (task.clientId !== viewer.id) throw new NotFoundException(`Proposal with id "${id}" not found`);
    }
    return prop;
  }

  private isInvitation(p: any) {
    return p.type === PROPOSAL_TYPE.INVITATION;
  }

  /** Where each side follows a proposal in the app. */
  private linkFor(p: any, side: 'worker' | 'client') {
    if (side === 'client') return '/worker-applications';
    return this.isInvitation(p) ? '/worker-invitations' : '/my-proposals';
  }

  /** A project closed before anyone was hired: its pending applications and invitations close with it. */
  closeAllForTask(taskId: string) {
    for (const p of this.proposalsRepository.findAll({ taskId })) {
      if (p.status !== 'pending') continue;
      this.proposalsRepository.update(p.id, { status: 'closed', closedReason: 'The project was closed' });
      this.notifications.notify(p.workerId, {
        type: 'proposal',
        text: this.isInvitation(p) ? 'An invitation was withdrawn' : 'A project you applied to was closed',
        subtext: this.titleOf(taskId),
        link: this.linkFor(p, 'worker'),
      });
    }
  }

  /** A worker who can no longer work (suspended, removed): their pending applications and invitations close. */
  closeAllForWorker(workerId: string, why: string) {
    for (const p of this.proposalsRepository.findAll({ workerId })) {
      if (p.status !== 'pending') continue;
      this.proposalsRepository.update(p.id, { status: 'closed', closedReason: why });
      const task = this.safeTask(p.taskId);
      if (task) {
        this.notifications.notify(task.clientId, {
          type: 'proposal',
          text: `${this.isInvitation(p) ? 'Your invitation' : 'An application'} on "${task.title}" was closed`,
          subtext: why,
          link: this.linkFor(p, 'client'),
        });
      }
    }
  }

  private safeTask(taskId: string) {
    try { return this.tasksService.findById(taskId); } catch { return null; }
  }

  private safeUser(id: string) {
    try { return this.users.findById(id); } catch { return null; }
  }

  private titleOf(taskId: string) {
    return this.safeTask(taskId)?.title || 'Project';
  }

  /** The task, refusing anything that is not open. */
  private openTask(taskId: string, what: string) {
    const task = this.tasksService.findById(taskId);
    if (task.status !== 'open') {
      throw new BadRequestException(`This project is not open — cannot ${what}.`);
    }
    return task;
  }

  private activeWorker(id: string) {
    const worker = this.safeUser(id);
    if (!worker || worker.role !== ROLES.WORKER || worker.status !== 'active') {
      throw new BadRequestException(`${worker?.name || 'This account'} is not an active worker.`);
    }
    return worker;
  }

  /**
   * A worker applies to an open project, or a client invites a worker to
   * theirs. Either way the price is the posted budget — nobody names one.
   */
  create(dto: CreateProposalDto, actor: Actor) {
    const task = this.openTask(dto.taskId, actor.role === ROLES.WORKER ? 'apply' : 'send invitations');
    let type: string;
    let workerId: string;
    if (actor.role === ROLES.WORKER) {
      type = PROPOSAL_TYPE.APPLICATION;
      workerId = actor.id;
    } else if (actor.role === ROLES.CLIENT) {
      assertAllowed(task.clientId === actor.id, 'You can only invite workers to your own projects.');
      if (!dto.workerId) throw new BadRequestException('Choose the worker to invite.');
      type = PROPOSAL_TYPE.INVITATION;
      workerId = dto.workerId;
    } else {
      throw new BadRequestException('Only workers apply and only clients invite.');
    }
    const worker = this.activeWorker(workerId);

    const history = this.proposalsRepository.findAll({ taskId: task.id }).filter((p: any) => p.workerId === worker.id);
    const pending = history.find((p: any) => p.status === 'pending');
    if (pending) {
      if (type === PROPOSAL_TYPE.APPLICATION) {
        throw new BadRequestException(this.isInvitation(pending)
          ? 'The client has already invited you to this project — accept it under Invitations.'
          : 'You have already applied to this project.');
      }
      throw new BadRequestException(this.isInvitation(pending)
        ? `${worker.name} already has a pending invitation to this project.`
        : `${worker.name} has already applied to this project — accept their application instead.`);
    }
    // Each one notifies the other side, so a turned-down one is final for
    // that project and resending is capped.
    if (type === PROPOSAL_TYPE.APPLICATION) {
      if (history.some((p: any) => !this.isInvitation(p) && p.status === 'rejected')) {
        throw new BadRequestException('The client turned down your application to this project, so you cannot apply again.');
      }
      if (history.filter((p: any) => !this.isInvitation(p)).length >= MAX_APPLICATIONS_PER_PROJECT) {
        throw new BadRequestException(`You can apply to one project at most ${MAX_APPLICATIONS_PER_PROJECT} times.`);
      }
    } else if (history.some((p: any) => this.isInvitation(p) && p.status === 'declined')) {
      throw new BadRequestException(`${worker.name} declined this project, so they cannot be invited to it again.`);
    }

    const saved = this.proposalsRepository.insert({
      id: this.proposalsRepository.generateId(),
      taskId: task.id,
      workerId: worker.id,
      type,
      status: 'pending',
      message: (dto.message || '').trim(),
      createdAt: new Date().toISOString().slice(0, 10),
      // Identity comes from the record, not the request.
      workerName: worker.name,
      avatar: worker.avatar,
      avatarColor: worker.avatarColor,
      skills: worker.skills || [],
    });
    if (type === PROPOSAL_TYPE.INVITATION) {
      this.notifications.notify(worker.id, {
        type: 'invitation',
        text: 'You have been invited to a project',
        subtext: `${task.title} · ₹${task.budget}`,
        link: '/worker-invitations',
      });
    } else {
      this.notifications.notify(task.clientId, {
        type: 'proposal',
        text: `${worker.name} applied to "${task.title}"`,
        subtext: `At your budget of ₹${task.budget}`,
        link: '/worker-applications',
      });
    }
    return saved;
  }

  /** The one edit: whoever sent a pending application or invitation withdraws it. */
  update(id: string, dto: UpdateProposalDto, actor: Actor) {
    const prop = this.findById(id);
    const task = this.tasksService.findById(prop.taskId);
    const sender = this.isInvitation(prop) ? task.clientId : prop.workerId;
    assertAllowed(sender === actor.id, `Only the ${this.isInvitation(prop) ? 'client who sent this invitation' : 'worker who applied'} can withdraw it.`);
    if (prop.status !== 'pending') {
      throw new BadRequestException(`This ${prop.type} is already ${prop.status}.`);
    }
    if (dto.status !== 'withdrawn') {
      throw new BadRequestException('A pending application or invitation can only be withdrawn by whoever sent it.');
    }
    const updated = this.proposalsRepository.update(id, { status: 'withdrawn' });
    if (this.isInvitation(prop)) {
      this.notifications.notify(prop.workerId, {
        type: 'invitation', text: 'An invitation was withdrawn', subtext: task.title, link: '/worker-invitations',
      });
    } else {
      this.notifications.notify(task.clientId, {
        type: 'proposal', text: `${prop.workerName || 'A worker'} withdrew their application`, subtext: task.title, link: '/worker-applications',
      });
    }
    return updated;
  }

  /**
   * Hires the worker at the posted budget and starts the contract.
   *
   * The budget has been in escrow since the project was posted; this is when
   * the contract exists, so it is when the marketplace and initiation fees are
   * charged. The milestones must add up to the budget — that is how the
   * worker is paid. Deliberately NOT swallowed: if the client cannot cover
   * the fees, nobody is hired.
   */
  private hire(task: any, prop: any, actor: Actor) {
    const worker = this.activeWorker(prop.workerId);
    const byClient = actor.id === task.clientId;
    const milestones = this.milestonesService.findAll({ taskId: task.id });
    const price = round2(Number(task.budget));
    const planned = this.milestonesService.totalBudget(task.id);
    if (!milestones.length || planned !== price) {
      throw new BadRequestException(byClient
        ? `Your milestones add up to ₹${planned} of the ₹${price} budget. Make them add up to exactly ₹${price} on the milestone board, then accept.`
        : `The client is still setting up the milestone plan (it adds up to ₹${planned} of the ₹${price} budget), so this cannot be accepted yet.`);
    }

    try {
      this.ledger.assertCanStartContract(task.id, task.clientId, price);
    } catch (e) {
      if (!(e instanceof BadRequestException) || byClient) throw e;
      this.notifications.notify(task.clientId, {
        type: 'hire',
        text: `${worker.name} tried to accept your invitation to "${task.title}"`,
        subtext: 'Your wallet cannot cover the contract fees — add funds so the project can start',
        link: '/client-wallet',
      });
      throw new BadRequestException('The client cannot fund this contract right now, so it cannot be accepted yet. They have been told.');
    }
    this.ledger.chargeContractFees(task.id, task.clientId, price, task.title);
    this.tasksService.assignWorker(task.id, worker.id);

    // Milestones are created before anyone is hired, with no worker on them.
    // Every milestone on this task is payable to this task's worker.
    for (const ms of milestones) {
      if (ms.workerId !== worker.id) this.milestonesService.systemUpdate(ms.id, { workerId: worker.id });
    }

    this.proposalsRepository.update(prop.id, { status: 'hired' });
    for (const p of this.proposalsRepository.findAll({ taskId: task.id })) {
      if (p.status !== 'pending') continue;
      this.proposalsRepository.update(p.id, { status: 'closed', closedReason: 'Another worker was hired' });
      this.notifications.notify(p.workerId, {
        type: 'proposal',
        text: this.isInvitation(p) ? 'An invitation is no longer available' : 'Your application was not selected',
        subtext: `${task.title} — another worker was hired`,
        link: this.linkFor(p, 'worker'),
      });
    }
    this.notifications.notify(worker.id, {
      type: 'hire',
      text: byClient ? `You were hired for "${task.title}"` : `You started "${task.title}"`,
      subtext: `₹${price} is in escrow — open the milestone board to start`,
      link: `/worker-milestone-board?id=${task.id}`,
    });
    if (!byClient) {
      this.notifications.notify(task.clientId, {
        type: 'hire',
        text: `${worker.name} accepted your invitation to "${task.title}"`,
        subtext: `The project is in progress at ₹${price}`,
        link: `/project-milestone-board?id=${task.id}`,
      });
    }
    return this.proposalsRepository.findById(prop.id);
  }

  /**
   * Saying yes: the client accepts a worker's application, or the invited
   * worker accepts an invitation. Either way the worker is hired at the
   * posted budget and the project starts.
   */
  accept(id: string, actor: Actor) {
    const prop = this.findById(id);
    const task = this.tasksService.findById(prop.taskId);
    if (this.isInvitation(prop)) {
      assertAllowed(prop.workerId === actor.id, 'Only the invited worker can accept this invitation.');
    } else {
      assertAllowed(task.clientId === actor.id, 'Only the client who owns this project can accept an application to it.');
    }
    if (prop.status !== 'pending') throw new BadRequestException(`This ${prop.type} is ${prop.status}.`);
    this.openTask(prop.taskId, 'hire for it');
    return this.hire(task, prop, actor);
  }

  /** Saying no: the client rejects an application, or the invited worker declines. */
  decline(id: string, actor: Actor) {
    const prop = this.findById(id);
    const task = this.tasksService.findById(prop.taskId);
    if (this.isInvitation(prop)) {
      assertAllowed(prop.workerId === actor.id, 'Only the invited worker can decline this invitation.');
    } else {
      assertAllowed(task.clientId === actor.id, 'Only the client who owns this project can reject an application to it.');
    }
    if (prop.status !== 'pending') throw new BadRequestException(`This ${prop.type} is already ${prop.status}.`);
    const updated = this.proposalsRepository.update(id, { status: this.isInvitation(prop) ? 'declined' : 'rejected' });
    if (this.isInvitation(prop)) {
      this.notifications.notify(task.clientId, {
        type: 'proposal', text: `${prop.workerName || 'The worker'} declined your invitation`, subtext: task.title, link: '/worker-applications',
      });
    } else {
      this.notifications.notify(prop.workerId, {
        type: 'proposal', text: 'Your application was not selected', subtext: task.title, link: '/my-proposals',
      });
    }
    return updated;
  }

  resetToSeed() {
    this.proposalsRepository.resetToSeed();
  }
}
