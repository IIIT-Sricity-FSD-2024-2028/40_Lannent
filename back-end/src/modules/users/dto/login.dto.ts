import { IsEmail, IsString, IsOptional, Matches, ValidateIf } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

/** Sign in with an email or a phone number — one of the two — and the password. */
export class LoginDto {
  @ApiPropertyOptional({ example: 'client@gmail.com', description: 'Email, or leave out and send phone instead' })
  // Required unless a phone number is given.
  @ValidateIf(o => !o.phone)
  @IsEmail({}, { message: 'Enter a valid email address or phone number.' })
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Country code and number, as saved in profile settings' })
  @IsOptional()
  @Matches(/^\+\d{6,18}$/, { message: 'Enter the phone number with its country code, e.g. +919876543210.' })
  phone?: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  password: string;
}
