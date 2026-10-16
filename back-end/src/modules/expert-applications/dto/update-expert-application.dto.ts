import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateExpertApplicationStatusDto {
  @ApiProperty({ example: 'approved', enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status: string;

  /** Ignored — the decision is recorded against the admin who made it. */
  @ApiPropertyOptional({ example: 'u12' })
  @IsOptional() @IsString()
  reviewedBy?: string;
}
