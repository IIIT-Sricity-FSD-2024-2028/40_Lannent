import { IsString, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FileRefDto } from '../../milestones/dto/update-milestone.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ example: 't1' })
  @IsString()
  taskId: string;

  /** Ignored — messages are sent as the caller. */
  @ApiPropertyOptional({ example: 'u1' })
  @IsOptional() @IsString()
  senderId?: string;

  @ApiProperty({ example: 'u2' })
  @IsString()
  receiverId: string;

  @ApiProperty({ example: 'Hello, how is progress going?' })
  @IsOptional() @IsString() @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({ type: FileRefDto, description: 'A file uploaded to this project, shared in the chat' })
  @IsOptional() @ValidateNested() @Type(() => FileRefDto)
  attachment?: FileRefDto;

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
