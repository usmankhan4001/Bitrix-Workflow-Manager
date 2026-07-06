import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BitrixModule } from './bitrix/bitrix.module';
import { WorkflowModule } from './workflow/workflow.module';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BitrixModule,
    WorkflowModule,
    CronModule,
  ],
})
export class AppModule {}
