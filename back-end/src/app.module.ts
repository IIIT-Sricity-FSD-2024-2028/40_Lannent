import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
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
import { SeedModule } from './modules/seed/seed.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
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
    SeedModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
