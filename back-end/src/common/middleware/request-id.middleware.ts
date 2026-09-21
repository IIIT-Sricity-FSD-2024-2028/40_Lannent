import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { runWithContext } from '../logging/request-context';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

/**
 * Gives every request an id and opens the context scope everything else logs
 * inside. Must run before the access logger, or the first line written has no
 * id to carry.
 *
 * An inbound X-Request-Id is honoured rather than replaced, so a trace started
 * elsewhere stays intact.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const inbound = req.get('x-request-id');
    const requestId = isSafeId(inbound) ? (inbound as string) : randomUUID();

    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    runWithContext(
      {
        requestId,
        userId: req.get('user-id') || undefined,
        role: req.get('role') || undefined,
        method: req.method,
        path: req.originalUrl,
      },
      () => next(),
    );
  }
}

/** An inbound id is caller-controlled, so it never reaches a log line unchecked. */
function isSafeId(value?: string): boolean {
  return !!value && value.length <= 64 && /^[\w.-]+$/.test(value);
}
