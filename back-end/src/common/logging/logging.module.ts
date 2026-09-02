import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';

/**
 * Global so any service can inject `AppLoggerService` without every feature
 * module adding an import — the same treatment a framework logger would get.
 */
@Global()
@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class LoggingModule {}
