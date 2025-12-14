import { Module } from '@nestjs/common';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { PriceQueryModule } from './price-query/price-query.module';
import { RepositoryModule } from './repository/repository.module';

@Module({
  imports: [PriceQueryModule, RepositoryModule],
  controllers: [AppController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule {}
