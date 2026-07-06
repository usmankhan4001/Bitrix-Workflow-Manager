import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { CompatibilityController } from './compatibility.controller';
import { WorkflowService } from './workflow.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule],
  controllers: [WorkflowController, CompatibilityController],
  providers: [WorkflowService],
  exports: [WorkflowService], // exported so CronModule can inject it
})
export class WorkflowModule {}

