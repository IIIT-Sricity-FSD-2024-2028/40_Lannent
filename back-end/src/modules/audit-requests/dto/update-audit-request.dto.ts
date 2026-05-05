import { PartialType } from '@nestjs/swagger';
import { CreateAuditRequestDto } from './create-audit-request.dto';

export class UpdateAuditRequestDto extends PartialType(CreateAuditRequestDto) {}
