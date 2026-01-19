import { Module } from '@nestjs/common';
import { TraderPollingService } from './trader-polling.service';

@Module({
  providers: [TraderPollingService],
  exports: [TraderPollingService],
})
export class TraderPollingModule {}
