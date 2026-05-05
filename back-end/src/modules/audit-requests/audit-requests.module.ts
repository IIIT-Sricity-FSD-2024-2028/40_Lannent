import { Module } from '@nestjs/common';
import { AuditRequestsController } from './audit-requests.controller';
import { AuditRequestsService } from './audit-requests.service';
import { AuditRequestsRepository } from './audit-requests.repository';

@Module({
  controllers: [AuditRequestsController],
  providers: [AuditRequestsRepository, AuditRequestsService],
  exports: [AuditRequestsService],
})
export class AuditRequestsModule {}
