import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({
    example: 'escrow-lock',
    enum: [
      'escrow-lock', 'milestone-release', 'deposit', 'withdrawal', 'refund',
      'dispute-release', 'audit-escrow-lock', 'audit-release', 'platform-fee',
    ],
  })
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

  // ── Fee breakdown (written by LedgerService) ───────────────────────────────

  @ApiPropertyOptional({ example: 2634.99, description: 'Total charged before fees were split out' })
  @IsOptional() @IsNumber()
  grossAmount?: number;

  @ApiPropertyOptional({ example: 134.99, description: 'Platform fee taken from this movement' })
  @IsOptional() @IsNumber()
  feeAmount?: number;

  @ApiPropertyOptional({ example: 2500, description: 'What the counterparty actually received' })
  @IsOptional() @IsNumber()
  netAmount?: number;

  @ApiPropertyOptional({ example: 'worker-service' })
  @IsOptional() @IsString()
  feeType?: string;

  @ApiPropertyOptional({ example: 'ar1', description: 'Set on audit escrow and payout rows' })
  @IsOptional() @IsString()
  auditRequestId?: string;
}
