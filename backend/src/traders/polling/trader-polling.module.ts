import { Module } from '@nestjs/common';
import { TraderPollingService } from './trader-polling.service';

@Module({
  providers: [TraderPollingService],
})
export class TraderPollingModule {}
