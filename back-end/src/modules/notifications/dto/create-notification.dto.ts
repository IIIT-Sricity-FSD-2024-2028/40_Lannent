import { IsString, IsOptional, Matches } from 'class-validator';
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

  @ApiPropertyOptional({ example: '/client-my-projects', description: 'In-app page the notification opens' })
  @IsOptional() @IsString() @Matches(/^\/[\w\-/?=&.%]*$/, { message: 'link must be an in-app path' })
  link?: string;
}
