import { Module } from '@nestjs/common';
import { AuditRequestsController } from './audit-requests.controller';
import { AuditRequestsService } from './audit-requests.service';

@Module({
  controllers: [AuditRequestsController],
  providers: [AuditRequestsService],
  exports: [AuditRequestsService],
})
export class AuditRequestsModule {}
