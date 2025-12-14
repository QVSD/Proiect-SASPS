import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PriceQueryModule } from './price-query/price-query.module';

@Module({
  imports: [PriceQueryModule],
  controllers: [AppController],
})
export class AppModule {}
