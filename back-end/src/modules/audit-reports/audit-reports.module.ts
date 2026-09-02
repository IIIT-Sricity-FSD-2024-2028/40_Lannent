import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AuditReportsController } from './audit-reports.controller';
import { AuditReportsService } from './audit-reports.service';
import { AuditReportsRepository } from './audit-reports.repository';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { TasksModule } from '../tasks/tasks.module';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';
import { MoneyTrailMiddleware } from '../../common/middleware/money-trail.middleware';

@Module({
  imports: [forwardRef(() => TasksModule), forwardRef(() => AuditRequestsModule), forwardRef(() => MilestonesModule)],
  controllers: [AuditReportsController],
  providers: [AuditReportsRepository, AuditReportsService],
  exports: [AuditReportsService],
})
export class AuditReportsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware, MoneyTrailMiddleware)
      .forRoutes(AuditReportsController);
  }
}
