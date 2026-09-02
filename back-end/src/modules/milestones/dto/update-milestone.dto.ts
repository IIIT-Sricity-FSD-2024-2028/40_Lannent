import { PartialType } from '@nestjs/swagger';
import { CreateMilestoneDto } from './create-milestone.dto';
import { IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {
  @ApiPropertyOptional({ example: 'in-progress', enum: ['pending', 'in-progress', 'submitted', 'review', 'completed', 'approved', 'disputed', 'audit-passed', 'revision-needed'] })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional() @IsNumber()
  progress?: number;
}

export class SubmitDeliverableDto {
  @ApiPropertyOptional({ example: { title: 'Deliverable v1', description: 'Final version', link: 'https://github.com/...' } })
  @IsOptional() @IsObject()
  deliverable?: any;
}
