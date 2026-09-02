import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';

/**
 * Global so the middleware that already observes every request can record
 * without each feature module importing this one.
 */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}
