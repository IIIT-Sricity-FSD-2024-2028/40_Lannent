import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputesRepository } from './disputes.repository';
import { MilestonesService } from '../milestones/milestones.service';
import { TasksService } from '../tasks/tasks.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';

/**
 * DisputesService — Business Logic Layer
 *
 * Handles dispute creation, resolution, and milestone status updates.
 * Delegates all data-access operations to DisputesRepository.
 */
@Injectable()
export class DisputesService {
  constructor(
    private readonly disputesRepository: DisputesRepository,
    @Inject(forwardRef(() => MilestonesService)) private milestonesService: MilestonesService,
    @Inject(forwardRef(() => TasksService)) private tasksService: TasksService,
    @Inject(forwardRef(() => LedgerService)) private ledger: LedgerService,
    @Inject(forwardRef(() => AuditRequestsService)) private auditRequests: AuditRequestsService,
  ) {}

  findAll() {
    return this.disputesRepository.findAll();
  }

  findById(id: string) {
    const d = this.disputesRepository.findById(id);
    if (!d) throw new NotFoundException(`Dispute with id "${id}" not found`);
    return d;
  }

  create(dto: CreateDisputeDto) {
    const dispute = {
      id: this.disputesRepository.generateId(),
      status: 'open',
      expertId: null,
      verdict: null,
      resolution: null,
      createdAt: new Date().toISOString().slice(0, 10),
      resolvedAt: null,
      milestoneId: dto.milestoneId || null,
      ...dto,
    };
    this.disputesRepository.insert(dispute);

    // If milestone exists, set it to disputed
    if (dto.milestoneId) {
      try { this.milestonesService.update(dto.milestoneId, { status: 'disputed' }); } catch {}
    }

    // Open an audit engagement so an expert can preview the claim, agree a fee
    // and be paid for arbitrating it. Best-effort: a dispute must still be
    // recorded even if the engagement cannot be opened.
    try {
      const task = this.tasksService.findById(dto.taskId);
      const auditRequest = this.auditRequests.create({
        kind: 'dispute-audit',
        taskId: dto.taskId,
        milestoneId: dto.milestoneId,
        clientId: task.clientId,
        workerId: task.workerId,
        disputeId: dispute.id,
        severity: 'High',
        project: task.title,
        milestone: dto.milestone,
        status: 'preview-sent',
      });
      (dispute as any).auditRequestId = auditRequest.id;
    } catch {}

    return dispute;
  }

  resolve(id: string, dto: ResolveDisputeDto) {
    const dispute = this.findById(id);
    dispute.status = 'resolved';
    dispute.expertId = dto.expertId;
    dispute.verdict = dto.verdict;
    dispute.resolution = dto.resolution;
    dispute.resolvedAt = new Date().toISOString().slice(0, 10);

    // Move the money the verdict implies. Before this, resolving a dispute
    // changed a status and nothing else — even though the seeded resolution text
    // claimed escrow had been released.
    let settlement: any = null;
    if (dispute.milestoneId) {
      const ms = this.milestonesService.findById(dispute.milestoneId);
      const task = this.tasksService.findById(dispute.taskId);

      if (dto.verdict === 'worker-favour') {
        settlement = this.ledger.releaseMilestone({
          milestoneId: ms.id,
          taskId: task.id,
          clientId: task.clientId,
          workerId: ms.workerId,
          amount: ms.budget,
          description: `Dispute resolved in worker's favour — ${ms.title}`,
        });
        this.milestonesService.update(dispute.milestoneId, { status: 'completed' });
        this.milestonesService.checkTaskCompletion(dispute.taskId);
      } else if (dto.verdict === 'client-favour') {
        settlement = this.ledger.refundToClient({
          taskId: task.id,
          clientId: task.clientId,
          amount: ms.budget,
          reason: `Dispute resolved in client's favour — ${ms.title}`,
        });
        this.milestonesService.update(dispute.milestoneId, { status: 'revision-needed' });
      } else if (dto.verdict === 'split') {
        // Half to the worker, half back to the client.
        const half = Math.round((ms.budget / 2) * 100) / 100;
        const release = this.ledger.releaseMilestone({
          milestoneId: ms.id,
          taskId: task.id,
          clientId: task.clientId,
          workerId: ms.workerId,
          amount: half,
          description: `Dispute split — worker's share of ${ms.title}`,
        });
        const refund = this.ledger.refundToClient({
          taskId: task.id,
          clientId: task.clientId,
          amount: Math.round((ms.budget - half) * 100) / 100,
          reason: `Dispute split — client's share of ${ms.title}`,
        });
        settlement = { release, refund };
        this.milestonesService.update(dispute.milestoneId, { status: 'completed' });
        this.milestonesService.checkTaskCompletion(dispute.taskId);
      }
    }

    return { ...dispute, settlement };
  }

  resetToSeed() {
    this.disputesRepository.resetToSeed();
  }
}
