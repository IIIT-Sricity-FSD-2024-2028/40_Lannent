import { Module, forwardRef } from '@nestjs/common';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { ProposalsRepository } from './proposals.repository';
import { TasksModule } from '../tasks/tasks.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [forwardRef(() => TasksModule), forwardRef(() => TransactionsModule)],
  controllers: [ProposalsController],
  providers: [ProposalsRepository, ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
