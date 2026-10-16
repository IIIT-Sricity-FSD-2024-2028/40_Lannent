import { IsString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveDisputeDto {
  /** Ignored — the verdict is given by the assigned reviewer, who is the caller. */
  @ApiPropertyOptional({ example: 'u3' })
  @IsOptional() @IsString()
  expertId?: string;

  /**
   * worker-favour — the milestone is accepted and its escrow paid to the worker.
   * client-favour — the milestone goes back to the worker's To Do list to be
   *                 reworked against the reviewer's notes; its escrow stays put.
   */
  @ApiProperty({ example: 'worker-favour', enum: ['worker-favour', 'client-favour'] })
  @IsIn(['worker-favour', 'client-favour'], { message: 'The verdict must be worker-favour or client-favour.' })
  verdict: string;

  @ApiProperty({ example: 'After review, milestone is complete. Releasing escrow.' })
  @IsString() @MinLength(20, { message: 'Explain the verdict in at least 20 characters — both parties read it.' }) @MaxLength(5000)
  resolution: string;
}
