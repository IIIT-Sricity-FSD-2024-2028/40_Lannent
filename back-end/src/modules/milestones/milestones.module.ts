import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';
import { MilestonesRepository } from './milestones.repository';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LedgerModule } from '../ledger/ledger.module';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';
import { MoneyTrailMiddleware } from '../../common/middleware/money-trail.middleware';

@Module({
  imports: [
    forwardRef(() => TasksModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => AuditRequestsModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => LedgerModule),
  ],
  controllers: [MilestonesController],
  providers: [MilestonesRepository, MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware, MoneyTrailMiddleware)
      .forRoutes(MilestonesController);
  }
}
