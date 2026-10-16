import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * A worker applying to an open project, or a client inviting a worker to
 * theirs. There is no price: it is always the project's posted budget.
 */
export class CreateProposalDto {
  @ApiProperty({ example: 't3' })
  @IsString()
  taskId: string;

  /** The worker being invited. Ignored when a worker applies — they apply as themselves. */
  @ApiPropertyOptional({ example: 'u5', description: 'The worker being invited (clients only)' })
  @IsOptional() @IsString()
  workerId?: string;

  @ApiPropertyOptional({ example: 'Your Stripe work looked like a great fit for this.' })
  @IsOptional() @IsString() @MaxLength(2000)
  message?: string;
}
