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

  /**
   * An applicant chooses a password on the form, so the stored record holds one.
   * It is needed to create their account on approval and must never leave the
   * server — every read strips it.
   */
  private redact(app: any) {
    if (!app) return app;
    const { password, ...safe } = app;
    return safe;
  }

  findAll() {
    return this.expertApplicationsRepository.findAll().map((a: any) => this.redact(a));
  }

  findById(id: string) {
    const app = this.expertApplicationsRepository.findById(id);
    if (!app) throw new NotFoundException(`Expert application with id "${id}" not found`);
    return this.redact(app);
  }

  /** Public: whether an application exists for this email, and nothing else. */
  statusFor(email: string) {
    if (!email) return { exists: false, status: null };
    const app = this.expertApplicationsRepository
      .findAll()
      .find((a: any) => String(a.email).toLowerCase() === email.toLowerCase());
    return app ? { exists: true, status: app.status } : { exists: false, status: null };
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
    return this.redact(this.expertApplicationsRepository.insert(app));
  }

  updateStatus(id: string, dto: UpdateExpertApplicationStatusDto) {
    // The RAW record, not findById's redacted copy — this mutates the stored
    // application and needs the applicant's chosen password to create their
    // account with the credentials they signed up with.
    const app = this.expertApplicationsRepository.findById(id);
    if (!app) throw new NotFoundException(`Expert application with id "${id}" not found`);
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

    return this.redact(app);
  }

  resetToSeed() {
    this.expertApplicationsRepository.resetToSeed();
  }
}
