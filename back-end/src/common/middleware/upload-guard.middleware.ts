import { Injectable, NestMiddleware, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '../upload.constants';

/**
 * Rejects an upload before multer starts writing it to disk.
 *
 * multer's own limit is enforced as the stream is consumed, so an oversized
 * file is partly written and then discarded. Checking `Content-Length` first
 * means the obvious cases never touch the filesystem at all. It is a
 * pre-filter, not a replacement: `Content-Length` is caller-supplied, so
 * multer's limit stays as the authority.
 */
@Injectable()
export class UploadGuardMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (req.method !== 'POST') return next();

    const type = req.get('content-type') || '';
    if (!type.toLowerCase().startsWith('multipart/form-data')) {
      throw new BadRequestException('Uploads must be sent as multipart/form-data.');
    }

    const declared = Number(req.get('content-length') || 0);
    // The multipart envelope adds boundaries and headers around the file, so
    // allow a margin rather than rejecting a file that is exactly at the limit.
    if (declared && declared > MAX_UPLOAD_BYTES + 16 * 1024) {
      throw new PayloadTooLargeException(`That file is too large. The limit is ${MAX_UPLOAD_LABEL}.`);
    }
    next();
  }
}
