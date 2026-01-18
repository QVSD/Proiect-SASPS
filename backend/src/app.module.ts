import { Module } from '@nestjs/common';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { RepositoryModule } from './repository/repository.module';
import { SimulatorModule } from './simulator/simulator.module';
import { TraderController } from './traders/trader.controller';

@Module({
  imports: [RepositoryModule, SimulatorModule],
  controllers: [AppController, TraderController],
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
