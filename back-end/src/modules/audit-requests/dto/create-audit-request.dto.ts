import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditRequestDto {
  @ApiProperty({ example: 't2' })
  @IsString()
  taskId: string;

  @ApiPropertyOptional({ example: 'm6', description: 'Omitted for a whole-project or dispute audit' })
  @IsOptional() @IsString()
  milestoneId?: string;

  @ApiPropertyOptional({ example: 'u6' })
  @IsOptional() @IsString()
  workerId?: string;

  @ApiProperty({ example: 'u1' })
  @IsString()
  clientId: string;

  @ApiPropertyOptional({ example: 'u3' })
  @IsOptional() @IsString()
  expertId?: string;

  @ApiPropertyOptional({ example: 'Pending' })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'High' })
  @IsOptional() @IsString()
  severity?: string;

  @ApiPropertyOptional({ example: 'Mobile App Development' })
  @IsOptional() @IsString()
  project?: string;

  @ApiPropertyOptional({ example: 'Michael Chen' })
  @IsOptional() @IsString()
  worker?: string;

  @ApiPropertyOptional({ example: 'Core UI Implementation' })
  @IsOptional() @IsString()
  milestone?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional() @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'project-audit', enum: ['project-audit', 'dispute-audit'] })
  @IsOptional() @IsString()
  kind?: string;

  @ApiPropertyOptional({ example: 'd1', description: 'Set when the audit was raised by a dispute' })
  @IsOptional() @IsString()
  disputeId?: string;

  @ApiPropertyOptional({ example: 250, description: 'Opening offer from the client' })
  @IsOptional() @IsNumber()
  openingOffer?: number;

  @ApiPropertyOptional({ example: 'Web Development', description: 'Task category, used to check the reviewer covers this domain' })
  @IsOptional() @IsString()
  category?: string;
}
