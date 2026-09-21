import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getContext, shortId } from '../logging/request-context';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const contentLength = res.get('content-length') || 0;

      // The actor comes from the request context rather than being read off the
      // header here, so this line keeps working unchanged once identity moves
      // to a token and the header is gone.
      const ctx = getContext();
      const role = ctx?.role || '-';
      const userId = ctx?.userId || '-';

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

      const line =
        `[${shortId(req.id)}] ` +
        `${methodColor}${method}${reset} ${originalUrl} ` +
        `${statusColor}${statusCode}${reset} ` +
        `${duration}ms - ${contentLength}b ` +
        `[role: ${role}, user: ${userId}] ` +
        `${ip || '-'} "${client(userAgent)}"`;

      // Level follows the outcome. Everything logged at `log` meant a 500 read
      // exactly like a 200 in the output — the one case worth spotting was the
      // one case you could not.
      if (statusCode >= 500) this.logger.error(line);
      else if (statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });

    next();
  }
}

/**
 * A full user-agent is ~130 characters of noise per line. Keep the part that
 * distinguishes a browser from curl from a harness.
 */
function client(userAgent: string): string {
  if (!userAgent) return '-';
  const known = /(curl|Playwright|HeadlessChrome|jsdom|node|Postman)/i.exec(userAgent);
  if (known) return known[1];
  const browser = /(Chrome|Firefox|Safari|Edg)\/[\d.]+/.exec(userAgent);
  return browser ? browser[0] : userAgent.slice(0, 32);
}
