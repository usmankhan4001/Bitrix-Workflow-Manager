import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BitrixModule } from './bitrix/bitrix.module';
import { WorkflowModule } from './workflow/workflow.module';
import { CronModule } from './cron/cron.module';
import { ApiKeyGuard } from './common/api-key.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BitrixModule,
    WorkflowModule,
    CronModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ApiKeyGuard }],
})
export class AppModule {}
