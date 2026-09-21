import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

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
  const allowedOrigins = (process.env.CORS_ORIGIN ||
    'http://localhost:8080,http://127.0.0.1:8080')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      // A same-origin or tool request (curl, a harness) sends no Origin at all.
      if (!origin) return cb(null, true);
      cb(null, allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, role, user-id, X-Request-Id',
    // Without this the browser can see the response but not the id on it, so
    // a user reporting a problem has no reference to quote.
    exposedHeaders: 'X-Request-Id',
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
  await app.listen(port);
  console.log(`\n🚀 Lannent API running on http://localhost:${port}`);
  console.log(`📚 Swagger UI: http://localhost:${port}/api-docs\n`);
}
bootstrap();
