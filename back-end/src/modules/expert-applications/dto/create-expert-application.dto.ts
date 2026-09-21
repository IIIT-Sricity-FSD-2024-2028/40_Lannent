import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FileRefDto } from '../../milestones/dto/update-milestone.dto';
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

  @ApiPropertyOptional({ example: 'marta-kovac-cv.pdf', description: 'Filename of the supplied resume' })
  @IsOptional() @IsString()
  resumeName?: string;

  @ApiPropertyOptional({ example: 'aws-cert.pdf' })
  @IsOptional() @IsString()
  certificateName?: string;

  @ApiPropertyOptional({ description: 'Reference to the uploaded résumé in the file store' })
  @IsOptional() @ValidateNested() @Type(() => FileRefDto)
  resumeFile?: FileRefDto;

  @ApiPropertyOptional({ description: 'Reference to the uploaded certificate in the file store' })
  @IsOptional() @ValidateNested() @Type(() => FileRefDto)
  certificateFile?: FileRefDto;
}
