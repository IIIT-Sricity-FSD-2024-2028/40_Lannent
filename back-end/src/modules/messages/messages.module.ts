import { Module, NestModule, MiddlewareConsumer, RequestMethod, forwardRef } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { UsersModule } from '../users/users.module';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesRepository } from './messages.repository';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';

@Module({
  imports: [forwardRef(() => ContactsModule), forwardRef(() => UsersModule), forwardRef(() => NotificationsModule), forwardRef(() => FilesModule)],
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
