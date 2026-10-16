import { ApiProperty } from '@nestjs/swagger';
import { IsMoney } from '../../../common/validation/money';

export class WalletDto {
  @ApiProperty({ example: 500, description: 'Amount to add or withdraw (whole paise, up to ₹10,00,000)' })
  @IsMoney(0.01)
  amount: number;
}
