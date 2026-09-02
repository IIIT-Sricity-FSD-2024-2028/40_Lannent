import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const MUTATIONS = ['POST', 'PATCH', 'PUT'];
/** Null bytes and C0/C1 controls, keeping tab, newline and carriage return. */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/**
 * Elements that execute, load, or frame something. Their whole content goes,
 * not just the tag, because the point of `<script>alert(1)</script>` is what
 * sits between the tags.
 */
const EXECUTABLE_ELEMENTS =
  /<\s*(script|style|iframe|object|embed|applet|svg|math|link|meta|base|form)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>|<\s*(script|style|iframe|object|embed|applet|svg|math|link|meta|base|form)\b[^>]*\/?>/gi;

/** Any remaining tag that carries an inline handler or a scripting URL. */
const DANGEROUS_ATTRS = /<[^<>]*(?:\son\w+\s*=|(?:href|src|action|formaction|data|xlink:href)\s*=\s*["']?\s*(?:javascript|vbscript|data:text\/html))[^<>]*>/gi;

/**
 * Fields whose value must survive byte-for-byte. A password may legitimately
 * contain `<`, and rewriting one silently breaks the login it was chosen for.
 */
const VERBATIM = new Set(['password', 'confirmPassword', 'token', 'authorization']);

/**
 * Removes what can execute from incoming text, and leaves the rest alone.
 *
 * Escaping on output is the primary control and it is applied — but this
 * frontend builds ~52 pages of HTML by hand in template strings with no
 * framework escaping automatically, and sweeping every sink was tried twice
 * and missed most of them. So markup that *runs* is also refused at the door.
 *
 * Deliberately narrow. An earlier version stripped every tag-shaped thing,
 * which permanently damaged ordinary text on a platform where people write
 * about code: `Generic List<String> handling` was stored as `Generic List
 * handling`. Inert tags now survive the round trip and are neutralised where
 * they are rendered, which is the layer that knows the context. Only
 * scripting constructs — `<script>`, `<iframe>`, `<svg>`, an `onerror=`
 * handler, a `javascript:` URL — are removed, because no field on this
 * platform has any use for them.
 */
@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (MUTATIONS.includes(req.method) && req.body && typeof req.body === 'object') {
      req.body = clean(req.body, 0);
    }
    next();
  }
}

function cleanString(value: string): string {
  let out = value.replace(CONTROL_CHARS, '');
  // Repeat until stable: removing one wrapper can reveal another underneath.
  let previous;
  do {
    previous = out;
    out = out.replace(EXECUTABLE_ELEMENTS, '').replace(DANGEROUS_ATTRS, '');
  } while (out !== previous);
  return out.trim();
}

function clean(value: any, depth: number, key?: string): any {
  // Bounded so a deeply nested body cannot blow the stack here.
  if (depth > 12) return value;
  if (typeof value === 'string') return key && VERBATIM.has(key) ? value : cleanString(value);
  if (Array.isArray(value)) return value.map(v => clean(v, depth + 1, key));
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = clean(v, depth + 1, k);
    return out;
  }
  return value;
}
