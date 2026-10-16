import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { LedgerRepository } from './ledger.repository';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { TasksModule } from '../tasks/tasks.module';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';
import { AdminAuditMiddleware } from '../../common/middleware/admin-audit.middleware';

@Module({
  imports: [forwardRef(() => UsersModule), forwardRef(() => TransactionsModule), forwardRef(() => TasksModule)],
  controllers: [LedgerController],
  providers: [LedgerRepository, LedgerService],
  exports: [LedgerService],
})
export class LedgerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware)
      .forRoutes(LedgerController);
    // Only the platform-wide figures are an admin surface worth auditing;
    // a user reading their own escrow or the public rates is not.
    consumer
      .apply(AdminAuditMiddleware)
      .forRoutes({ path: 'ledger/summary', method: RequestMethod.GET });
  }
}
