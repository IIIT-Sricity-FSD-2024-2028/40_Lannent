import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { existsSync, unlinkSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { FilesRepository } from './files.repository';
import { UPLOAD_DIR, ensureUploadDir } from './upload.config';
import { TasksService } from '../tasks/tasks.service';
import { ContactsService } from '../contacts/contacts.service';
import { MilestonesService } from '../milestones/milestones.service';
import { ROLES } from '../../common/constants/roles';
import { canViewTask, canViewAnyRecord, canDeleteAnyFile } from '../../common/guards/viewer.util';
import { AppLoggerService } from '../../common/logging/app-logger.service';

/** Storage each signed-in account may use. */
const MAX_BYTES_PER_USER = 200 * 1024 * 1024;
/** Anonymous application uploads waiting to be attached to an application. */
const MAX_UNCLAIMED_APPLICATION_FILES = 200;
const UNCLAIMED_TTL_MS = 60 * 60 * 1000;

export interface Viewer {
  id?: string;
  role?: string;
}

/**
 * FilesService — Business Logic Layer
 *
 * Owns the metadata record and the access rules; multer has already written
 * the bytes by the time anything here runs.
 */
@Injectable()
export class FilesService {
  constructor(
    private readonly filesRepository: FilesRepository,
    @Inject(forwardRef(() => TasksService)) private readonly tasks: TasksService,
    @Inject(forwardRef(() => ContactsService)) private readonly contacts: ContactsService,
    @Inject(forwardRef(() => MilestonesService)) private readonly milestones: MilestonesService,
    private readonly log: AppLoggerService,
  ) {
    ensureUploadDir();
  }

  /** Records an uploaded file and returns the reference a deliverable stores. */
  create(file: any, viewer: Viewer, meta?: { taskId?: string; milestoneId?: string; purpose?: string }) {
    if (!file) throw new BadRequestException('No file was received. Send it in the "file" field.');
    const refuse = (e: Error): never => {
      this.safeUnlink(join(UPLOAD_DIR, basename(file.filename)));
      throw e;
    };

    if (meta?.purpose === 'expert-application') {
      // The one anonymous upload. Unclaimed résumés are cleared out, and the
      // pile of unclaimed ones is capped, so the route is not free storage.
      this.sweepUnclaimedApplicationFiles();
      const unclaimed = this.filesRepository.findAll().filter((f: any) => f.purpose === 'expert-application' && !f.claimed);
      if (unclaimed.length >= MAX_UNCLAIMED_APPLICATION_FILES) {
        refuse(new BadRequestException('Too many application uploads are waiting. Try again in a little while.'));
      }
    } else {
      // A signed-in upload belongs to a project. A file with no project could
      // only ever be read by its uploader — a private file host.
      if (!meta?.taskId) refuse(new BadRequestException('Choose the project this file belongs to.'));
      const onProject = viewer.id && this.safe(() => this.contacts.isParticipant(viewer.id!, meta!.taskId!));
      if (!onProject) refuse(new ForbiddenException('You can only attach files to a project you are part of.'));
      if (meta?.purpose === 'deliverable') {
        const task = this.safe(() => this.tasks.findById(meta.taskId!));
        const ms = meta.milestoneId ? this.safe(() => this.milestones.findById(meta.milestoneId!)) : null;
        if (!task || task.workerId !== viewer.id) refuse(new ForbiddenException('Only the worker hired on this project uploads its deliverables.'));
        if (!ms || ms.taskId !== meta.taskId) refuse(new BadRequestException('Choose the milestone this deliverable is for.'));
      }
      const mine = this.filesRepository.findAll({ uploadedBy: viewer.id });
      const used = mine.reduce((a: number, f: any) => a + (Number(f.size) || 0), 0);
      if (used + (Number(file.size) || 0) > MAX_BYTES_PER_USER) {
        refuse(new BadRequestException(`You have used your ${MAX_BYTES_PER_USER / 1024 / 1024} MB of storage. Delete files you no longer need first.`));
      }
    }

    const record = {
      id: this.filesRepository.generateId(),
      name: file.originalname,
      storedName: file.filename,
      size: file.size,
      mime: file.mimetype,
      uploadedBy: viewer.id || null,
      taskId: meta?.taskId || null,
      milestoneId: meta?.milestoneId || null,
      purpose: meta?.purpose || null,
      createdAt: new Date().toISOString(),
    };
    this.filesRepository.insert(record);

    this.log.log('files.upload', `${record.id} "${record.name}" ${record.size}b ${record.mime}`);
    return this.toRef(record);
  }

  /** The shape stored on a deliverable or an application. */
  private toRef(record: any) {
    return {
      id: record.id,
      name: record.name,
      size: record.size,
      mime: record.mime,
      url: `/api/files/${record.id}`,
      uploadedBy: record.uploadedBy,
    };
  }

  findById(id: string, viewer?: Viewer) {
    const record = this.filesRepository.findById(id);
    if (!record) throw new NotFoundException(`File with id "${id}" not found`);
    if (viewer && !this.canView(record, viewer)) {
      throw new ForbiddenException(
        'You do not have access to this file. Only the people involved in the project can open it.',
      );
    }
    return record;
  }

  /** The raw record, or null — for other modules checking what an id refers to. */
  findRecord(id: string) {
    return this.filesRepository.findById(id) || null;
  }

  meta(id: string, viewer?: Viewer) {
    return this.toRef(this.findById(id, viewer));
  }

  /** The path to stream, checked to still be inside the upload directory. */
  pathFor(id: string, viewer?: Viewer) {
    const record = this.findById(id, viewer);
    const full = join(UPLOAD_DIR, basename(record.storedName));
    if (!full.startsWith(UPLOAD_DIR)) {
      throw new ForbiddenException('Invalid file path.');
    }
    if (!existsSync(full)) {
      // The metadata is in memory and the bytes are on disk, so these can drift
      // — a restart with a cleared uploads directory lands here.
      this.log.warn('files.read', `record ${id} points at a missing file (${record.storedName})`);
      throw new NotFoundException('That file is no longer stored on the server.');
    }
    return { path: full, record };
  }

  /**
   * Who may open a file.
   *
   * The uploader always may. Beyond that, a file attached to a project follows
   * that project's participants, so a deliverable is not world-readable just
   * because someone guessed an id. A file with no project — a résumé on an
   * expert application — is uploader-and-staff only.
   */
  private canView(record: any, viewer: Viewer): boolean {
    if (canViewAnyRecord(viewer.role)) return true;
    if (record.uploadedBy && record.uploadedBy === viewer.id) return true;
    // Reviewing an application means reading the résumé attached to it — the
    // intake desk could approve applicants it was not allowed to vet.
    if (record.purpose === 'expert-application' && viewer.role === ROLES.INTAKE_ADMIN) return true;
    if (!record.taskId) return false;
    const task = this.safe(() => this.tasks.findById(record.taskId));
    if (record.purpose === 'deliverable') {
      // Work in progress is the worker's until they hand it in. A file
      // uploaded to the submit form used to be downloadable by the client
      // the moment it landed — before submission, and even after the worker
      // removed it from the form.
      if (!this.isSubmitted(record)) return false;
      return canViewTask(viewer.id, viewer.role, task, ...this.tasks.reviewersOf(record.taskId));
    }
    if (canViewTask(viewer.id, viewer.role, task, ...this.tasks.reviewersOf(record.taskId))) return true;
    // Everyone else attached to the project — a worker invited to it, or one
    // bidding who was sent a file in the project chat.
    return !!viewer.id && !!this.safe(() => this.contacts.isParticipant(viewer.id!, record.taskId));
  }

  /** True when a deliverable file is part of a submission on its milestone. */
  private isSubmitted(record: any): boolean {
    const ms = record.milestoneId ? this.safe(() => this.milestones.findById(record.milestoneId)) : null;
    if (!ms || ms.taskId !== record.taskId) return false;
    return ((ms.deliverable && ms.deliverable.files) || []).some((f: any) => f && f.id === record.id);
  }

  remove(id: string, viewer: Viewer) {
    const record = this.findById(id);
    const owns = record.uploadedBy && record.uploadedBy === viewer.id;
    if (!owns && !canDeleteAnyFile(viewer.role)) {
      throw new ForbiddenException('Only the person who uploaded a file, or operations staff, can delete it.');
    }
    // A submitted deliverable is the record of what was handed in — what the
    // client approved, or what a dispute reviewer judged.
    if (record.purpose === 'deliverable' && this.isSubmitted(record) && !canDeleteAnyFile(viewer.role)) {
      throw new BadRequestException('This file is part of a submitted deliverable and cannot be deleted.');
    }
    this.filesRepository.remove(id);
    this.safeUnlink(join(UPLOAD_DIR, basename(record.storedName)));
    this.log.log('files.delete', `${id} "${record.name}" removed`);
    return { deleted: true, id };
  }

  /**
   * Deletes files on disk that no record points at.
   *
   * Metadata is in memory, so every restart orphans whatever was uploaded in
   * the previous run. Without this the directory grows forever with bytes
   * nothing can reach.
   */
  sweepOrphans(): { removed: number } {
    ensureUploadDir();
    const known = new Set(this.filesRepository.storedNames());
    let removed = 0;
    for (const name of readdirSync(UPLOAD_DIR)) {
      if (name.startsWith('.')) continue;
      if (!known.has(name)) {
        this.safeUnlink(join(UPLOAD_DIR, name));
        removed++;
      }
    }
    if (removed) this.log.log('files.sweep', `removed ${removed} orphaned file(s) from uploads/`);
    return { removed };
  }

  /** Marks an application's uploads as belonging to it, so the sweep keeps them. */
  claimApplicationFiles(ids: string[]) {
    for (const id of ids) {
      const f = this.filesRepository.findById(id);
      if (f && f.purpose === 'expert-application') this.filesRepository.update(id, { claimed: true });
    }
  }

  /** True when this id is an application upload nobody has claimed yet. */
  isUnclaimedApplicationFile(id: string): boolean {
    const f = this.filesRepository.findById(id);
    return !!f && f.purpose === 'expert-application' && !f.claimed;
  }

  /** Deletes application uploads that no application claimed within the hour. */
  sweepUnclaimedApplicationFiles(now = Date.now()) {
    for (const f of this.filesRepository.findAll()) {
      if (f.purpose !== 'expert-application' || f.claimed) continue;
      if (now - new Date(f.createdAt).getTime() < UNCLAIMED_TTL_MS) continue;
      this.filesRepository.remove(f.id);
      this.safeUnlink(join(UPLOAD_DIR, basename(f.storedName)));
    }
  }

  resetToSeed() {
    this.filesRepository.resetToSeed();
    this.sweepOrphans();
  }

  private safeUnlink(path: string) {
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch (e) {
      this.log.warn('files.unlink', `could not delete ${path}`, e);
    }
  }

  private safe<T>(fn: () => T): T | null {
    try {
      return fn();
    } catch {
      return null;
    }
  }
}
