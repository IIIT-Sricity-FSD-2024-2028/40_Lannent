import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ExpertApplicationsController } from './expert-applications.controller';
import { ExpertApplicationsService } from './expert-applications.service';
import { ExpertApplicationsRepository } from './expert-applications.repository';
import { UsersModule } from '../users/users.module';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';
import { AdminAuditMiddleware } from '../../common/middleware/admin-audit.middleware';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [ExpertApplicationsController],
  providers: [ExpertApplicationsRepository, ExpertApplicationsService],
  exports: [ExpertApplicationsService],
})
export class ExpertApplicationsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware, AdminAuditMiddleware)
      .exclude(
        { path: 'expert-applications', method: RequestMethod.POST },
        { path: 'expert-applications/status', method: RequestMethod.GET },
      )
      .forRoutes(ExpertApplicationsController);
  }
}
