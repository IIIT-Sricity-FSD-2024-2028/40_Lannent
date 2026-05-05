import { IsEmail, IsString, IsOptional, IsNumber, IsArray, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'client', enum: ['client', 'worker', 'expert', 'superuser'] })
  @IsIn(['client', 'worker', 'expert', 'superuser'])
  role: string;

  @ApiPropertyOptional({ example: 'JD' })
  @IsOptional() @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: 'linear-gradient(135deg,#6366f1,#4f46e5)' })
  @IsOptional() @IsString()
  avatarColor?: string;

  @ApiPropertyOptional({ example: 'TechCorp' })
  @IsOptional() @IsString()
  company?: string;

  @ApiPropertyOptional({ example: 'New York, NY' })
  @IsOptional() @IsString()
  location?: string;

  @ApiPropertyOptional({ example: ['React', 'Node.js'] })
  @IsOptional() @IsArray()
  skills?: string[];

  @ApiPropertyOptional({ example: 'Full-Stack & Security' })
  @IsOptional() @IsString()
  specialization?: string;
}
