import * as bcrypt from 'bcrypt';

const ROUNDS = 10;

/** bcrypt hashes all start with a version tag, which is how a stored value is recognised. */
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$/;

export function isHashed(value?: string): boolean {
  return !!value && BCRYPT_PATTERN.test(value);
}

/** Hashes a plaintext password. Already-hashed input is returned untouched. */
export function hashPassword(plain: string): string {
  if (!plain) return plain;
  if (isHashed(plain)) return plain;
  return bcrypt.hashSync(plain, ROUNDS);
}

/**
 * Checks a password against a stored value.
 *
 * Accepts a plaintext stored value as well, because the seed data ships with
 * readable passwords and the documented demo logins have to keep working. That
 * path is the migration window, not the destination — `hashSeedPasswords()`
 * closes it at boot, so in a running app every comparison is against a hash.
 */
export function verifyPassword(plain: string, stored?: string): boolean {
  if (!stored) return false;
  if (isHashed(stored)) return bcrypt.compareSync(plain, stored);
  return stored === plain;
}
