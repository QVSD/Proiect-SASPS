import { Module } from '@nestjs/common';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { TraderPollingModule } from './traders/polling/trader-polling.module';
import { RepositoryModule } from './repository/repository.module';
import { TraderObserverModule } from './traders/observer/price-observer.module';

@Module({
  imports: [TraderPollingModule, RepositoryModule, TraderObserverModule],
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
