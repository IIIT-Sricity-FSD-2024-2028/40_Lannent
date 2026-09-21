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
import { AuditRequestsService } from '../audit-requests/audit-requests.service';
import { canViewTask, canViewAnyRecord, canDeleteAnyFile } from '../../common/guards/viewer.util';
import { AppLoggerService } from '../../common/logging/app-logger.service';

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
    @Inject(forwardRef(() => AuditRequestsService)) private readonly auditRequests: AuditRequestsService,
    private readonly log: AppLoggerService,
  ) {
    ensureUploadDir();
  }

  /** Records an uploaded file and returns the reference a deliverable stores. */
  create(file: any, viewer: Viewer, meta?: { taskId?: string; milestoneId?: string; purpose?: string }) {
    if (!file) throw new BadRequestException('No file was received. Send it in the "file" field.');

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
    if (!record.taskId) return false;
    const task = this.safe(() => this.tasks.findById(record.taskId));

    // The reviewer engaged on this project is not one of its participants, but
    // auditing the work means opening the files that are the work. Without
    // this they were handed a deliverable they could not download.
    const reviewers = this.safe(() =>
      this.auditRequests
        .findAll({ taskId: record.taskId })
        .map((ar: any) => ar.expertId)
        .filter(Boolean),
    ) || [];

    return canViewTask(viewer.id, viewer.role, task, record.uploadedBy, ...reviewers);
  }

  remove(id: string, viewer: Viewer) {
    const record = this.findById(id);
    const owns = record.uploadedBy && record.uploadedBy === viewer.id;
    if (!owns && !canDeleteAnyFile(viewer.role)) {
      throw new ForbiddenException('Only the person who uploaded a file, or operations staff, can delete it.');
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
