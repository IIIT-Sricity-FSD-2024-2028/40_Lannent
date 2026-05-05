import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WalletDto {
  @ApiProperty({ example: 500, description: 'Amount to add or deduct' })
  @IsNumber()
  @Min(0.01)
  amount: number;
}
