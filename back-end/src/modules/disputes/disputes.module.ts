import { Module, forwardRef } from '@nestjs/common';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { DisputesRepository } from './disputes.repository';
import { MilestonesModule } from '../milestones/milestones.module';

@Module({
  imports: [forwardRef(() => MilestonesModule)],
  controllers: [DisputesController],
  providers: [DisputesRepository, DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
