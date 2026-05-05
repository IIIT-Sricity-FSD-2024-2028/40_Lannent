import { Module, forwardRef } from '@nestjs/common';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';
import { AuditReportsModule } from '../audit-reports/audit-reports.module';
import { DisputesModule } from '../disputes/disputes.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ExpertApplicationsModule } from '../expert-applications/expert-applications.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => TasksModule),
    forwardRef(() => MilestonesModule),
    forwardRef(() => ProposalsModule),
    forwardRef(() => AuditRequestsModule),
    forwardRef(() => AuditReportsModule),
    forwardRef(() => DisputesModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => ExpertApplicationsModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
