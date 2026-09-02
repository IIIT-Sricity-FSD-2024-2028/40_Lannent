import { Module, forwardRef } from '@nestjs/common';
import { ExpertApplicationsController } from './expert-applications.controller';
import { ExpertApplicationsService } from './expert-applications.service';
import { ExpertApplicationsRepository } from './expert-applications.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [ExpertApplicationsController],
  providers: [ExpertApplicationsRepository, ExpertApplicationsService],
  exports: [ExpertApplicationsService],
})
export class ExpertApplicationsModule {}
