import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { UsersModule } from './modules/users/users.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { AuditRequestsModule } from './modules/audit-requests/audit-requests.module';
import { AuditReportsModule } from './modules/audit-reports/audit-reports.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ExpertApplicationsModule } from './modules/expert-applications/expert-applications.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MessagesModule } from './modules/messages/messages.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { RevenueModule } from './modules/revenue/revenue.module';
import { SeedModule } from './modules/seed/seed.module';
import { FilesModule } from './modules/files/files.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AuthMiddleware } from './common/middleware/auth.middleware';
import { PayloadGuardMiddleware } from './common/middleware/payload-guard.middleware';
import { SanitizeMiddleware } from './common/middleware/sanitize.middleware';
import { LoggingModule } from './common/logging/logging.module';

@Module({
  imports: [
    // One global tier, deliberately.
    //
    // A second named tier here would apply to *every* route, not only the ones
    // that name it — configuring `strict` alongside `default` throttled the
    // whole API at ten requests a minute. Routes that need a tighter budget
    // override `default` with @Throttle at the handler instead.
    //
    // This tier is a blunt backstop against a hammering script, not the real
    // control: it is counted per IP, so everyone behind one NAT shares it, and
    // each dashboard fires eleven calls on load.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: Number(process.env.RATE_LIMIT_PER_MIN) || 2000 },
    ]),
    LoggingModule,
    UsersModule,
    TasksModule,
    MilestonesModule,
    ProposalsModule,
    AuditRequestsModule,
    AuditReportsModule,
    DisputesModule,
    TransactionsModule,
    ExpertApplicationsModule,
    NotificationsModule,
    MessagesModule,
    LedgerModule,
    RevenueModule,
    SeedModule,
    FilesModule,
    AuthModule,
    AuditModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Order matters: the id has to exist before the first line is written, so
    // RequestIdMiddleware runs first and LoggerMiddleware reads what it set.
    consumer
      // AuthMiddleware sits between the two so the access line records who the
      // token says this is, not who the header claimed. It identifies only —
      // refusing an unidentified request is the router-level stage.
      .apply(
        RequestIdMiddleware,
        PayloadGuardMiddleware,
        SanitizeMiddleware,
        AuthMiddleware,
        LoggerMiddleware,
      )
      // Express 5 requires a named wildcard; a bare '*' is auto-converted with a
      // warning on every registration.
      //
      // No exclusion for Swagger is needed. The global prefix makes this
      // '/api/*', and SwaggerModule mounts at '/api-docs' outside that prefix,
      // so the chain never reaches it. The three `.exclude()` entries that used
      // to sit here targeted '/api/api-docs*' — a path that does not exist —
      // and did nothing.
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
