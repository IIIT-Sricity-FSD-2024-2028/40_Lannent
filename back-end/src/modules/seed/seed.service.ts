import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TasksService } from '../tasks/tasks.service';
import { MilestonesService } from '../milestones/milestones.service';
import { ProposalsService } from '../proposals/proposals.service';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';
import { AuditReportsService } from '../audit-reports/audit-reports.service';
import { DisputesService } from '../disputes/disputes.service';
import { TransactionsService } from '../transactions/transactions.service';
import { ExpertApplicationsService } from '../expert-applications/expert-applications.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SeedService {
  constructor(
    @Inject(forwardRef(() => UsersService)) private usersService: UsersService,
    @Inject(forwardRef(() => TasksService)) private tasksService: TasksService,
    @Inject(forwardRef(() => MilestonesService)) private milestonesService: MilestonesService,
    @Inject(forwardRef(() => ProposalsService)) private proposalsService: ProposalsService,
    @Inject(forwardRef(() => AuditRequestsService)) private auditRequestsService: AuditRequestsService,
    @Inject(forwardRef(() => AuditReportsService)) private auditReportsService: AuditReportsService,
    @Inject(forwardRef(() => DisputesService)) private disputesService: DisputesService,
    @Inject(forwardRef(() => TransactionsService)) private transactionsService: TransactionsService,
    @Inject(forwardRef(() => ExpertApplicationsService)) private expertApplicationsService: ExpertApplicationsService,
    @Inject(forwardRef(() => NotificationsService)) private notificationsService: NotificationsService,
  ) {}

  resetAll() {
    this.usersService.resetToSeed();
    this.tasksService.resetToSeed();
    this.milestonesService.resetToSeed();
    this.proposalsService.resetToSeed();
    this.auditRequestsService.resetToSeed();
    this.auditReportsService.resetToSeed();
    this.disputesService.resetToSeed();
    this.transactionsService.resetToSeed();
    this.expertApplicationsService.resetToSeed();
    this.notificationsService.resetToSeed();
  }
}
