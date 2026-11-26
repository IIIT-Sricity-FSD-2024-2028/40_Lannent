import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from '../users/dto/login.dto';
import { PasswordResetService } from './password-reset.service';
import { ForgotPasswordDto, ResetTokenDto, ResetPasswordDto } from './dto/password-reset.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Email a password reset link (same answer whether or not the email has an account)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordReset.request(dto.email);
  }

  @Post('reset-password/check')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: 'Whether a reset link is still usable' })
  checkResetToken(@Body() dto: ResetTokenDto) {
    return this.passwordReset.check(dto.token);
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Set a new password with the emailed link (signs out every session)' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordReset.reset(dto.token, dto.password);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Exchange credentials (email or phone, and password) for a bearer token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.phone || dto.email || '', dto.password);
  }

  @Get('me')
  @ApiHeader({ name: 'Authorization', required: true, description: 'Bearer <token>' })
  @ApiOperation({ summary: 'Confirm a token is valid and report who it belongs to' })
  me(@Headers('authorization') authorization?: string) {
    const token = (authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Send the token as "Authorization: Bearer <token>".');
    const result = this.authService.whoami(token);
    if (!result.valid) throw new UnauthorizedException('That token is not valid or has expired.');
    return result;
  }
}
