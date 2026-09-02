import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { DisputesRepository } from './disputes.repository';
import { MilestonesModule } from '../milestones/milestones.module';
import { TasksModule } from '../tasks/tasks.module';
import { LedgerModule } from '../ledger/ledger.module';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';
import { MoneyTrailMiddleware } from '../../common/middleware/money-trail.middleware';

@Module({
  imports: [
    forwardRef(() => MilestonesModule),
    forwardRef(() => TasksModule),
    forwardRef(() => LedgerModule),
    forwardRef(() => AuditRequestsModule),
  ],
  controllers: [DisputesController],
  providers: [DisputesRepository, DisputesService],
  exports: [DisputesService],
})
export class DisputesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware, MoneyTrailMiddleware)
      .forRoutes(DisputesController);
  }
}
