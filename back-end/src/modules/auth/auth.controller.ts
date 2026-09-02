import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from '../users/dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Exchange credentials for a bearer token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
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
