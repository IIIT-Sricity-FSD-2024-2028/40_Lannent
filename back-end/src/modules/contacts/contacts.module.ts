import { Module, forwardRef } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { TasksModule } from '../tasks/tasks.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';
import { DisputesModule } from '../disputes/disputes.module';

@Module({
  imports: [
    forwardRef(() => TasksModule),
    forwardRef(() => ProposalsModule),
    forwardRef(() => AuditRequestsModule),
    forwardRef(() => DisputesModule),
  ],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
