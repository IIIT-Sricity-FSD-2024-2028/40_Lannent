import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputesRepository } from './disputes.repository';
import { MilestonesService } from '../milestones/milestones.service';

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

    return dispute;
  }

  resolve(id: string, dto: ResolveDisputeDto) {
    const dispute = this.findById(id);
    dispute.status = 'resolved';
    dispute.expertId = dto.expertId;
    dispute.verdict = dto.verdict;
    dispute.resolution = dto.resolution;
    dispute.resolvedAt = new Date().toISOString().slice(0, 10);

    // Update milestone status based on verdict
    if (dispute.milestoneId) {
      try {
        if (dto.verdict === 'worker-favour') {
          this.milestonesService.update(dispute.milestoneId, { status: 'completed' });
          this.milestonesService.checkTaskCompletion(dispute.taskId);
        } else if (dto.verdict === 'client-favour') {
          this.milestonesService.update(dispute.milestoneId, { status: 'revision-needed' });
        }
      } catch {}
    }

    return dispute;
  }

  resetToSeed() {
    this.disputesRepository.resetToSeed();
  }
}
