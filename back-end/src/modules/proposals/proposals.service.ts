import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { ProposalsRepository } from './proposals.repository';
import { TasksService } from '../tasks/tasks.service';
import { TransactionsService } from '../transactions/transactions.service';
import { LedgerService } from '../ledger/ledger.service';
import { MilestonesService } from '../milestones/milestones.service';

/**
 * ProposalsService — Business Logic Layer
 *
 * Handles hiring, invitation acceptance/decline, and escrow creation.
 * Delegates all data-access operations to ProposalsRepository.
 */
@Injectable()
export class ProposalsService {
  constructor(
    private readonly proposalsRepository: ProposalsRepository,
    @Inject(forwardRef(() => TasksService)) private tasksService: TasksService,
    @Inject(forwardRef(() => TransactionsService)) private transactionsService: TransactionsService,
    @Inject(forwardRef(() => LedgerService)) private ledger: LedgerService,
    @Inject(forwardRef(() => MilestonesService)) private milestonesService: MilestonesService,
  ) {}

  findAll(query?: { taskId?: string; workerId?: string; type?: string }) {
    return this.proposalsRepository.findAll(query);
  }

  findById(id: string) {
    const prop = this.proposalsRepository.findById(id);
    if (!prop) throw new NotFoundException(`Proposal with id "${id}" not found`);
    return prop;
  }

  create(dto: CreateProposalDto) {
    // Guard: only open tasks accept proposals/invitations
    if (dto.taskId) {
      try {
        const task = this.tasksService.findById(dto.taskId);
        if (task.status !== 'open') {
          throw new BadRequestException('This project is not open — cannot submit proposals or invitations.');
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
      }
    }

    const prop = {
      id: this.proposalsRepository.generateId(),
      status: 'pending',
      type: dto.type || 'proposal',
      createdAt: new Date().toISOString().slice(0, 10),
      skills: dto.skills || [],
      ...dto,
    };
    return this.proposalsRepository.insert(prop);
  }

  update(id: string, dto: UpdateProposalDto) {
    const updated = this.proposalsRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Proposal with id "${id}" not found`);
    return updated;
  }

  /**
   * Assigns the worker and funds project escrow through the ledger.
   *
   * The escrow charge is deliberately NOT swallowed: if the client cannot cover
   * the budget plus fees, hiring must fail loudly rather than assign a worker to
   * a project no one has paid for.
   */
  private assignAndFund(prop: any) {
    const task = this.tasksService.findById(prop.taskId);
    this.ledger.fundProjectEscrow(task.id, task.clientId, task.budget, task.title);
    this.tasksService.update(prop.taskId, { workerId: prop.workerId, status: 'in-progress' });

    // Milestones created before anyone was hired carry no workerId. Without this
    // backfill their payment has no recipient — which used to fail silently and
    // leave the milestone marked paid but the worker uncredited.
    // Any milestone on this task is payable to this task's worker. Checking only
    // for a missing workerId was not enough: a milestone created with someone
    // else's id (the client's, in one case) silently kept it and was paid out
    // to the wrong person.
    for (const ms of this.milestonesService.findAll({ taskId: task.id })) {
      if (ms.workerId !== prop.workerId) {
        this.milestonesService.update(ms.id, { workerId: prop.workerId });
      }
    }
  }

  hireWorker(proposalId: string) {
    const prop = this.findById(proposalId);

    // Guard: only open tasks allow hiring
    try {
      const task = this.tasksService.findById(prop.taskId);
      if (task.status !== 'open') {
        throw new BadRequestException('This project is not open — cannot hire workers.');
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
    }

    // Fund first: if the client cannot cover the budget plus fees this throws,
    // and no proposal is marked hired for a contract that was never funded.
    this.assignAndFund(prop);

    // Mark all other proposals for the same task as rejected, this one as hired
    this.proposalsRepository.updateAllByTaskId(prop.taskId, proposalId);

    return this.proposalsRepository.findById(proposalId);
  }

  acceptInvitation(proposalId: string) {
    const prop = this.findById(proposalId);
    if (prop.type !== 'invitation') throw new BadRequestException('This is not an invitation.');

    // Guard: only open tasks allow accepting invitations
    try {
      const task = this.tasksService.findById(prop.taskId);
      if (task.status !== 'open') {
        throw new BadRequestException('This project is no longer open — cannot accept invitation.');
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
    }

    this.assignAndFund(prop);

    this.proposalsRepository.updateAllByTaskId(prop.taskId, proposalId);

    return this.proposalsRepository.findById(proposalId);
  }

  declineInvitation(proposalId: string) {
    const prop = this.findById(proposalId);
    if (prop.type !== 'invitation') throw new BadRequestException('This is not an invitation.');
    prop.status = 'rejected';
    return prop;
  }

  resetToSeed() {
    this.proposalsRepository.resetToSeed();
  }
}
