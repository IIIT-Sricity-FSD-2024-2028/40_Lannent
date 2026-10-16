import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { IsMoney } from '../../../common/validation/money';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDisputeDto {
  @ApiProperty({ example: 't1' })
  @IsString()
  taskId: string;

  @ApiPropertyOptional({ example: 'm3' })
  @IsOptional() @IsString()
  milestoneId?: string;

  /** Ignored — the caller raises the dispute. */
  @ApiPropertyOptional({ example: 'u1' })
  @IsOptional() @IsString()
  raisedBy?: string;

  @ApiPropertyOptional({ example: 'James Client' })
  @IsOptional() @IsString()
  raisedByName?: string;

  /** Ignored — always the other party on the project. */
  @ApiPropertyOptional({ example: 'u5' })
  @IsOptional() @IsString()
  againstId?: string;

  @ApiPropertyOptional({ example: 'Sarah Johnson' })
  @IsOptional() @IsString()
  againstName?: string;

  @ApiProperty({ example: 'Incomplete work' })
  @IsString() @MinLength(1) @MaxLength(200)
  reason: string;

  @ApiPropertyOptional({ example: 'The payment endpoints return the wrong format.' })
  @IsOptional() @IsString() @MaxLength(5000)
  details?: string;

  @ApiPropertyOptional({ example: 'Revision of the API responses' })
  @IsOptional() @IsString() @MaxLength(500)
  outcome?: string;

  @ApiPropertyOptional({ example: '₹500' })
  @IsOptional() @IsString()
  amount?: string;

  @ApiPropertyOptional({ example: 'E-commerce Website Redesign' })
  @IsOptional() @IsString()
  project?: string;

  @ApiPropertyOptional({ example: 'Backend Integration' })
  @IsOptional() @IsString()
  milestone?: string;

  @ApiPropertyOptional({ example: 'u3', description: 'The Expert Reviewer the client selected to arbitrate' })
  @IsOptional() @IsString()
  expertId?: string;

  @ApiProperty({ example: 150, description: "What the person raising the dispute offers to pay the reviewer" })
  @IsMoney()
  reviewerFee: number;
}
