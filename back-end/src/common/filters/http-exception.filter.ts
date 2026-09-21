import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { shortId, actor } from '../logging/request-context';
import { MAX_UPLOAD_LABEL } from '../upload.constants';

/**
 * The one place an error becomes a response.
 *
 * Two rules it did not follow before:
 *
 *  1. **An unexpected error never describes itself to the client.** It used to
 *     return `exception.message` verbatim on a 500, so a stack-adjacent detail
 *     — a driver string, an internal id, a file path — went straight out.
 *     Now the client gets a generic line plus the request id, and the real
 *     error goes to the log where it belongs.
 *  2. **An unexpected error is always logged.** Nothing logged 500s at all, so
 *     an internal failure left no trace beyond one access-log line.
 *
 * The `{ success, message, data }` envelope is unchanged — every page depends
 * on that shape.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Error');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let data: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        // If it's already in our format, use it directly
        if (resp.success !== undefined) {
          response.status(status).json(resp);
          return;
        }
        // class-validator errors come as message[]
        message = Array.isArray(resp.message) ? resp.message.join(', ') : resp.message || message;
        message = humanize(message);
        data = resp.error || null;
      }
    } else {
      const translated = translate(exception);
      if (translated) {
        // A known infrastructure failure: the client gets a real explanation
        // because the fix is on their side (send less, send fewer, send valid).
        status = translated.status;
        message = translated.message;
      } else {
        // Genuinely unexpected. The client gets a reference, not the details.
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = `Something went wrong. Reference: ${reference(request)}`;
      }
    }

    // Log before responding. 5xx is ours to fix and carries the stack; a
    // translated 4xx is the caller's to fix and only needs one line.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${shortId(request?.id)}] ${actor()} ${request?.method} ${request?.originalUrl} — unhandled: ${describe(exception)}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (!(exception instanceof HttpException)) {
      this.logger.warn(
        `[${shortId(request?.id)}] ${actor()} ${request?.method} ${request?.originalUrl} — ${status}: ${message}`,
      );
    }

    response.status(status).json({
      success: false,
      message,
      data,
    });
  }
}

/**
 * Errors thrown by express middleware Nest registers itself. These reach the
 * filter **raw** — unlike anything thrown inside a guard, interceptor or
 * handler, which Nest has already wrapped in an HttpException by this point.
 * Left untranslated they are 500s: the body-parser limit was returning
 * `500 "request entity too large"` before this.
 */
function translate(exception: unknown): { status: number; message: string } | null {
  if (!(exception instanceof Error)) return null;
  const e = exception as any;

  if (e.type === 'entity.too.large') {
    return { status: HttpStatus.PAYLOAD_TOO_LARGE, message: 'Request body is too large.' };
  }

  return null;
}

/**
 * Multer's own strings, which arrive already wrapped by `FileInterceptor` with
 * the right status but a message too terse to act on — "File too large" does
 * not say how large is allowed, and "Unexpected field - resume" does not say
 * what the field should have been.
 */
function humanize(message: string): string {
  if (message === 'File too large') {
    return `That file is too large. The limit is ${MAX_UPLOAD_LABEL}.`;
  }
  const unexpected = /^Unexpected field - (.+)$/.exec(message);
  if (unexpected) {
    return `Unexpected file field "${unexpected[1]}". Upload the file in the "file" field.`;
  }
  if (message === 'Too many files') {
    return 'Too many files in one request. Upload them one at a time.';
  }
  return message;
}

/** The id the client is told to quote. Falls back when there is no request scope. */
function reference(request?: Request): string {
  return request?.id ?? shortId();
}

function describe(exception: unknown): string {
  if (exception instanceof Error) return `${exception.name}: ${exception.message}`;
  return String(exception);
}
