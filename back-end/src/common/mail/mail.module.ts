import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/** Global, like the logger: any module that needs to send email injects MailService. */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
