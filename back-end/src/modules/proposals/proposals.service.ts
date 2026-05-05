import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { ProposalsRepository } from './proposals.repository';
import { TasksService } from '../tasks/tasks.service';
import { TransactionsService } from '../transactions/transactions.service';

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

    // Mark all other proposals for same task as rejected, this one as hired
    this.proposalsRepository.updateAllByTaskId(prop.taskId, proposalId);

    // Update task with hired worker
    try {
      const task = this.tasksService.findById(prop.taskId);
      this.tasksService.update(prop.taskId, { workerId: prop.workerId, status: 'in-progress' });

      // Lock escrow
      this.transactionsService.create({
        type: 'escrow-lock',
        amount: task.budget,
        fromId: task.clientId,
        toId: 'escrow',
        taskId: task.id,
        milestoneId: undefined,
        description: `Escrow funded for ${task.title}`,
        status: 'completed',
      });
    } catch {}

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

    this.proposalsRepository.updateAllByTaskId(prop.taskId, proposalId);

    try {
      const task = this.tasksService.findById(prop.taskId);
      this.tasksService.update(prop.taskId, { workerId: prop.workerId, status: 'in-progress' });

      this.transactionsService.create({
        type: 'escrow-lock',
        amount: task.budget,
        fromId: task.clientId,
        toId: 'escrow',
        taskId: task.id,
        milestoneId: undefined,
        description: `Escrow funded for ${task.title}`,
        status: 'completed',
      });
    } catch {}

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
