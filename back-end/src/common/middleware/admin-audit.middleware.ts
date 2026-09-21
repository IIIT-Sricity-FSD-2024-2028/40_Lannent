import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from '../logging/app-logger.service';
import { AuditService } from '../../modules/audit/audit.service';

/**
 * Logs access to the financial surfaces — reads included.
 *
 * Unlike the money trail, a plain `GET` matters here: who looked at platform
 * revenue, or at the fee configuration, is itself worth recording. With more
 * than one admin account this is the only thing that says which of them acted.
 */
@Injectable()
export class AdminAuditMiddleware implements NestMiddleware {
  constructor(
    private readonly log: AppLoggerService,
    private readonly audit: AuditService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    res.on('finish', () => {
      const verb = req.method === 'GET' ? 'read' : 'changed';
      // AppLoggerService already prefixes the id and the actor.
      this.log.log('admin.audit', `${verb} ${req.originalUrl} -> ${res.statusCode}`);
      // The log line is for a human tailing stdout; this is the record the
      // compliance desk actually reads.
      this.audit.record({
        kind: req.method === 'GET' ? 'admin.read' : 'admin.change',
        status: res.statusCode,
        outcome: res.statusCode < 400 ? 'ok' : 'refused',
      });
    });
    next();
  }
}
