import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { SEED_PROPOSALS } from '../seed/seed.data';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { TasksService } from '../tasks/tasks.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class ProposalsService {
  private proposals: any[] = JSON.parse(JSON.stringify(SEED_PROPOSALS));
  private counter = 100;

  constructor(
    @Inject(forwardRef(() => TasksService)) private tasksService: TasksService,
    @Inject(forwardRef(() => TransactionsService)) private transactionsService: TransactionsService,
  ) {}

  private generateId(): string {
    return 'p_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { taskId?: string; workerId?: string; type?: string }) {
    let result = this.proposals;
    if (query?.taskId) result = result.filter(p => p.taskId === query.taskId);
    if (query?.workerId) {
      if (query?.type === 'invitation') {
        result = result.filter(p => p.workerId === query.workerId && p.type === 'invitation');
      } else {
        result = result.filter(p => p.workerId === query.workerId && p.type !== 'invitation');
      }
    }
    return result;
  }

  findById(id: string) {
    const prop = this.proposals.find(p => p.id === id);
    if (!prop) throw new NotFoundException(`Proposal with id "${id}" not found`);
    return prop;
  }

  create(dto: CreateProposalDto) {
    const prop = {
      id: this.generateId(),
      status: 'pending',
      type: dto.type || 'proposal',
      createdAt: new Date().toISOString().slice(0, 10),
      skills: dto.skills || [],
      ...dto,
    };
    this.proposals.push(prop);
    return prop;
  }

  update(id: string, dto: UpdateProposalDto) {
    const idx = this.proposals.findIndex(p => p.id === id);
    if (idx === -1) throw new NotFoundException(`Proposal with id "${id}" not found`);
    this.proposals[idx] = { ...this.proposals[idx], ...dto };
    return this.proposals[idx];
  }

  hireWorker(proposalId: string) {
    const prop = this.findById(proposalId);

    // Mark all other proposals for same task as rejected, this one as hired
    this.proposals = this.proposals.map(p =>
      p.taskId === prop.taskId
        ? { ...p, status: p.id === proposalId ? 'hired' : 'rejected' }
        : p,
    );

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

    return this.proposals.find(p => p.id === proposalId);
  }

  acceptInvitation(proposalId: string) {
    const prop = this.findById(proposalId);
    if (prop.type !== 'invitation') throw new BadRequestException('This is not an invitation.');

    this.proposals = this.proposals.map(p =>
      p.taskId === prop.taskId
        ? { ...p, status: p.id === proposalId ? 'hired' : 'rejected' }
        : p,
    );

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

    return this.proposals.find(p => p.id === proposalId);
  }

  declineInvitation(proposalId: string) {
    const prop = this.findById(proposalId);
    if (prop.type !== 'invitation') throw new BadRequestException('This is not an invitation.');
    prop.status = 'rejected';
    return prop;
  }

  resetToSeed() {
    this.proposals = JSON.parse(JSON.stringify(SEED_PROPOSALS));
  }
}
