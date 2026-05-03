import { Module, forwardRef } from '@nestjs/common';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { TasksModule } from '../tasks/tasks.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [forwardRef(() => TasksModule), forwardRef(() => TransactionsModule)],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
