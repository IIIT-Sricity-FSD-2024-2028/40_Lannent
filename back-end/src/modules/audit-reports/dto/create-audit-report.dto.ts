import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditReportDto {
  @ApiProperty({ example: 'ar1' })
  @IsString()
  auditRequestId: string;

  @ApiProperty({ example: 't2' })
  @IsString()
  taskId: string;

  @ApiProperty({ example: 'm6' })
  @IsString()
  milestoneId: string;

  @ApiProperty({ example: 'u3' })
  @IsString()
  expertId: string;

  @ApiPropertyOptional({ example: 'pass', enum: ['pass', 'fail', 'conditional'] })
  @IsOptional() @IsString()
  verdict?: string;

  @ApiPropertyOptional({ example: 'Pass' })
  @IsOptional() @IsString()
  overall?: string;

  @ApiPropertyOptional({ example: 'Code quality is excellent.' })
  @IsOptional() @IsString()
  findings?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional() @IsNumber() @Min(0) @Max(5)
  codequality?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional() @IsNumber() @Min(0) @Max(5)
  security?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional() @IsNumber() @Min(0) @Max(5)
  performance?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional() @IsNumber() @Min(0) @Max(5)
  documentation?: number;

  @ApiPropertyOptional({ example: 'Core UI Implementation' })
  @IsOptional() @IsString()
  milestoneTitle?: string;

  @ApiPropertyOptional({ example: 'Mobile App Development' })
  @IsOptional() @IsString()
  projectTitle?: string;

  @ApiPropertyOptional({ example: 'Michael Chen' })
  @IsOptional() @IsString()
  workerName?: string;
}
