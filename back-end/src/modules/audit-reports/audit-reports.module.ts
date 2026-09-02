import { Module, forwardRef } from '@nestjs/common';
import { AuditReportsController } from './audit-reports.controller';
import { AuditReportsService } from './audit-reports.service';
import { AuditReportsRepository } from './audit-reports.repository';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [forwardRef(() => TasksModule), forwardRef(() => AuditRequestsModule), forwardRef(() => MilestonesModule)],
  controllers: [AuditReportsController],
  providers: [AuditReportsRepository, AuditReportsService],
  exports: [AuditReportsService],
})
export class AuditReportsModule {}
