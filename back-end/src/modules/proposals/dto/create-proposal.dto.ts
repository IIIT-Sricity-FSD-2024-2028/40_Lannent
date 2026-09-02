import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProposalDto {
  @ApiProperty({ example: 't3' })
  @IsString()
  taskId: string;

  @ApiProperty({ example: 'u5' })
  @IsString()
  workerId: string;

  @ApiPropertyOptional({ example: 'Sarah Johnson' })
  @IsOptional() @IsString()
  workerName?: string;

  @ApiPropertyOptional({ example: 'SJ' })
  @IsOptional() @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: 'linear-gradient(135deg,#6366f1,#4f46e5)' })
  @IsOptional() @IsString()
  avatarColor?: string;

  @ApiPropertyOptional({ example: 4.9 })
  @IsOptional() @IsNumber()
  rating?: number;

  @ApiPropertyOptional({ example: 127 })
  @IsOptional() @IsNumber()
  reviewCount?: number;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  @IsOptional() @IsString()
  location?: string;

  @ApiPropertyOptional({ example: '$1,100' })
  @IsOptional() @IsString()
  bidPrice?: string;

  @ApiPropertyOptional({ example: '1 week' })
  @IsOptional() @IsString()
  timeline?: string;

  @ApiPropertyOptional({ example: 'I can deliver clean code...' })
  @IsOptional() @IsString()
  coverLetter?: string;

  @ApiPropertyOptional({ example: ['Node.js', 'REST API'] })
  @IsOptional() @IsArray()
  skills?: string[];

  @ApiPropertyOptional({ example: 89 })
  @IsOptional() @IsNumber()
  completedProjects?: number;

  @ApiPropertyOptional({ example: 98 })
  @IsOptional() @IsNumber()
  successRate?: number;

  @ApiPropertyOptional({ example: '$85/hr' })
  @IsOptional() @IsString()
  hourlyRate?: string;

  @ApiPropertyOptional({ example: 'Within 2 hours' })
  @IsOptional() @IsString()
  responseTime?: string;

  @ApiPropertyOptional({ example: 'proposal', enum: ['proposal', 'invitation'] })
  @IsOptional() @IsString()
  type?: string;
}
