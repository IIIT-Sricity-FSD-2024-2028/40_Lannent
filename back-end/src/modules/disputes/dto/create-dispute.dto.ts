import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDisputeDto {
  @ApiProperty({ example: 't1' })
  @IsString()
  taskId: string;

  @ApiPropertyOptional({ example: 'm3' })
  @IsOptional() @IsString()
  milestoneId?: string;

  @ApiProperty({ example: 'u1' })
  @IsString()
  raisedBy: string;

  @ApiPropertyOptional({ example: 'James Client' })
  @IsOptional() @IsString()
  raisedByName?: string;

  @ApiProperty({ example: 'u5' })
  @IsString()
  againstId: string;

  @ApiPropertyOptional({ example: 'Sarah Johnson' })
  @IsOptional() @IsString()
  againstName?: string;

  @ApiProperty({ example: 'Backend integration incomplete' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: '$500' })
  @IsOptional() @IsString()
  amount?: string;

  @ApiPropertyOptional({ example: 'E-commerce Website Redesign' })
  @IsOptional() @IsString()
  project?: string;

  @ApiPropertyOptional({ example: 'Backend Integration' })
  @IsOptional() @IsString()
  milestone?: string;
}
