import { config } from 'dotenv';
import { join } from 'node:path';

/**
 * Loads back-end/.env before anything reads process.env.
 *
 * `import 'dotenv/config'` resolves .env from the working directory, so the
 * server started from anywhere but back-end/ — and every test, which never
 * imported it — ran with no JWT_SECRET and a throwaway per-process one.
 * Resolved from this file instead: src/common/security and
 * dist/common/security both sit three levels below back-end/.
 *
 * Variables already set in the environment win, so NODE_ENV from an npm
 * script or a value set by a deployment is never overridden.
 */
config({ path: join(__dirname, '..', '..', '..', '.env'), quiet: true });
