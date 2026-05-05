import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ example: 'escrow-lock', enum: ['escrow-lock', 'milestone-release', 'deposit', 'refund', 'dispute-release'] })
  @IsString()
  type: string;

  @ApiProperty({ example: 2500 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'u1' })
  @IsString()
  fromId: string;

  @ApiProperty({ example: 'escrow' })
  @IsString()
  toId: string;

  @ApiPropertyOptional({ example: 't1' })
  @IsOptional() @IsString()
  taskId?: string;

  @ApiPropertyOptional({ example: 'm1' })
  @IsOptional() @IsString()
  milestoneId?: string;

  @ApiPropertyOptional({ example: 'Escrow funded for project' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'completed' })
  @IsOptional() @IsString()
  status?: string;
}
