import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditRequestDto {
  @ApiProperty({ example: 't2' })
  @IsString()
  taskId: string;

  @ApiProperty({ example: 'm6' })
  @IsString()
  milestoneId: string;

  @ApiProperty({ example: 'u6' })
  @IsString()
  workerId: string;

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
}
