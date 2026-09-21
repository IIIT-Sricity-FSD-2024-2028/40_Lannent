import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { ProposalsRepository } from './proposals.repository';
import { TasksModule } from '../tasks/tasks.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { LedgerModule } from '../ledger/ledger.module';
import { MilestonesModule } from '../milestones/milestones.module';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';
import { MoneyTrailMiddleware } from '../../common/middleware/money-trail.middleware';

@Module({
  imports: [
    forwardRef(() => TasksModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => LedgerModule),
    forwardRef(() => MilestonesModule),
  ],
  controllers: [ProposalsController],
  providers: [ProposalsRepository, ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware, MoneyTrailMiddleware)
      .forRoutes(ProposalsController);
  }
}
