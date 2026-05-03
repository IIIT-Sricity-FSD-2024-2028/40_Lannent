import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveDisputeDto {
  @ApiProperty({ example: 'u3' })
  @IsString()
  expertId: string;

  @ApiProperty({ example: 'worker-favour', enum: ['worker-favour', 'client-favour', 'split'] })
  @IsString()
  verdict: string;

  @ApiProperty({ example: 'After review, milestone is complete. Releasing escrow.' })
  @IsString()
  resolution: string;
}
