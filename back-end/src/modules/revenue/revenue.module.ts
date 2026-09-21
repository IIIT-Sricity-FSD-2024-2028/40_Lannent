import { Module, forwardRef } from '@nestjs/common';
import { RevenueController } from './revenue.controller';
import { RevenueService } from './revenue.service';
import { LedgerModule } from '../ledger/ledger.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';

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
export class RevenueModule {}
