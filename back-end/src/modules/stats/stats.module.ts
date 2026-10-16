import { Module, forwardRef } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { LedgerModule } from '../ledger/ledger.module';
import { DisputesModule } from '../disputes/disputes.module';

/** Public on purpose: the landing pages read it before anyone signs in. */
@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => TasksModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => LedgerModule),
    forwardRef(() => DisputesModule),
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
