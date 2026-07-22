import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { WeightEntry } from './weight-entry.entity';
import { WeightsController } from './weights.controller';
import { WeightsService } from './weights.service';

@Module({
  imports: [TypeOrmModule.forFeature([WeightEntry]), AuthModule],
  controllers: [WeightsController],
  providers: [WeightsService],
  exports: [WeightsService],
})
export class WeightsModule {}
