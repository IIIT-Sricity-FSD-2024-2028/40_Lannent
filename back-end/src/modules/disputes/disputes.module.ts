import { Module, forwardRef } from '@nestjs/common';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { MilestonesModule } from '../milestones/milestones.module';

@Module({
  imports: [forwardRef(() => MilestonesModule)],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
