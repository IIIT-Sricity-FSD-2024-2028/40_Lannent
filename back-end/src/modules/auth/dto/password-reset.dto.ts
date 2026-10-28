import { IsEmail, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'you@gmail.com' })
  @IsEmail({}, { message: 'Enter a valid email address.' })
  email: string;
}

export class ResetTokenDto {
  @ApiProperty({ description: 'The token from the emailed link' })
  @IsString() @MaxLength(200)
  token: string;
}

export class ResetPasswordDto extends ResetTokenDto {
  @ApiProperty({ example: 'NewPassw0rd!' })
  @IsString() @MaxLength(200)
  password: string;
}
