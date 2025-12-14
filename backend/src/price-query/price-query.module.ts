import { Module } from '@nestjs/common';
import { PriceQueryService } from './price-query.service';

@Module({
  providers: [PriceQueryService]
})
export class PriceQueryModule {}
