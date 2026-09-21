import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware)
      .forRoutes(NotificationsController);
  }
}
