import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAuditRequestDto } from './create-audit-request.dto';

/**
 * Status is deliberately not updatable here. The engagement moves through its
 * lifecycle via the /offers, /fund, /accept and /decline endpoints, each of
 * which enforces the transition it owns; a free-form status write would let a
 * caller skip straight past those guards.
 */
export class UpdateAuditRequestDto extends PartialType(
  OmitType(CreateAuditRequestDto, ['status', 'kind', 'clientId', 'taskId'] as const),
) {}
