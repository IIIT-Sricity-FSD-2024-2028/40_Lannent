import { Injectable, NestMiddleware, UnsupportedMediaTypeException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const BODY_METHODS = ['POST', 'PATCH', 'PUT'];

/**
 * Checks the content type before the body parser reads anything.
 *
 * A request that declares an unexpected type used to reach the parser and fail
 * there — as a 500 carrying the parser's own wording. Rejecting it here makes
 * the answer a 415 that names what the endpoint accepts.
 */
@Injectable()
export class PayloadGuardMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (!BODY_METHODS.includes(req.method)) return next();

    const raw = (req.get('content-type') || '').toLowerCase();
    // A body-less POST is legitimate here — several lifecycle endpoints take
    // no payload at all (fund, accept, approve).
    if (!raw && !Number(req.get('content-length') || 0)) return next();

    const type = raw.split(';')[0].trim();
    const accepted = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'];
    if (!accepted.includes(type)) {
      throw new UnsupportedMediaTypeException(
        `Content-Type "${type || 'none'}" is not accepted. Send ${accepted.join(', ')}.`,
      );
    }
    next();
  }
}
