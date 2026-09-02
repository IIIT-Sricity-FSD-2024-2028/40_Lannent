// First import on purpose. JWT_SECRET and the rest are read at module load —
// `export const JWT_SECRET = resolveSecret()` runs the moment jwt.config is
// imported, which happens while the import graph below is still resolving. A
// ConfigModule registered inside AppModule would arrive far too late.
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Serve the frontend from the API.
  //
  // The two ran on separate origins only because nothing was serving the
  // static files — which made every request in the app cross-origin, turned
  // CORS into a permanent tax, and left a page opened from disk (Origin
  // "null") unable to talk to the API at all. Served from here they share an
  // origin, so those requests stop being cross-origin and stop preflighting.
  //
  // The API keeps the /api prefix, so nothing collides.
  app.useStaticAssets(join(__dirname, '..', '..', 'front-end'), {
    index: ['index.html'],
    extensions: ['html'],
  });

  // Rate limiting counts per client IP, and behind a load balancer every user
  // shares the proxy's address — one budget for everyone. TRUST_PROXY tells
  // express how many hops to trust so `req.ip` is the real client.
  //
  // Off by default on purpose: trusting a forwarded header that nobody set is
  // how a caller spoofs their own address and escapes the limit entirely.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    const hops = Number(trustProxy);
    app.getHttpAdapter().getInstance().set('trust proxy',
      Number.isFinite(hops) && String(hops) === trustProxy ? hops : trustProxy);
  }

  // The 100kb express default is tight once a deliverable carries file
  // references. Multipart uploads do not pass through here — multer enforces
  // its own 10MB ceiling on those.
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Security headers. The API serves JSON and streams file downloads, never
  // HTML, so the CSP that matters here is the one that stops a downloaded file
  // being framed or sniffed — contentSecurityPolicy is left off because it
  // governs documents this server does not serve.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS — the frontend origin, not the whole web.
  //
  // `origin: '*'` combined with header-based identity meant any page on any
  // site could call this API as any user. Tokens fix the identity half; this
  // fixes the other.
  //
  // In development every loopback form is accepted, because they are all the
  // same machine and pinning two of them meant a page served from
  // http://[::1]:8080 — which is what `localhost` resolves to first on many
  // systems — was refused with no useful explanation. Production takes an
  // explicit list and nothing else.
  const configured = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  const isProduction = process.env.NODE_ENV === 'production';
  const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

  const corsLogger = new Logger('CORS');
  if (isProduction && !configured.length) {
    throw new Error('CORS_ORIGIN must list the allowed frontend origins in production.');
  }

  function originAllowed(origin: string): boolean {
    if (configured.includes(origin)) return true;
    return !isProduction && LOOPBACK.test(origin);
  }

  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      // A same-origin or tool request (curl, a harness) sends no Origin at all.
      if (!origin) return cb(null, true);
      if (originAllowed(origin)) return cb(null, true);
      // A refused origin used to be invisible: the browser reported a CORS
      // failure and the server logged a bare 404, with nothing connecting them.
      corsLogger.warn(
        `refused cross-origin request from "${origin}" — ` +
          (isProduction
            ? `set CORS_ORIGIN to include it`
            : `allowed here: any localhost/127.0.0.1/[::1] port${configured.length ? ', ' + configured.join(', ') : ''}. ` +
              `A page opened straight from disk sends Origin "null" and cannot be allowed — serve it over http instead.`),
      );
      cb(null, false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, role, user-id, X-Request-Id',
    // Without this the browser can see the response but not the id on it, so
    // a user reporting a problem has no reference to quote.
    exposedHeaders: 'X-Request-Id',
  });

  // A preflight from a refused origin must still get an answer.
  //
  // The cors package bows out entirely when the origin callback yields false
  // — `if (err || !origin) { next(); }` — so OPTIONS fell through to the
  // router and returned 404. Every preflight Safari sent was answered "no such
  // endpoint", which looks like a broken API rather than a CORS decision.
  // Answering 204 without an allow-origin header lets the browser make the
  // call, which is the layer that should be making it.
  app.use((req: any, res: any, next: any) => {
    if (req.method !== 'OPTIONS') return next();
    res.statusCode = 204;
    res.setHeader('Content-Length', '0');
    res.end();
  });

  // Global validation pipe (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Lannent API')
    .setDescription(
      'Complete REST API for the Lannent freelance platform. ' +
      'Supports Users, Tasks, Milestones, Proposals, Audit Requests, Audit Reports, ' +
      'Disputes, Transactions, Expert Applications, and Notifications. ' +
      'Uses in-memory storage with seed data. ' +
      'Include "role" and "user-id" headers for RBAC.',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = Number(process.env.PORT) || 3000;

  // A port already in use is the most common way this fails to start, and Node
  // reports it as an eleven-line stack trace through the express adapter that
  // says nothing about what to do. Answer the actual question instead.
  try {
    await app.listen(port);
  } catch (error: any) {
    if (error?.code === 'EADDRINUSE') {
      console.error(
        `\n✖ Port ${port} is already in use — most likely another copy of this server.\n\n` +
          `  See what is holding it:   lsof -i :${port}\n` +
          `  Stop it:                  lsof -ti :${port} | xargs kill -9\n` +
          `  Or run somewhere else:    PORT=${port + 1} npm run start\n`,
      );
      process.exit(1);
    }
    throw error;
  }

  console.log(`\n🚀 Lannent API running on http://localhost:${port}`);
  console.log(`   The app is served here too — open http://localhost:${port}`);
  console.log(`📚 Swagger UI: http://localhost:${port}/api-docs\n`);
}

bootstrap().catch((error) => {
  // Anything that goes wrong before listen — a missing JWT_SECRET in
  // production, an unreadable static directory — should print one clear line,
  // not an unhandled rejection.
  console.error(`\n✖ Lannent API failed to start: ${error?.message || error}\n`);
  process.exit(1);
});
