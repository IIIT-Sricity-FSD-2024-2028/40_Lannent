import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { CreateExpertApplicationDto } from './dto/create-expert-application.dto';
import { UpdateExpertApplicationStatusDto } from './dto/update-expert-application.dto';
import { ExpertApplicationsRepository } from './expert-applications.repository';
import { UsersService } from '../users/users.service';

/**
 * ExpertApplicationsService — Business Logic Layer
 *
 * Handles application review and auto-creation of expert user accounts.
 * Delegates all data-access operations to ExpertApplicationsRepository.
 */
@Injectable()
export class ExpertApplicationsService {
  constructor(
    private readonly expertApplicationsRepository: ExpertApplicationsRepository,
    @Inject(forwardRef(() => UsersService)) private usersService: UsersService,
  ) {}

  findAll() {
    return this.expertApplicationsRepository.findAll();
  }

  findById(id: string) {
    const app = this.expertApplicationsRepository.findById(id);
    if (!app) throw new NotFoundException(`Expert application with id "${id}" not found`);
    return app;
  }

  create(dto: CreateExpertApplicationDto) {
    const app = {
      id: this.expertApplicationsRepository.generateId(),
      status: 'pending',
      appliedAt: new Date().toISOString().slice(0, 10),
      reviewedAt: null,
      reviewedBy: null,
      ...dto,
    };
    return this.expertApplicationsRepository.insert(app);
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
            password: app.password || 'Expert@123',
            role: 'expert',
            specialization: app.expertise || '',
          });
        }
      } catch {}
    }

    return app;
  }

  resetToSeed() {
    this.expertApplicationsRepository.resetToSeed();
  }
}
