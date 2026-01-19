import { Module } from '@nestjs/common';
import { TraderObserverService } from './trader-observer.service';

@Module({
  providers: [TraderObserverService],
  exports: [TraderObserverService],
})
export class TraderObserverModule {}

