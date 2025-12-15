import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { RepositoryModule } from '../repository/repository.module';

@Module({
  imports: [RepositoryModule],
  providers: [SimulatorService]
})
export class SimulatorModule {}
