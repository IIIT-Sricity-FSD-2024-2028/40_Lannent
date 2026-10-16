import { IsString, IsOptional, IsEmail, MinLength, MaxLength, ValidateNested, IsUrl } from 'class-validator';
import { Type, Transform } from 'class-transformer';

const blankToUndefined = ({ value }: any) => (typeof value === 'string' && value.trim() === '' ? undefined : value);
import { FileRefDto } from '../../milestones/dto/update-milestone.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpertApplicationDto {
  @ApiProperty({ example: 'Dr. Jane Smith' })
  @IsString() @MinLength(2) @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'jane@gmail.com' })
  @IsEmail()
  email: string;

  /** Becomes the reviewer's login on approval, so it is required. */
  @ApiProperty({ example: 'Expert@123' })
  @IsString() @MinLength(8)
  password: string;

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

  // Rendered as links on the intake desk, so only real web addresses.
  @ApiPropertyOptional({ example: 'https://linkedin.com/in/janesmith' })
  @IsOptional() @Transform(blankToUndefined) @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'linkedin must be a full https:// address' }) @MaxLength(300)
  linkedin?: string;

  @ApiPropertyOptional({ example: 'https://github.com/janesmith' })
  @IsOptional() @Transform(blankToUndefined) @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'github must be a full https:// address' }) @MaxLength(300)
  github?: string;

  @ApiPropertyOptional({ example: 'Passionate about code quality...' })
  @IsOptional() @IsString() @MaxLength(5000)
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
