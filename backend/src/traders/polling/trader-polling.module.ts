import { Module } from '@nestjs/common';
import { TraderPollingService } from './price-query.service';

@Module({
  providers: [TraderPollingService],
})
export class TraderPollingModule {}
