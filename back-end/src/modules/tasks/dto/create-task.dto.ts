import {
  IsString, IsOptional, IsArray, IsBoolean, IsIn, MinLength, MaxLength, ArrayMaxSize, IsDateString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CATEGORIES } from '../../../common/constants/categories';
import { IsMoney } from '../../../common/validation/money';

/** A milestone posted together with its project. */
export class InlineMilestoneDto {
  @ApiProperty({ example: 'UI Design & Wireframes' })
  @IsString() @MinLength(3) @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Complete wireframes for all pages' })
  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: 800 })
  @IsMoney()
  budget: number;

  @ApiPropertyOptional({ example: '2026-04-15' })
  @IsOptional() @IsDateString({}, { message: 'dueDate must be a date (YYYY-MM-DD)' })
  dueDate?: string;

  @ApiPropertyOptional({ example: 'High', enum: ['High', 'Medium', 'Low'] })
  @IsOptional() @IsIn(['High', 'Medium', 'Low'])
  priority?: string;
}

export class CreateTaskDto {
  @ApiProperty({ example: 'E-commerce Website Redesign' })
  @IsString() @MinLength(3, { message: 'title must be at least 3 characters' }) @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Need a complete redesign of our platform' })
  @IsString() @MinLength(3, { message: 'description must be at least 3 characters' }) @MaxLength(10000)
  description: string;

  @ApiProperty({ example: 'Web Development', enum: CATEGORIES })
  @IsIn(CATEGORIES as unknown as string[], { message: `category must be one of: ${CATEGORIES.join(', ')}` })
  category: string;

  @ApiProperty({ example: 2500 })
  @IsMoney()
  budget: number;

  /** Every wallet and escrow is held in rupees, so a project is too. */
  @ApiPropertyOptional({ example: 'INR', enum: ['INR'] })
  @IsOptional() @IsIn(['INR'], { message: 'Projects are priced in INR — wallets and escrow are held in rupees.' })
  currency?: string;

  @ApiPropertyOptional({ example: '2026-04-15' })
  @IsOptional() @IsDateString({}, { message: 'deadline must be a date (YYYY-MM-DD)' })
  deadline?: string;

  @ApiPropertyOptional({ example: ['React', 'Figma'] })
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(60, { each: true })
  skills?: string[];

  /** Ignored — the owner is always the client posting it. */
  @ApiPropertyOptional({ example: 'u1' })
  @IsOptional() @IsString()
  clientId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean()
  auditEnabled?: boolean;

  @ApiPropertyOptional({ example: 300, description: 'Opening offer for the technical audit fee' })
  @IsOptional() @IsMoney()
  auditFee?: number;

  @ApiPropertyOptional({ example: 'Web Development', description: 'Expert domain the audit should match' })
  @IsOptional() @IsString()
  auditDomain?: string;

  @ApiPropertyOptional({ example: 'u3', description: 'The Expert Reviewer the client selected for the audit' })
  @IsOptional() @IsString()
  auditExpertId?: string;

  /**
   * The project's milestones, posted in the same request. Checked before any
   * money moves, so a refused milestone never leaves a half-created project
   * that then has to be deleted (which could charge a cancellation fee).
   */
  @ApiPropertyOptional({ type: [InlineMilestoneDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => InlineMilestoneDto)
  milestones?: InlineMilestoneDto[];
}
