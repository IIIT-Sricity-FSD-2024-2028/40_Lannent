import { Module, forwardRef, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { UsersModule } from '../users/users.module';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../common/security/jwt.config';
import { MailModule } from '../../common/mail/mail.module';

/**
 * Global so `AuthMiddleware` can verify a token wherever it runs, without
 * every feature module importing this one.
 */
@Global()
@Module({
  imports: [
    forwardRef(() => UsersModule),
    // Password reset emails its link.
    MailModule,
    JwtModule.register({
      secret: JWT_SECRET,
      // jsonwebtoken types the duration as a template literal union; the value
      // is configurable, so it is validated at the config boundary instead.
      signOptions: { expiresIn: JWT_EXPIRES_IN as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordResetService],
  exports: [AuthService, PasswordResetService],
})
export class AuthModule {}
