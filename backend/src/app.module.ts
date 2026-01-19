import { Module } from '@nestjs/common';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { RepositoryModule } from './repository/repository.module';
import { SimulatorModule } from './simulator/simulator.module';
import { TraderPollingModule } from './traders/polling/trader-polling.module';
import { TraderObserverModule } from './traders/observer/trader-observer.module';

@Module({
  imports: [RepositoryModule, SimulatorModule, TraderPollingModule],
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
