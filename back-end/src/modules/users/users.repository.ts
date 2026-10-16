import { Injectable } from '@nestjs/common';
import { SEED_USERS, SEED_CLIENTS, SEED_WORKERS, SEED_EXPERTS } from '../seed/seed.data';
import { hashPassword } from '../../common/security/password.util';

/**
 * UsersRepository — In-Memory Data Access Layer
 *
 * Manages the four EER sub-tables (USERS, CLIENTS, WORKERS, EXPERTS)
 * and provides low-level CRUD operations on the in-memory arrays.
 * Business logic (validation, error throwing) belongs in UsersService.
 */
@Injectable()
export class UsersRepository {
  private users: any[]   = hashSeed(SEED_USERS);
  private clients: any[] = JSON.parse(JSON.stringify(SEED_CLIENTS));
  private workers: any[] = JSON.parse(JSON.stringify(SEED_WORKERS));
  private experts: any[] = JSON.parse(JSON.stringify(SEED_EXPERTS));
  private counter = 100;
  /**
   * Project counts (and an expert's reviews done) are facts about what happened on
   * the platform, so they are worked out from projects and reviews (by
   * TasksService) on every read — never typed in or stored.
   */
  private statsProvider: ((id: string, role: string) => Record<string, any>) | null = null;

  setStatsProvider(fn: (id: string, role: string) => Record<string, any>) {
    this.statsProvider = fn;
  }

  generateId(): string {
    return 'u_' + Date.now() + '_' + (this.counter++);
  }

  // ── Merge: base user + role-specific fields → flat object ─────────────────
  mergeUser(base: any): any {
    if (!base) return null;
    // Every user has the same shape regardless of role, so pages never have to
    // guess whether a field exists. Role tables fill in what they hold.
    const merged: any = {
      phone: '', phoneCountryCode: '', bio: '',
      company: '', location: '', companyDetails: null,
      skills: [], completedProjects: 0, activeProjects: 0,
      jobTitle: '', experienceLevel: '', hourlyRate: 0, languages: [], portfolioProjects: [], availability: null,
      specialization: '', reviewsDone: 0, domains: [],
      ...base,
    };

    const sub =
      base.role === 'client' ? this.clients.find(c => c.userId === base.id) :
      base.role === 'worker' ? this.workers.find(w => w.userId === base.id) :
      base.role === 'expert' ? this.experts.find(e => e.userId === base.id) :
      null;
    if (sub) {
      const { userId: _omit, ...fields } = sub;
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) merged[k] = v;
      }
    }
    if (this.statsProvider) Object.assign(merged, this.statsProvider(base.id, base.role));
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
    this.users   = hashSeed(SEED_USERS);
    this.clients = JSON.parse(JSON.stringify(SEED_CLIENTS));
    this.workers = JSON.parse(JSON.stringify(SEED_WORKERS));
    this.experts = JSON.parse(JSON.stringify(SEED_EXPERTS));
  }
}

/**
 * Seed users ship with readable passwords so the documented demo logins are
 * usable. They are hashed on the way into the store, so nothing in a running
 * process ever holds a plaintext password — reset included.
 */
function hashSeed(seed: any[]): any[] {
  return JSON.parse(JSON.stringify(seed)).map((u: any) => ({
    ...u,
    password: hashPassword(u.password),
  }));
}
