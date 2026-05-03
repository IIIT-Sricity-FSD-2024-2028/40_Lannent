import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsIn, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ example: 'E-commerce Website Redesign' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Need a complete redesign of our platform' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'Web Development' })
  @IsString()
  category: string;

  @ApiProperty({ example: 2500 })
  @IsNumber()
  @Min(1)
  budget: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional() @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '2026-04-15' })
  @IsOptional() @IsString()
  deadline?: string;

  @ApiPropertyOptional({ example: ['React', 'Figma'] })
  @IsOptional() @IsArray()
  skills?: string[];

  @ApiProperty({ example: 'u1' })
  @IsString()
  clientId: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean()
  auditEnabled?: boolean;
}
