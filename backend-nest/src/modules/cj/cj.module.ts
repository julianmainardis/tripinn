import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CJService } from './cj.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [CJService],
  exports: [CJService],
})
export class CJModule {}
export { CJService };
