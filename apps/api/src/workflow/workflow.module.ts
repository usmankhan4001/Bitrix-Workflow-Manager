import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService], // exported so CronModule can inject it
})
export class WorkflowModule {}
