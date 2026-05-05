import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ example: 't1' })
  @IsString()
  taskId: string;

  @ApiProperty({ example: 'u1' })
  @IsString()
  senderId: string;

  @ApiProperty({ example: 'u2' })
  @IsString()
  receiverId: string;

  @ApiProperty({ example: 'Hello, how is progress going?' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'James Client' })
  @IsOptional() @IsString()
  senderName?: string;

  @ApiPropertyOptional({ example: 'JC' })
  @IsOptional() @IsString()
  senderAvatar?: string;

  @ApiPropertyOptional({ example: 'linear-gradient(135deg,#6366f1,#4f46e5)' })
  @IsOptional() @IsString()
  senderAvatarColor?: string;
}
