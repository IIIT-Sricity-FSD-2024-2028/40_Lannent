import { Injectable } from '@nestjs/common';
import { SEED_MILESTONES } from '../seed/seed.data';

/**
 * MilestonesRepository — In-Memory Data Access Layer
 *
 * Manages the MILESTONES array and provides low-level CRUD operations.
 * Business logic (submit, approve, task-completion check) belongs in MilestonesService.
 */
@Injectable()
export class MilestonesRepository {
  private milestones: any[] = JSON.parse(JSON.stringify(SEED_MILESTONES));
  private counter = 100;

  generateId(): string {
    return 'm_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { taskId?: string }): any[] {
    let result = this.milestones;
    if (query?.taskId) result = result.filter(m => m.taskId === query.taskId);
    return result;
  }

  findById(id: string): any | null {
    return this.milestones.find(m => m.id === id) || null;
  }

  insert(milestone: any): any {
    this.milestones.push(milestone);
    return milestone;
  }

  update(id: string, partial: any): any | null {
    const idx = this.milestones.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.milestones[idx] = { ...this.milestones[idx], ...partial };
    return this.milestones[idx];
  }

  filterByTaskId(taskId: string): any[] {
    return this.milestones.filter(m => m.taskId === taskId);
  }

  resetToSeed(): void {
    this.milestones = JSON.parse(JSON.stringify(SEED_MILESTONES));
  }
}
