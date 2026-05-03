import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { SEED_DISPUTES } from '../seed/seed.data';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { MilestonesService } from '../milestones/milestones.service';

@Injectable()
export class DisputesService {
  private disputes: any[] = JSON.parse(JSON.stringify(SEED_DISPUTES));
  private counter = 100;

  constructor(
    @Inject(forwardRef(() => MilestonesService)) private milestonesService: MilestonesService,
  ) {}

  private generateId(): string {
    return 'd_' + Date.now() + '_' + (this.counter++);
  }

  findAll() {
    return this.disputes;
  }

  findById(id: string) {
    const d = this.disputes.find(d => d.id === id);
    if (!d) throw new NotFoundException(`Dispute with id "${id}" not found`);
    return d;
  }

  create(dto: CreateDisputeDto) {
    const dispute = {
      id: this.generateId(),
      status: 'open',
      expertId: null,
      verdict: null,
      resolution: null,
      createdAt: new Date().toISOString().slice(0, 10),
      resolvedAt: null,
      milestoneId: dto.milestoneId || null,
      ...dto,
    };
    this.disputes.push(dispute);

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
    this.disputes = JSON.parse(JSON.stringify(SEED_DISPUTES));
  }
}
