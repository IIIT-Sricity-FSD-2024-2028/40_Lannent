import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMilestoneDto {
  @ApiProperty({ example: 't1' })
  @IsString()
  taskId: string;

  @ApiProperty({ example: 'UI Design & Wireframes' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Complete wireframes for all pages' })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ example: 800 })
  @IsNumber()
  @Min(1)
  budget: number;

  @ApiPropertyOptional({ example: 'u5' })
  @IsOptional() @IsString()
  workerId?: string;

  @ApiPropertyOptional({ example: '2026-04-15' })
  @IsOptional() @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'High', enum: ['High', 'Medium', 'Low'] })
  @IsOptional() @IsString()
  priority?: string;
}
