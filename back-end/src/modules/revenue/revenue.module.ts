import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { RevenueController } from './revenue.controller';
import { RevenueService } from './revenue.service';
import { LedgerModule } from '../ledger/ledger.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';
import { AdminAuditMiddleware } from '../../common/middleware/admin-audit.middleware';

@Module({
  imports: [
    forwardRef(() => LedgerModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TasksModule),
    forwardRef(() => AuditRequestsModule),
  ],
  controllers: [RevenueController],
  providers: [RevenueService],
  exports: [RevenueService],
})
export class RevenueModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware, AdminAuditMiddleware)
      .forRoutes(RevenueController);
  }
}
