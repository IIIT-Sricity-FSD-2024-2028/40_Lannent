import { Injectable } from '@nestjs/common';
import { SEED_PROPOSALS } from '../seed/seed.data';

/**
 * ProposalsRepository — In-Memory Data Access Layer
 *
 * Manages the PROPOSALS array and provides low-level CRUD operations.
 * Business logic (hiring, invitation acceptance) belongs in ProposalsService.
 */
@Injectable()
export class ProposalsRepository {
  private proposals: any[] = JSON.parse(JSON.stringify(SEED_PROPOSALS));
  private counter = 100;

  generateId(): string {
    return 'p_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { taskId?: string; workerId?: string; type?: string }): any[] {
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

  findById(id: string): any | null {
    return this.proposals.find(p => p.id === id) || null;
  }

  insert(proposal: any): any {
    this.proposals.push(proposal);
    return proposal;
  }

  update(id: string, partial: any): any | null {
    const idx = this.proposals.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.proposals[idx] = { ...this.proposals[idx], ...partial };
    return this.proposals[idx];
  }

  /** Bulk-update all proposals for a given task (used during hiring). */
  updateAllByTaskId(taskId: string, hiredProposalId: string): void {
    this.proposals = this.proposals.map(p =>
      p.taskId === taskId
        ? { ...p, status: p.id === hiredProposalId ? 'hired' : 'rejected' }
        : p,
    );
  }

  resetToSeed(): void {
    this.proposals = JSON.parse(JSON.stringify(SEED_PROPOSALS));
  }
}
