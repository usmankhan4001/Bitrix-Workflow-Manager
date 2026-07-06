import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Controller('api/workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly whatsapp: WhatsappService,
  ) {}

  // ─── Agents ────────────────────────────────────────────────────────────────

  @Get('agents')
  getAgents() { return this.workflowService.getAgents(); }

  @Post('agents')
  addAgent(@Body() body: { bitrix_user_id: string; name: string; team: string; whatsapp_phone?: string; department_id?: string; department_name?: string }) {
    return this.workflowService.addAgent(body);
  }

  // IMPORTANT: reorder must come BEFORE :id routes so NestJS doesn't match "reorder" as an ID
  @Put('agents/reorder')
  reorderAgents(@Body('orderedIds') orderedIds: string[]) {
    return this.workflowService.reorderAgents(orderedIds);
  }

  @Put('agents/:id')
  updateAgent(@Param('id') id: string, @Body() body: { name?: string; team?: string; whatsapp_phone?: string; department_id?: string; department_name?: string }) {
    return this.workflowService.updateAgent(id, body);
  }

  @Put('agents/:id/active')
  toggleAgentActive(@Param('id') id: string, @Body('is_active') isActive: boolean) {
    return this.workflowService.toggleAgentActive(id, isActive);
  }

  @Delete('agents/:id')
  deleteAgent(@Param('id') id: string) { return this.workflowService.deleteAgent(id); }

  // ─── Settings ──────────────────────────────────────────────────────────────

  @Get('settings')
  getSettings() { return this.workflowService.getSettings(); }

  @Put('settings')
  updateSetting(@Body() body: { key: string; value: string }) {
    return this.workflowService.updateSetting(body.key, body.value);
  }

  // ─── Late Leads ────────────────────────────────────────────────────────────

  @Get('late-leads')
  getLateLeads() { return this.workflowService.getLateLeads(); }

  // ─── Assignment Log ────────────────────────────────────────────────────────

  @Get('assignment-log')
  getAssignmentLog(@Query('limit') limit?: string) {
    return this.workflowService.getAssignmentLog(limit ? parseInt(limit, 10) : 50);
  }

  @Get('assigned-today')
  getAssignedTodayCount() { return this.workflowService.getAssignedTodayCount(); }

  // ─── Completed Queue (Gap 2) ───────────────────────────────────────────────

  @Get('completed-queue')
  getCompletedQueue(@Query('team') team?: string) {
    return this.workflowService.getCompletedQueue(team);
  }

  // ─── Bitrix24 Users & Departments ─────────────────────────────────────────

  @Get('bitrix-users')
  async getBitrixUsers(@Query('access_token') accessToken: string, @Query('domain') domain: string) {
    if (!accessToken || !domain) return { users: [], error: 'access_token and domain are required' };
    const users = await this.workflowService.fetchBitrixUsers(accessToken, domain);
    return { users };
  }

  @Get('bitrix-departments')
  async getBitrixDepartments(@Query('access_token') accessToken: string, @Query('domain') domain: string) {
    if (!accessToken || !domain) return { departments: [], error: 'access_token and domain are required' };
    const departments = await this.workflowService.fetchBitrixDepartments(accessToken, domain);
    return { departments };
  }

  // ─── Workflow Status (dashboard snapshot) ──────────────────────────────────

  @Get('status')
  getWorkflowStatus() { return this.workflowService.getWorkflowStatus(); }

  @Get('teams')
  getTeams() { return this.workflowService.getTeams(); }

  // ─── Lead Assignment ───────────────────────────────────────────────────────

  @Post('assign-lead')
  async assignLead(@Body() body: any) {
    const leadId = body.lead_id || body.data?.FIELDS?.ID;

    // Use body team if provided, otherwise read from settings so it's configurable
    let team = body.team;
    if (!team) {
      const settings = await this.workflowService.getSettings();
      team = settings.LEAD_ASSIGNMENT_TEAM || 'B2C';
    }

    const creds = body.access_token && body.domain
      ? { accessToken: body.access_token, domain: body.domain }
      : undefined;

    return this.workflowService.processLeadAssignment(
      leadId,
      team,
      creds ?? (this.workflowService as any).getWebhookCreds(),
      body.force === true || body.force === 'true',
    );
  }

  // ─── GAP 1: Manual cron trigger (useful for testing / recovery) ─────────────

  @Post('process-late-leads')
  async processLateLeads() {
    return this.workflowService.processAllLateLeads();
  }

  // ─── Bitrix24 Inbound Webhook (Task Comments) ─────────────────────────────

  @Post('webhook/task-comment')
  async taskCommentWebhook(@Body() payload: any) {
    return this.workflowService.handleTaskCommentWebhook(payload);
  }

  // ─── Bitrix24 Inbound Webhook (Lead Change) ───────────────────────────────

  @Post('webhook/lead-change')
  async leadChangeWebhook(@Body() payload: any) {
    return this.workflowService.handleLeadChangeWebhook(payload);
  }

  // ─── WhatsApp ─────────────────────────────────────────────────────────────

  @Post('whatsapp/test')
  testWhatsapp(@Body() body: { phone: string }) { return this.whatsapp.testConnection(body.phone); }

  @Get('whatsapp/templates')
  async getWhatsappTemplates() {
    return { templates: await this.whatsapp.getTemplates() };
  }
}
