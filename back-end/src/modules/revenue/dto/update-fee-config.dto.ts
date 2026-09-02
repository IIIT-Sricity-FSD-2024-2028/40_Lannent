import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Every rate the Admin can tune. Omitted fields are left unchanged.
 * Bounds are deliberately generous but finite — a negative rate would pay
 * users to transact, and a rate above 100% would take more than the amount.
 */
export class UpdateFeeConfigDto {
  @ApiPropertyOptional({ example: 2.9, description: 'Card processing percentage on deposits' })
  @IsOptional() @IsNumber() @Min(0) @Max(100)
  depositPercent?: number;

  @ApiPropertyOptional({ example: 0.3, description: 'Fixed card processing fee on deposits' })
  @IsOptional() @IsNumber() @Min(0) @Max(1000)
  depositFixed?: number;

  @ApiPropertyOptional({ example: 5, description: 'Client marketplace fee percentage' })
  @IsOptional() @IsNumber() @Min(0) @Max(100)
  clientMarketplacePercent?: number;

  @ApiPropertyOptional({ example: 10, description: 'Expert commission percentage' })
  @IsOptional() @IsNumber() @Min(0) @Max(100)
  expertServicePercent?: number;

  @ApiPropertyOptional({ example: 0.25, description: 'Withdrawal payout percentage' })
  @IsOptional() @IsNumber() @Min(0) @Max(100)
  withdrawalPercent?: number;

  @ApiPropertyOptional({ example: 0.25, description: 'Fixed withdrawal payout fee' })
  @IsOptional() @IsNumber() @Min(0) @Max(1000)
  withdrawalFixed?: number;

  @ApiPropertyOptional({ example: [20, 10, 5], description: 'Worker service fee tiers, highest band first' })
  @IsOptional()
  workerServicePercents?: number[];

  @ApiPropertyOptional({ example: [0.99, 4.99, 9.99, 14.99], description: 'Contract initiation fees by budget band' })
  @IsOptional()
  contractInitiationFees?: number[];
}
