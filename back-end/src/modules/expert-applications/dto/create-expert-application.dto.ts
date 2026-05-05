import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpertApplicationDto {
  @ApiProperty({ example: 'Dr. Jane Smith' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'jane@gmail.com' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ example: 'Expert@123' })
  @IsOptional() @IsString()
  password?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '+1' })
  @IsOptional() @IsString()
  phoneCountry?: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Full-Stack Development' })
  @IsOptional() @IsString()
  expertise?: string;

  @ApiPropertyOptional({ example: '10+' })
  @IsOptional() @IsString()
  experience?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/janesmith' })
  @IsOptional() @IsString()
  linkedin?: string;

  @ApiPropertyOptional({ example: 'https://github.com/janesmith' })
  @IsOptional() @IsString()
  github?: string;

  @ApiPropertyOptional({ example: 'Passionate about code quality...' })
  @IsOptional() @IsString()
  motivation?: string;
}
