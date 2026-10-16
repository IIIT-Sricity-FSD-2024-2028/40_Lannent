import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { CreateExpertApplicationDto } from './dto/create-expert-application.dto';
import { UpdateExpertApplicationStatusDto } from './dto/update-expert-application.dto';
import { ExpertApplicationsRepository } from './expert-applications.repository';
import { UsersService } from '../users/users.service';
import { hashPassword, verifyPassword } from '../../common/security/password.util';
import { assertStrongPassword } from '../users/users.service';
import { AppLoggerService } from '../../common/logging/app-logger.service';
import { ModuleRef } from '@nestjs/core';

/**
 * The signup form's expertise → the task categories a reviewer covers.
 * Clients are only offered reviewers whose domains include the project's
 * category, and approval used to create every expert with none — so a newly
 * approved reviewer could never be chosen by anyone.
 */
const DOMAINS_BY_EXPERTISE: Record<string, string[]> = {
  'Frontend Development': ['Web Development', 'UI/UX Design'],
  'Backend Development': ['Backend / API', 'Web Development'],
  'Full-Stack Development': ['Web Development', 'Backend / API'],
  'Mobile Development': ['Mobile Development'],
  'DevOps & Infrastructure': ['DevOps / Cloud'],
  'Security & Auditing': ['Security', 'Web Development', 'Backend / API'],
  'Data Engineering': ['Backend / API', 'AI / Machine Learning'],
  'Machine Learning': ['AI / Machine Learning'],
};

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
    private readonly log: AppLoggerService,
    private readonly moduleRef: ModuleRef,
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
  /**
   * An application's status, for its applicant only: the password must match
   * the one they applied with. Returns null for no match.
   */
  statusForCredentials(email: string, password: string): string | null {
    if (!email || !password) return null;
    const app = this.expertApplicationsRepository
      .findAll()
      .filter((a: any) => String(a.email).toLowerCase() === String(email).trim().toLowerCase())
      .pop();
    if (!app || !app.password || !verifyPassword(password, app.password)) return null;
    return app.status;
  }

  create(dto: CreateExpertApplicationDto) {
    // One live application per address, and none for an existing account.
    assertStrongPassword(dto.password);
    if (!DOMAINS_BY_EXPERTISE[dto.expertise || '']) {
      // The expertise decides which project categories the reviewer covers.
      // An unknown one left them with no domains at all.
      throw new BadRequestException(`Choose your area of expertise from: ${Object.keys(DOMAINS_BY_EXPERTISE).join(', ')}.`);
    }
    const email = dto.email.trim().toLowerCase();
    const clash = this.expertApplicationsRepository
      .findAll()
      .find((a: any) => String(a.email).toLowerCase() === email && a.status !== 'rejected');
    if (clash || this.usersService.findByEmail(email)) {
      throw new BadRequestException('An application or account with this email already exists.');
    }
    // A résumé or certificate must be a fresh application upload — not some
    // other file id, and not one already attached to another application.
    const fileIds = [dto.resumeFile?.id, dto.certificateFile?.id].filter(Boolean) as string[];
    const files = this.filesService();
    for (const id of fileIds) {
      if (files && !files.isUnclaimedApplicationFile(id)) {
        throw new BadRequestException('Upload your résumé or certificate again — that file is not available.');
      }
    }
    if (files) files.claimApplicationFiles(fileIds);

    const app = {
      id: this.expertApplicationsRepository.generateId(),
      status: 'pending',
      appliedAt: new Date().toISOString().slice(0, 10),
      reviewedAt: null,
      reviewedBy: null,
      ...dto,
      email,
      // The applicant chooses a password on the form and it sits in this record
      // until approval creates their account. Hashed on the way in, so an
      // application never holds a readable one.
      password: dto.password ? hashPassword(dto.password) : undefined,
    };
    return this.redact(this.expertApplicationsRepository.insert(app));
  }

  updateStatus(id: string, dto: UpdateExpertApplicationStatusDto, reviewerId: string) {
    // The RAW record, not findById's redacted copy — this mutates the stored
    // application and needs the applicant's chosen password to create their
    // account with the credentials they signed up with.
    const app = this.expertApplicationsRepository.findById(id);
    if (!app) throw new NotFoundException(`Expert application with id "${id}" not found`);
    if (app.status !== 'pending') {
      // Rejecting an approved application would leave its account live.
      throw new BadRequestException(`This application was already ${app.status}.`);
    }

    // Create the account before recording the decision, so an application is
    // never shown as approved with no account behind it.
    if (dto.status === 'approved') {
      if (this.usersService.findByEmail(app.email)) {
        throw new BadRequestException(`An account already exists for ${app.email}.`);
      }
      if (!app.password) {
        // This used to fall back to the hardcoded password "Expert@123" —
        // a working login anyone could guess for any approved reviewer.
        throw new BadRequestException('This application has no password, so no account can be created for it.');
      }
      this.usersService.createPrivileged(
        {
          name: app.name,
          email: app.email,
          password: app.password,
          role: 'expert',
          specialization: app.expertise || '',
        },
        { domains: DOMAINS_BY_EXPERTISE[app.expertise] || [] },
        // The applicant's own password, hashed when they applied.
        { passwordIsHash: true, createdBy: reviewerId },
      );
      this.log.log('expertApplications.approve', `created expert account for application ${app.id}`);
    }

    app.status = dto.status;
    app.reviewedAt = new Date().toISOString().slice(0, 10);
    app.reviewedBy = reviewerId;
    return this.redact(app);
  }

  private filesService(): any {
    try {
      const { FilesService } = require('../files/files.service');
      return this.moduleRef.get(FilesService, { strict: false });
    } catch {
      return null;
    }
  }

  resetToSeed() {
    this.expertApplicationsRepository.resetToSeed();
  }
}
