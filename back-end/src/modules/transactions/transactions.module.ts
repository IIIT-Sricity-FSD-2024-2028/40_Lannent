import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';
import { MoneyTrailMiddleware } from '../../common/middleware/money-trail.middleware';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsRepository, TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware, MoneyTrailMiddleware)
      .forRoutes(TransactionsController);
  }
}
