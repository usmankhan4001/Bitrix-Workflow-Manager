import { Module } from '@nestjs/common';
import { BitrixService } from './bitrix.service';
import { BitrixController } from './bitrix.controller';

@Module({
  providers: [BitrixService],
  controllers: [BitrixController],
  exports: [BitrixService]
})
export class BitrixModule {}
