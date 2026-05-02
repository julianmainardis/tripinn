import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CJService } from './cj.service';

@Module({
  imports: [ConfigModule],
  providers: [CJService],
  exports: [CJService],
})
export class CJModule {}
export { CJService };
