import { Module } from '@nestjs/common';
import { TraderObserverService } from './price-observer.service';

@Module({
  providers: [TraderObserverService],
})
export class TraderObserverModule {}
