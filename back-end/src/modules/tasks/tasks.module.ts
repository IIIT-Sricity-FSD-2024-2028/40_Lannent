import { Module, forwardRef } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { LedgerModule } from '../ledger/ledger.module';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';

@Module({
  imports: [forwardRef(() => LedgerModule), forwardRef(() => AuditRequestsModule)],
  controllers: [TasksController],
  providers: [TasksRepository, TasksService],
  exports: [TasksService],
})
export class TasksModule {}
