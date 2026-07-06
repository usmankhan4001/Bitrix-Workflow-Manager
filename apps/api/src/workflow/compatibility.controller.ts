import { Controller, Post, Body } from '@nestjs/common';
import { WorkflowService } from './workflow.service';

@Controller()
export class CompatibilityController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post(['lead/add', 'bitrixworkflow/lead/add'])
  async assignLead(@Body() body: any) {
    const leadId = body.lead_id || body.data?.FIELDS?.ID;
    let team = body.team;
    if (!team) {
      const settings = await this.workflowService.getSettings();
      team = settings.LEAD_ASSIGNMENT_TEAM || 'B2C';
    }

    return this.workflowService.processLeadAssignment(
      leadId,
      team,
      (this.workflowService as any).getWebhookCreds(),
      body.force === true || body.force === 'true',
    );
  }

  @Post(['task/comment/add', 'bitrixworkflow/task/comment/add'])
  async taskCommentWebhook(@Body() payload: any) {
    return this.workflowService.handleTaskCommentWebhook(payload);
  }

  @Post(['lead/change', 'bitrixworkflow/lead/change'])
  async leadChangeWebhook(@Body() payload: any) {
    return this.workflowService.handleLeadChangeWebhook(payload);
  }
}
