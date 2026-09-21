import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksRepository } from './tasks.repository';
import { LedgerService } from '../ledger/ledger.service';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';

/**
 * TasksService — Business Logic Layer
 *
 * Handles validation and error handling.
 * Delegates all data-access operations to TasksRepository.
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    @Inject(forwardRef(() => LedgerService)) private ledger: LedgerService,
    @Inject(forwardRef(() => AuditRequestsService)) private auditRequests: AuditRequestsService,
  ) {}

  findAll(query?: { clientId?: string; workerId?: string; status?: string; viewerId?: string }) {
    const { viewerId, ...filters } = query || {};
    const tasks = this.tasksRepository.findAll(filters);

    // A draft is an audit-gated project that has not gone live yet. It stays out
    // of browse listings, but its own client must still be able to see it —
    // otherwise they cannot track or cancel a project they just created.
    if (filters.status || filters.clientId) return tasks;
    return tasks.filter(t => t.status !== 'draft' || (viewerId && t.clientId === viewerId));
  }

  findById(id: string) {
    const task = this.tasksRepository.findById(id);
    if (!task) throw new NotFoundException(`Task with id "${id}" not found`);
    return task;
  }

  create(dto: CreateTaskDto) {
    // A project that requires a technical audit is not fully created until an
    // expert has accepted and their fee is in escrow. Until then it is a draft:
    // invisible in browse listings and un-hireable.
    const task = {
      id: this.tasksRepository.generateId(),
      status: dto.auditEnabled ? 'draft' : 'open',
      progress: 0,
      workerId: null,
      createdAt: new Date().toISOString().slice(0, 10),
      currency: dto.currency || 'USD',
      skills: dto.skills || [],
      auditEnabled: dto.auditEnabled || false,
      ...dto,
    };
    this.tasksRepository.insert(task);

    // An audited project opens its expert engagement immediately, carrying the
    // client's opening offer. The project stays a draft until an expert accepts.
    if (task.auditEnabled) {
      // The client must name the reviewer. Without one the engagement belongs to
      // nobody, so no reviewer can ever see it and the project stays a draft
      // forever.
      if (!dto.auditExpertId) {
        this.tasksRepository.update(task.id, { status: 'cancelled' });
        throw new BadRequestException(
          'Select an Expert Reviewer for the technical audit before publishing.',
        );
      }
      try {
        this.auditRequests.create({
          kind: 'project-audit',
          taskId: task.id,
          clientId: task.clientId,
          // The client picks one reviewer; only they can see this engagement.
          expertId: dto.auditExpertId,
          category: task.category,
          severity: 'Medium',
          project: task.title,
          status: 'preview-sent',
          openingOffer: dto.auditFee,
          dueDate: task.deadline,
        });
      } catch (e) {
        // An invalid reviewer must not leave a draft with no engagement.
        this.tasksRepository.update(task.id, { status: 'cancelled' });
        throw e;
      }
    }

    return this.tasksRepository.findById(task.id);
  }

  /** Releases a draft project once its audit is funded and accepted. */
  publishDraft(id: string) {
    const task = this.findById(id);
    if (task.status !== 'draft') return task;
    task.status = 'open';
    return task;
  }

  update(id: string, dto: UpdateTaskDto) {
    const existing = this.tasksRepository.findById(id);
    if (!existing) throw new NotFoundException(`Task with id "${id}" not found`);

    // A draft project is gated on its technical audit. Publishing it is the job
    // of publishDraft(), which only runs once a reviewer has accepted and the
    // fee is in escrow — a plain status update must not be able to skip that.
    if (existing.status === 'draft' && dto.status && dto.status !== 'draft' && dto.status !== 'cancelled') {
      throw new BadRequestException(
        'This project is awaiting its technical audit. It goes live once a reviewer accepts the audit.',
      );
    }

    const updated = this.tasksRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Task with id "${id}" not found`);
    return updated;
  }

  /**
   * Abandons a draft project and returns any audit escrow to the client.
   * Used when the client gives up before an expert accepts.
   */
  cancelDraft(id: string) {
    const task = this.findById(id);
    if (task.status !== 'draft') {
      throw new BadRequestException('Only a draft project can be cancelled this way.');
    }
    const held = this.ledger.getEscrow(id);
    let refund: any = null;
    if (held.auditHeld > 0) {
      refund = this.ledger.refundAuditEscrow({
        taskId: id,
        clientId: task.clientId,
        amount: held.auditHeld,
        reason: `Draft project cancelled — ${task.title}`,
      });
    }
    task.status = 'cancelled';
    return { task, refund };
  }

  delete(id: string) {
    const deleted = this.tasksRepository.deleteById(id);
    if (!deleted) throw new NotFoundException(`Task with id "${id}" not found`);
    return { deleted: true };
  }

  resetToSeed() {
    this.tasksRepository.resetToSeed();
  }
}
