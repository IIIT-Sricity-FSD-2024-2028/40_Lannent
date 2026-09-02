import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/** The only environments in which destroying every record is a normal thing to do. */
const DISPOSABLE = ['development', 'test'];

/**
 * `POST /seed/reset` destroys every record and every uploaded file.
 *
 * The guard is the environment, and it **fails closed**: the endpoint works
 * only where `NODE_ENV` explicitly says the data is disposable. Keying on
 * `NODE_ENV === 'production'` instead meant an unset or misspelled variable —
 * the normal state of a hastily configured box — left the wipe live behind a
 * single role header.
 */
@Injectable()
export class SeedGuardMiddleware implements NestMiddleware {
  private readonly logger = new Logger('SeedGuard');

  use(req: Request, _res: Response, next: NextFunction) {
    const env = process.env.NODE_ENV;
    if (!env || !DISPOSABLE.includes(env)) {
      this.logger.error(
        `refused ${req.method} ${req.originalUrl} — seed reset needs NODE_ENV to be one of ` +
          `${DISPOSABLE.join(', ')} (it is ${env ? `"${env}"` : 'unset'})`,
      );
      throw new ForbiddenException(
        'Seeding is disabled here. This endpoint destroys all data and runs only where NODE_ENV marks the data as disposable.',
      );
    }
    next();
  }
}
