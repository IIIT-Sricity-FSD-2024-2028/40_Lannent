import { Injectable, NotFoundException } from '@nestjs/common';
import { SEED_AUDIT_REQUESTS } from '../seed/seed.data';
import { CreateAuditRequestDto } from './dto/create-audit-request.dto';
import { UpdateAuditRequestDto } from './dto/update-audit-request.dto';

@Injectable()
export class AuditRequestsService {
  private auditRequests: any[] = JSON.parse(JSON.stringify(SEED_AUDIT_REQUESTS));
  private counter = 100;

  private generateId(): string {
    return 'ar_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { expertId?: string; status?: string }) {
    let result = this.auditRequests;
    if (query?.expertId) result = result.filter(a => a.expertId === query.expertId);
    if (query?.status) result = result.filter(a => a.status === query.status);
    return result;
  }

  findById(id: string) {
    const ar = this.auditRequests.find(a => a.id === id);
    if (!ar) throw new NotFoundException(`Audit request with id "${id}" not found`);
    return ar;
  }

  create(dto: CreateAuditRequestDto) {
    const ar = {
      id: this.generateId(),
      status: dto.status || 'Pending',
      severity: dto.severity || 'Medium',
      createdAt: new Date().toISOString().slice(0, 10),
      expertId: dto.expertId || null,
      ...dto,
    };
    this.auditRequests.push(ar);
    return ar;
  }

  update(id: string, dto: UpdateAuditRequestDto) {
    const idx = this.auditRequests.findIndex(a => a.id === id);
    if (idx === -1) throw new NotFoundException(`Audit request with id "${id}" not found`);
    this.auditRequests[idx] = { ...this.auditRequests[idx], ...dto };
    return this.auditRequests[idx];
  }

  resetToSeed() {
    this.auditRequests = JSON.parse(JSON.stringify(SEED_AUDIT_REQUESTS));
  }
}
