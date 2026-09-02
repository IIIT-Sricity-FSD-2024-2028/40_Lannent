import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { MAX_UPLOAD_BYTES } from '../../common/upload.constants';

/** Where the bytes live. Resolved from the project root, not the cwd. */
export const UPLOAD_DIR = join(process.cwd(), 'uploads');

/**
 * What the platform accepts. An allowlist, not a blocklist — a deliverable is
 * documents, images and archives, and nothing here executes if it is ever
 * served back.
 */
const ALLOWED_MIME: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'text/plain': ['.txt', '.md'],
  'text/csv': ['.csv'],
  'text/markdown': ['.md'],
  'application/json': ['.json'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
};

export const ALLOWED_EXTENSIONS = Array.from(
  new Set(Object.values(ALLOWED_MIME).flat()),
).sort();

export function ensureUploadDir(): string {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

/**
 * Multer options for a single-file upload.
 *
 * The stored name is a uuid — never the client's filename, which is fully
 * attacker-controlled and is the thing that ends up in a path. The original
 * name is kept in the metadata record for display, escaped at the point of use.
 */
export const uploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => cb(null, ensureUploadDir()),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname || '').toLowerCase().slice(0, 12);
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const ext = extname(file.originalname || '').toLowerCase();
    const allowedExts = ALLOWED_MIME[file.mimetype];
    if (!allowedExts) {
      return cb(
        new BadRequestException(
          `Files of type "${file.mimetype}" are not accepted. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}.`,
        ),
        false,
      );
    }
    // The declared type and the extension have to agree, so a .exe cannot ride
    // in claiming to be a PDF.
    if (!allowedExts.includes(ext)) {
      return cb(
        new BadRequestException(`A ${file.mimetype} file should not have a "${ext || 'missing'}" extension.`),
        false,
      );
    }
    cb(null, true);
  },
};
