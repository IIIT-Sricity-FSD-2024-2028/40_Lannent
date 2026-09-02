import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Refuses a request that nobody is attached to.
 *
 * `AuthMiddleware` runs globally and only *identifies* — it resolves a bearer
 * token, or falls back to the `role`/`user-id` headers, and lets anonymous
 * requests through. This is the piece that turns identification into a
 * requirement, and it is applied per module so the routes that must stay
 * public can be excluded explicitly rather than by omission.
 *
 * It accepts header identity as well as a token, deliberately: the point of
 * this stage is to close the *anonymous* hole — twelve routes, including
 * `POST /proposals/:id/hire`, which funds escrow and moves money, answered
 * with no credentials at all. Requiring a token outright is the one-line
 * change that follows once the frontend has fully moved over.
 */
@Injectable()
export class RequireAuthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (!req.user || !req.user.role) {
      throw new UnauthorizedException(
        'This endpoint requires you to be signed in. Send a bearer token, or the role and user-id headers.',
      );
    }
    next();
  }
}
