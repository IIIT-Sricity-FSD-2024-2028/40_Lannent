import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from '../logging/app-logger.service';
import { AuditService } from '../../modules/audit/audit.service';

const MUTATIONS = ['POST', 'PATCH', 'PUT', 'DELETE'];

/**
 * Records who asked for a value-moving change.
 *
 * The ledger already logs what actually moved. This is the other half: the
 * request that caused it, with the outcome attached, so an unexpected payout
 * can be traced back to a caller rather than inferred. A milestone approval
 * that releases escrow used to leave nothing behind but one access-log line.
 */
@Injectable()
export class MoneyTrailMiddleware implements NestMiddleware {
  constructor(
    private readonly log: AppLoggerService,
    private readonly audit: AuditService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (!MUTATIONS.includes(req.method)) return next();

    const started = Date.now();
    res.on('finish', () => {
      const outcome = res.statusCode < 400 ? 'ok' : 'refused';
      // AppLoggerService already prefixes the id and the actor.
      this.log.log(
        'money.trail',
        `${req.method} ${req.originalUrl} -> ${res.statusCode} ${outcome} ${Date.now() - started}ms`,
      );
      this.audit.record({
        kind: 'money',
        status: res.statusCode,
        outcome,
        detail: { durationMs: Date.now() - started },
      });
    });
    next();
  }
}
