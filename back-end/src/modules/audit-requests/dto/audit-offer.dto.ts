import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty({ example: 300, description: 'Proposed fee for the audit, in USD' })
  @IsNumber() @Min(1)
  amount: number;

  @ApiProperty({ example: 'client', enum: ['client', 'expert'] })
  @IsString()
  offeredBy: string;

  @ApiPropertyOptional({ example: 'Covers the payment flow and the auth model.' })
  @IsOptional() @IsString()
  note?: string;
}

export class AcceptAuditDto {
  @ApiProperty({ example: 'u3', description: 'Expert taking the engagement' })
  @IsString()
  expertId: string;
}

export class DeclineAuditDto {
  @ApiPropertyOptional({ example: 'Outside my domain.' })
  @IsOptional() @IsString()
  reason?: string;
}
