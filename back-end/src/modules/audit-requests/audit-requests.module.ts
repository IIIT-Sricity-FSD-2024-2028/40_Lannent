import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AuditRequestsController } from './audit-requests.controller';
import { AuditRequestsService } from './audit-requests.service';
import { AuditRequestsRepository } from './audit-requests.repository';
import { TasksModule } from '../tasks/tasks.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { UsersModule } from '../users/users.module';
import { DisputesModule } from '../disputes/disputes.module';
import { LedgerModule } from '../ledger/ledger.module';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';
import { MoneyTrailMiddleware } from '../../common/middleware/money-trail.middleware';

@Module({
  imports: [
    forwardRef(() => TasksModule),
    forwardRef(() => MilestonesModule),
    forwardRef(() => UsersModule),
    forwardRef(() => DisputesModule),
    forwardRef(() => LedgerModule),
  ],
  controllers: [AuditRequestsController],
  providers: [AuditRequestsRepository, AuditRequestsService],
  exports: [AuditRequestsService],
})
export class AuditRequestsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware, MoneyTrailMiddleware)
      .forRoutes(AuditRequestsController);
  }
}
