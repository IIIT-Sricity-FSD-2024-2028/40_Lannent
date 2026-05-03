import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateExpertApplicationStatusDto {
  @ApiProperty({ example: 'approved', enum: ['approved', 'rejected'] })
  @IsString()
  status: string;

  @ApiProperty({ example: 'u4', description: 'ID of superuser reviewing the application' })
  @IsString()
  reviewedBy: string;
}
