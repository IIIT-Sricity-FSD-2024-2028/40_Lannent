import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const role = req.get('role') || '-';
    const userId = req.get('user-id') || '-';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const contentLength = res.get('content-length') || 0;

      const statusColor =
        statusCode >= 500 ? '\x1b[31m' :  // red
        statusCode >= 400 ? '\x1b[33m' :  // yellow
        statusCode >= 300 ? '\x1b[36m' :  // cyan
        statusCode >= 200 ? '\x1b[32m' :  // green
        '\x1b[0m';                         // reset

      const methodColors: Record<string, string> = {
        GET:    '\x1b[92m',   // bright green
        POST:   '\x1b[93m',   // bright yellow
        PATCH:  '\x1b[94m',   // bright blue
        PUT:    '\x1b[96m',   // bright cyan
        DELETE: '\x1b[91m',   // bright red
      };
      const methodColor = methodColors[method] || '\x1b[0m';
      const reset = '\x1b[0m';

      this.logger.log(
        `${methodColor}${method}${reset} ${originalUrl} ` +
        `${statusColor}${statusCode}${reset} ` +
        `${duration}ms - ${contentLength}b ` +
        `[role: ${role}, user: ${userId}]`,
      );
    });

    next();
  }
}
