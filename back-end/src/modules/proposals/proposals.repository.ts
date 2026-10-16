import { Injectable } from '@nestjs/common';
import { SEED_PROPOSALS } from '../seed/seed.data';

/**
 * ProposalsRepository — In-Memory Data Access Layer
 *
 * Manages the PROPOSALS array (worker applications and client invitations)
 * and provides low-level CRUD operations. Business logic (accepting, hiring)
 * belongs in ProposalsService.
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
    if (query?.workerId) result = result.filter(p => p.workerId === query.workerId);
    if (query?.type) result = result.filter(p => p.type === query.type);
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


  resetToSeed(): void {
    this.proposals = JSON.parse(JSON.stringify(SEED_PROPOSALS));
  }
}
