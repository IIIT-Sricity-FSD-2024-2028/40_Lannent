import { randomBytes } from 'node:crypto';
import { Logger } from '@nestjs/common';

/**
 * The signing secret.
 *
 * A generated per-process secret is the right default for a dev server: every
 * restart invalidates old tokens, which is a nuisance but never a silent
 * vulnerability. A hardcoded fallback would ship a public signing key.
 */
function resolveSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to at least 32 characters in production.');
  }
  const generated = randomBytes(48).toString('hex');
  new Logger('Auth').warn(
    'JWT_SECRET is not set — generated a random secret for this process. ' +
      'Tokens will not survive a restart. Set JWT_SECRET to change that.',
  );
  return generated;
}

export const JWT_SECRET = resolveSecret();
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';
