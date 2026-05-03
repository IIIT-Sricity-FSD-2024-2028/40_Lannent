import { Module, forwardRef } from '@nestjs/common';
import { ExpertApplicationsController } from './expert-applications.controller';
import { ExpertApplicationsService } from './expert-applications.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [ExpertApplicationsController],
  providers: [ExpertApplicationsService],
  exports: [ExpertApplicationsService],
})
export class ExpertApplicationsModule {}
