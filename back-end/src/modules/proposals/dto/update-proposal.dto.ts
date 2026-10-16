import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** The only edit: whoever sent a pending application or invitation withdraws it. */
export class UpdateProposalDto {
  @ApiProperty({ example: 'withdrawn', enum: ['withdrawn'] })
  @IsIn(['withdrawn'])
  status: string;
}
