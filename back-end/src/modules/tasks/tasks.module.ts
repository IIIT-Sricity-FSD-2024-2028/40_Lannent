import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { LedgerModule } from '../ledger/ledger.module';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';
import { UsersModule } from '../users/users.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';
import { MoneyTrailMiddleware } from '../../common/middleware/money-trail.middleware';

@Module({
  imports: [
    forwardRef(() => LedgerModule),
    forwardRef(() => AuditRequestsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => MilestonesModule),
    forwardRef(() => ProposalsModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [TasksController],
  providers: [TasksRepository, TasksService],
  exports: [TasksService],
})
export class TasksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware, MoneyTrailMiddleware)
      .forRoutes(TasksController);
  }
}
