import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';
import { AuditReportsModule } from '../audit-reports/audit-reports.module';
import { DisputesModule } from '../disputes/disputes.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ExpertApplicationsModule } from '../expert-applications/expert-applications.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LedgerModule } from '../ledger/ledger.module';
import { FilesModule } from '../files/files.module';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';
import { AdminAuditMiddleware } from '../../common/middleware/admin-audit.middleware';
import { SeedGuardMiddleware } from '../../common/middleware/seed-guard.middleware';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => TasksModule),
    forwardRef(() => MilestonesModule),
    forwardRef(() => ProposalsModule),
    forwardRef(() => AuditRequestsModule),
    forwardRef(() => AuditReportsModule),
    forwardRef(() => DisputesModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => ExpertApplicationsModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => LedgerModule),
    forwardRef(() => FilesModule),
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware, AdminAuditMiddleware, SeedGuardMiddleware)
      .forRoutes(SeedController);
  }
}
