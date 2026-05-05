import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: 'u1' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'milestone-approved' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'Milestone "Frontend UI" approved' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ example: 'E-commerce Redesign · 2 min ago' })
  @IsOptional() @IsString()
  subtext?: string;
}
