import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { DuffelService } from './duffel.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [DuffelService],
  exports: [DuffelService],
})
export class DuffelModule {}
export { DuffelService };
