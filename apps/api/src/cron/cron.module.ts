import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  providers: [CronService],
})
export class CronModule {}
