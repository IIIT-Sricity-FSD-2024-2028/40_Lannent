import { Injectable } from '@nestjs/common';
import { SEED_EXPERT_APPLICATIONS } from '../seed/seed.data';

/**
 * ExpertApplicationsRepository — In-Memory Data Access Layer
 *
 * Manages the EXPERT_APPLICATIONS array and provides low-level CRUD operations.
 * Business logic (approval, user creation) belongs in ExpertApplicationsService.
 */
@Injectable()
export class ExpertApplicationsRepository {
  private applications: any[] = JSON.parse(JSON.stringify(SEED_EXPERT_APPLICATIONS));
  private counter = 100;

  generateId(): string {
    return 'ea_' + Date.now() + '_' + (this.counter++);
  }

  findAll(): any[] {
    return this.applications;
  }

  findById(id: string): any | null {
    return this.applications.find(a => a.id === id) || null;
  }

  insert(application: any): any {
    this.applications.push(application);
    return application;
  }

  update(id: string, partial: any): any | null {
    const app = this.applications.find(a => a.id === id);
    if (!app) return null;
    Object.assign(app, partial);
    return app;
  }

  resetToSeed(): void {
    this.applications = JSON.parse(JSON.stringify(SEED_EXPERT_APPLICATIONS));
  }
}
