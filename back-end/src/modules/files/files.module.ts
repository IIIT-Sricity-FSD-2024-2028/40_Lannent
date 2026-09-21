import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FilesRepository } from './files.repository';
import { TasksModule } from '../tasks/tasks.module';
import { AuditRequestsModule } from '../audit-requests/audit-requests.module';

import { RequireAuthMiddleware } from '../../common/middleware/require-auth.middleware';
import { UploadGuardMiddleware } from '../../common/middleware/upload-guard.middleware';

@Module({
  imports: [forwardRef(() => TasksModule), forwardRef(() => AuditRequestsModule)],
  controllers: [FilesController],
  providers: [FilesService, FilesRepository],
  exports: [FilesService],
})
export class FilesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Two separate registrations on purpose. `.exclude()` applies to the whole
    // chain it is attached to, so combining these would exempt the public
    // application upload from the size and content-type pre-check as well as
    // from authentication — and that is the one route a stranger can reach.
    consumer
      .apply(RequireAuthMiddleware)
      .exclude({ path: 'files/application', method: RequestMethod.POST })
      .forRoutes(FilesController);

    consumer.apply(UploadGuardMiddleware).forRoutes(FilesController);
  }
}
