import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({ example: 'in-progress', enum: ['open', 'in-progress', 'under-review', 'completed', 'cancelled'] })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'u5' })
  @IsOptional() @IsString()
  workerId?: string;

  @ApiPropertyOptional({ example: 75 })
  @IsOptional() @IsNumber() @Min(0) @Max(100)
  progress?: number;
}
