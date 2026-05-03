import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { SEED_EXPERT_APPLICATIONS } from '../seed/seed.data';
import { CreateExpertApplicationDto } from './dto/create-expert-application.dto';
import { UpdateExpertApplicationStatusDto } from './dto/update-expert-application.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ExpertApplicationsService {
  private applications: any[] = JSON.parse(JSON.stringify(SEED_EXPERT_APPLICATIONS));
  private counter = 100;

  constructor(
    @Inject(forwardRef(() => UsersService)) private usersService: UsersService,
  ) {}

  private generateId(): string {
    return 'ea_' + Date.now() + '_' + (this.counter++);
  }

  findAll() {
    return this.applications;
  }

  findById(id: string) {
    const app = this.applications.find(a => a.id === id);
    if (!app) throw new NotFoundException(`Expert application with id "${id}" not found`);
    return app;
  }

  create(dto: CreateExpertApplicationDto) {
    const app = {
      id: this.generateId(),
      status: 'pending',
      appliedAt: new Date().toISOString().slice(0, 10),
      reviewedAt: null,
      reviewedBy: null,
      ...dto,
    };
    this.applications.push(app);
    return app;
  }

  updateStatus(id: string, dto: UpdateExpertApplicationStatusDto) {
    const app = this.findById(id);
    app.status = dto.status;
    app.reviewedAt = new Date().toISOString().slice(0, 10);
    app.reviewedBy = dto.reviewedBy;

    // On approval, auto-create expert user account
    if (dto.status === 'approved') {
      try {
        const existing = this.usersService.findByEmail(app.email);
        if (!existing) {
          this.usersService.create({
            name: app.name,
            email: app.email,
            password: 'Expert@123',
            role: 'expert',
            specialization: app.expertise || '',
          });
        }
      } catch {}
    }

    return app;
  }

  resetToSeed() {
    this.applications = JSON.parse(JSON.stringify(SEED_EXPERT_APPLICATIONS));
  }
}
