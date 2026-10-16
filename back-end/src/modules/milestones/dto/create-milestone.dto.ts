import { IsString, IsOptional, IsIn, MinLength, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMoney } from '../../../common/validation/money';

export class CreateMilestoneDto {
  @ApiProperty({ example: 't1' })
  @IsString()
  taskId: string;

  @ApiProperty({ example: 'UI Design & Wireframes' })
  @IsString() @MinLength(3) @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Complete wireframes for all pages' })
  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: 800 })
  @IsMoney()
  budget: number;

  /** Ignored — a milestone is always payable to the worker hired on its task. */
  @ApiPropertyOptional({ example: 'u5' })
  @IsOptional() @IsString()
  workerId?: string;

  @ApiPropertyOptional({ example: '2026-04-15' })
  @IsOptional() @IsDateString({}, { message: 'dueDate must be a date (YYYY-MM-DD)' })
  dueDate?: string;

  @ApiPropertyOptional({ example: 'High', enum: ['High', 'Medium', 'Low'] })
  @IsOptional() @IsIn(['High', 'Medium', 'Low'])
  priority?: string;
}
