import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * What a client may send when editing a project.
 *
 * `workerId` and `progress` used to be writable here, so any client could
 * assign a worker to any project or mark it 100% done without a single
 * milestone approved. Both are now set only by the lifecycle (a hire, an
 * approval). Ownership, the audit settings, the budget and the currency are
 * fixed at creation — a client who wants a different budget deletes the
 * project and posts it again.
 */
export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, ['clientId', 'auditEnabled', 'auditFee', 'auditDomain', 'auditExpertId', 'milestones', 'currency'] as const),
) {
  @ApiPropertyOptional({ example: 'cancelled', description: 'The only change a client may make is to cancel an open project' })
  @IsOptional() @IsIn(['draft', 'open', 'in-progress', 'completed', 'cancelled'])
  status?: string;
}
