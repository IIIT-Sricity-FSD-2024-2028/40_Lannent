import { IsString, IsOptional, MaxLength } from 'class-validator';
import { IsMoney } from '../../../common/validation/money';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty({ example: 300, description: 'Proposed fee for the audit, in INR' })
  @IsMoney()
  amount: number;

  /** Ignored — the side is worked out from who is calling. Kept so older clients still validate. */
  @ApiPropertyOptional({ example: 'client', enum: ['client', 'expert'] })
  @IsOptional() @IsString()
  offeredBy?: string;

  @ApiPropertyOptional({ example: 'Covers the payment flow and the auth model.' })
  @IsOptional() @IsString() @MaxLength(1000)
  note?: string;
}

export class AcceptAuditDto {
  /** Ignored for an expert (it is the caller); required when staff assign one. */
  @ApiPropertyOptional({ example: 'u3', description: 'Expert taking the engagement' })
  @IsOptional() @IsString()
  expertId?: string;
}

export class DeclineAuditDto {
  @ApiPropertyOptional({ example: 'Outside my domain.' })
  @IsOptional() @IsString()
  reason?: string;
}

export class ReassignAuditDto {
  @ApiProperty({ example: 'u9', description: 'The Expert Reviewer to ask instead' })
  @IsString()
  expertId: string;

  @ApiProperty({ example: 200, description: 'Your opening offer for their fee' })
  @IsMoney()
  openingOffer: number;
}
