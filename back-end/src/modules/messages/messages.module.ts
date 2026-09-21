import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesRepository } from './messages.repository';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';

@Module({
  controllers: [MessagesController],
  providers: [MessagesRepository, MessagesService],
  exports: [MessagesService],
})
export class MessagesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequireAuthMiddleware)
      .forRoutes(MessagesController);
  }
}
