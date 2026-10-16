import { IsString, IsOptional, IsNumber, IsIn, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditReportDto {
  @ApiProperty({ example: 'ar1' })
  @IsString()
  auditRequestId: string;

  /** Ignored — taken from the engagement. */
  @ApiPropertyOptional({ example: 't2' })
  @IsOptional() @IsString()
  taskId?: string;

  @ApiPropertyOptional({ example: 'm6', description: 'Omitted for a whole-project or dispute audit' })
  @IsOptional() @IsString()
  milestoneId?: string;

  /** Ignored — the assigned reviewer files the report. */
  @ApiPropertyOptional({ example: 'u3' })
  @IsOptional() @IsString()
  expertId?: string;

  /** Filing a report is what pays the reviewer, so it has to say something. */
  @ApiProperty({ example: 'pass', enum: ['pass', 'fail', 'conditional'] })
  @IsIn(['pass', 'fail', 'conditional'], { message: 'Choose a verdict: pass, fail or conditional.' })
  verdict: string;

  @ApiPropertyOptional({ example: 'Pass' })
  @IsOptional() @IsString()
  overall?: string;

  @ApiProperty({ example: 'Code quality is excellent. Auth flows follow OWASP guidance.' })
  @IsString() @MinLength(50, { message: 'Write your findings in at least 50 characters.' }) @MaxLength(20000)
  findings: string;

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
