import { Module, forwardRef } from '@nestjs/common';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';
import { MilestonesRepository } from './milestones.repository';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    forwardRef(() => TasksModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => AuditRequestsModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [MilestonesController],
  providers: [MilestonesRepository, MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule {}
