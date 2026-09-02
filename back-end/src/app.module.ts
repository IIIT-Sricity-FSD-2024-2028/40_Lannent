import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { AuditRequestsModule } from './modules/audit-requests/audit-requests.module';
import { AuditReportsModule } from './modules/audit-reports/audit-reports.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ExpertApplicationsModule } from './modules/expert-applications/expert-applications.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MessagesModule } from './modules/messages/messages.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { RevenueModule } from './modules/revenue/revenue.module';
import { SeedModule } from './modules/seed/seed.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggingModule } from './common/logging/logging.module';

@Module({
  imports: [
    LoggingModule,
    UsersModule,
    TasksModule,
    MilestonesModule,
    ProposalsModule,
    AuditRequestsModule,
    AuditReportsModule,
    DisputesModule,
    TransactionsModule,
    ExpertApplicationsModule,
    NotificationsModule,
    MessagesModule,
    LedgerModule,
    RevenueModule,
    SeedModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Order matters: the id has to exist before the first line is written, so
    // RequestIdMiddleware runs first and LoggerMiddleware reads what it set.
    consumer
      .apply(RequestIdMiddleware, LoggerMiddleware)
      // Swagger sits outside the /api prefix and re-fetches its bundle, spec
      // and favicon on every page load — three or four access lines per visit,
      // none of them about the application.
      .exclude(
        { path: 'api-docs', method: RequestMethod.ALL },
        { path: 'api-docs/(.*)', method: RequestMethod.ALL },
        { path: 'api-docs-json', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
