import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAuditRequestDto } from './dto/create-audit-request.dto';
import { UpdateAuditRequestDto } from './dto/update-audit-request.dto';
import { AuditRequestsRepository } from './audit-requests.repository';

/**
 * AuditRequestsService — Business Logic Layer
 *
 * Handles validation and error handling.
 * Delegates all data-access operations to AuditRequestsRepository.
 */
@Injectable()
export class AuditRequestsService {
  constructor(private readonly auditRequestsRepository: AuditRequestsRepository) {}

  findAll(query?: { expertId?: string; status?: string }) {
    return this.auditRequestsRepository.findAll(query);
  }

  findById(id: string) {
    const ar = this.auditRequestsRepository.findById(id);
    if (!ar) throw new NotFoundException(`Audit request with id "${id}" not found`);
    return ar;
  }

  create(dto: CreateAuditRequestDto) {
    const ar = {
      id: this.auditRequestsRepository.generateId(),
      status: dto.status || 'Pending',
      severity: dto.severity || 'Medium',
      createdAt: new Date().toISOString().slice(0, 10),
      expertId: dto.expertId || null,
      ...dto,
    };
    return this.auditRequestsRepository.insert(ar);
  }

  update(id: string, dto: UpdateAuditRequestDto) {
    const updated = this.auditRequestsRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Audit request with id "${id}" not found`);
    return updated;
  }

  resetToSeed() {
    this.auditRequestsRepository.resetToSeed();
  }
}
