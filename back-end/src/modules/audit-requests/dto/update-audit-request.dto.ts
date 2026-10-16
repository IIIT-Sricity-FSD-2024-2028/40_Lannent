import { PickType, PartialType } from '@nestjs/swagger';
import { CreateAuditRequestDto } from './create-audit-request.dto';

/**
 * Descriptive fields only.
 *
 * Status moves through /offers, /fund, /accept and /decline, each of which
 * enforces the transition it owns. The reviewer, worker, milestone and
 * dispute links are set by the platform: `expertId` used to be writable here,
 * so a reviewer could put themselves on another reviewer's funded engagement.
 */
export class UpdateAuditRequestDto extends PartialType(
  PickType(CreateAuditRequestDto, ['severity', 'dueDate', 'project', 'worker', 'milestone'] as const),
) {}
