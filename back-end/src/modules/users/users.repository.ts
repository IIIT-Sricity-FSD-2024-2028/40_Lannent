import { Injectable } from '@nestjs/common';
import { SEED_USERS, SEED_CLIENTS, SEED_WORKERS, SEED_EXPERTS } from '../seed/seed.data';

/**
 * UsersRepository — In-Memory Data Access Layer
 *
 * Manages the four EER sub-tables (USERS, CLIENTS, WORKERS, EXPERTS)
 * and provides low-level CRUD operations on the in-memory arrays.
 * Business logic (validation, error throwing) belongs in UsersService.
 */
@Injectable()
export class UsersRepository {
  private users: any[]   = JSON.parse(JSON.stringify(SEED_USERS));
  private clients: any[] = JSON.parse(JSON.stringify(SEED_CLIENTS));
  private workers: any[] = JSON.parse(JSON.stringify(SEED_WORKERS));
  private experts: any[] = JSON.parse(JSON.stringify(SEED_EXPERTS));
  private counter = 100;

  generateId(): string {
    return 'u_' + Date.now() + '_' + (this.counter++);
  }

  // ── Merge: base user + role-specific fields → flat object ─────────────────
  mergeUser(base: any): any {
    if (!base) return null;
    const merged: any = { ...base };

    if (base.role === 'client') {
      const sub = this.clients.find(c => c.userId === base.id);
      merged.company = sub?.company ?? '';
      merged.location = sub?.location ?? '';
      merged.skills = [];
      merged.rating = 0;
      merged.completedProjects = 0;
      merged.specialization = '';
      merged.reviewsDone = 0;
    } else if (base.role === 'worker') {
      const sub = this.workers.find(w => w.userId === base.id);
      merged.location = sub?.location ?? '';
      merged.skills = sub?.skills ?? [];
      merged.rating = sub?.rating ?? 0;
      merged.completedProjects = sub?.completedProjects ?? 0;
      merged.company = '';
      merged.specialization = '';
      merged.reviewsDone = 0;
    } else if (base.role === 'expert') {
      const sub = this.experts.find(e => e.userId === base.id);
      merged.specialization = sub?.specialization ?? '';
      merged.reviewsDone = sub?.reviewsDone ?? 0;
      merged.company = '';
      merged.location = '';
      merged.skills = [];
      merged.rating = 0;
      merged.completedProjects = 0;
    } else {
      merged.company = '';
      merged.location = '';
      merged.skills = [];
      merged.rating = 0;
      merged.completedProjects = 0;
      merged.specialization = '';
      merged.reviewsDone = 0;
    }

    return merged;
  }

  // ── CRUD Operations ───────────────────────────────────────────────────────

  findAll(): any[] {
    return this.users.map(u => this.mergeUser(u));
  }

  findById(id: string): any | null {
    const base = this.users.find(u => u.id === id);
    return base ? this.mergeUser(base) : null;
  }

  findByEmail(email: string): any | null {
    const base = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return base ? this.mergeUser(base) : null;
  }

  insertBase(baseUser: any): void {
    this.users.push(baseUser);
  }

  insertClient(sub: any): void {
    this.clients.push(sub);
  }

  insertWorker(sub: any): void {
    this.workers.push(sub);
  }

  insertExpert(sub: any): void {
    this.experts.push(sub);
  }

  updateBase(id: string, partial: any): any | null {
    const base = this.users.find(u => u.id === id);
    if (!base) return null;
    Object.assign(base, partial);
    return base;
  }

  findClientSub(userId: string): any | null {
    return this.clients.find(c => c.userId === userId) || null;
  }

  findWorkerSub(userId: string): any | null {
    return this.workers.find(w => w.userId === userId) || null;
  }

  findExpertSub(userId: string): any | null {
    return this.experts.find(e => e.userId === userId) || null;
  }

  deleteById(id: string): boolean {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.users.splice(idx, 1);
    this.clients = this.clients.filter(c => c.userId !== id);
    this.workers = this.workers.filter(w => w.userId !== id);
    this.experts = this.experts.filter(e => e.userId !== id);
    return true;
  }

  // ── Wallet Operations ────────────────────────────────────────────────────

  getRawBase(id: string): any | null {
    return this.users.find(u => u.id === id) || null;
  }

  // ── Reset to seed data ───────────────────────────────────────────────────

  resetToSeed(): void {
    this.users   = JSON.parse(JSON.stringify(SEED_USERS));
    this.clients = JSON.parse(JSON.stringify(SEED_CLIENTS));
    this.workers = JSON.parse(JSON.stringify(SEED_WORKERS));
    this.experts = JSON.parse(JSON.stringify(SEED_EXPERTS));
  }
}
