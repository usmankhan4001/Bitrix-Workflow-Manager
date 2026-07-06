import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { WhatsappService } from '../whatsapp/whatsapp.service';

const SETTING_DEFAULTS: Record<string, string> = {
  WORKFLOW_START_TIME: '09:00',
  WORKFLOW_END_TIME: '18:00',
  NOT_ALLOWED_DAYS: '[0,6]',
  WHATSAPP_ENABLED: 'false',
  ONCLOUD_ASSIGN_TEMPLATE: 'lead_assigned',
  ONCLOUD_OVERDUE_TEMPLATE: 'lead_overdue',
  ONCLOUD_TEMPLATE_LANGUAGE: 'en',
  SLA_HOURS: '24',
  // Gap 3 — source exclusion
  EXCLUDED_SOURCES: '[]',             // JSON array of SOURCE_ID codes to skip, e.g. '["UC_NNO79X"]'
  // Gap 2 — escalation
  WORKFLOW_MANAGER_ID: '1',           // Bitrix24 user ID who receives escalation tasks
  MAX_TASKS_BEFORE_ESCALATION: '2',   // if lead already has this many tasks, escalate
};

const SOURCE_LABELS: Record<string, string> = {
  CALL: 'Phone Call',
  EMAIL: 'Email',
  WEB: 'Website',
  ADVERTISING: 'Advertisement',
  PARTNER: 'Partner',
  RECOMMENDATION: 'Referral',
  TRADE_SHOW: 'Trade Show',
  SELF: 'Self',
  OTHER: 'Other',
};

interface LeadDetails {
  name: string;
  source: string;
  sourceId: string;
  title: string;
  assignedById?: string;
  modifyById?: string;
}

// Credentials can be OAuth-based or webhook-based
interface BitrixCreds {
  accessToken?: string;
  domain?: string;
  webhookBase?: string; // full webhook URL like https://pcicrm.bitrix24.com/rest/11/token
}

@Injectable()
export class WorkflowService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(private readonly whatsapp: WhatsappService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
      const exists = await this.workflowSetting.findUnique({ where: { key } });
      if (!exists) await this.workflowSetting.create({ data: { key, value } });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // ─── Bitrix24 REST helper ──────────────────────────────────────────────────
  // Works with both OAuth tokens and webhook URLs transparently

  private bitrixUrl(method: string, creds: BitrixCreds): string {
    if (creds.webhookBase) {
      return `${creds.webhookBase.replace(/\/$/, '')}/${method}.json`;
    }
    return `https://${creds.domain}/rest/${method}.json?auth=${creds.accessToken}`;
  }

  private getWebhookCreds(): BitrixCreds {
    const token = process.env.BITRIX_WEBHOOK_TOKEN || '';
    const portal = process.env.BITRIX_PORTAL_URL || 'https://pcicrm.bitrix24.com';
    const base = token.startsWith('http') ? token.replace(/\/$/, '') : `${portal}/rest/${token}`.replace(/\/$/, '');
    return { webhookBase: base };
  }

  // ─── Agents ────────────────────────────────────────────────────────────────

  async getAgents() {
    return this.agent.findMany({ orderBy: { created_at: 'asc' } });
  }

  async addAgent(data: { bitrix_user_id: string; name: string; team: string; whatsapp_phone?: string }) {
    return this.agent.create({
      data: { ...data, whatsapp_phone: data.whatsapp_phone ?? null, is_active: true },
    });
  }

  async updateAgent(id: string, data: { name?: string; team?: string; whatsapp_phone?: string }) {
    return this.agent.update({ where: { id }, data });
  }

  async toggleAgentActive(id: string, is_active: boolean) {
    return this.agent.update({ where: { id }, data: { is_active } });
  }

  async deleteAgent(id: string) {
    return this.agent.delete({ where: { id } });
  }

  // ─── Settings ──────────────────────────────────────────────────────────────

  async getSettings(): Promise<Record<string, string>> {
    const rows = await this.workflowSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async updateSetting(key: string, value: string) {
    return this.workflowSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // ─── Late Leads ────────────────────────────────────────────────────────────

  async getLateLeads() {
    return this.lateLead.findMany({ where: { processed: false }, orderBy: { created_at: 'asc' } });
  }

  async storeLateLeadIfAbsent(leadId: string) {
    await this.lateLead.upsert({
      where: { lead_id: leadId },
      update: {},
      create: { lead_id: leadId },
    });
  }

  // ─── Assignment Log ────────────────────────────────────────────────────────

  async getAssignmentLog(limit = 50) {
    return this.assignmentLog.findMany({ orderBy: { assigned_at: 'desc' }, take: limit });
  }

  async getAssignedTodayCount() {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return this.assignmentLog.count({ where: { assigned_at: { gte: midnight } } });
  }

  // ─── Completed Queue (Gap 2) ───────────────────────────────────────────────

  async addToCompletedQueue(agentId: string, agentName: string, team: string, leadId: string) {
    // Only add if not already in queue for this agent
    const existing = await this.completedQueue.findFirst({ where: { agent_id: agentId } });
    if (!existing) {
      await this.completedQueue.create({ data: { agent_id: agentId, agent_name: agentName, team, lead_id: leadId } });
      this.logger.log(`${agentName} added to completed queue for team "${team}"`);
    }
  }

  async popFromCompletedQueue(team: string): Promise<any | null> {
    // FIFO: get the earliest entry for this team
    const entry = await this.completedQueue.findFirst({
      where: { team },
      orderBy: { queued_at: 'asc' },
    });
    if (!entry) return null;
    await this.completedQueue.delete({ where: { id: entry.id } });
    this.logger.log(`Popped ${entry.agent_name} from completed queue for re-assignment`);
    return entry;
  }

  async getCompletedQueue(team?: string) {
    return this.completedQueue.findMany({
      where: team ? { team } : undefined,
      orderBy: { queued_at: 'asc' },
    });
  }

  // ─── Time / Day Helpers ────────────────────────────────────────────────────

  isWithinBusinessHours(settings: Record<string, string>): boolean {
    const now = new Date();
    // Adjust for PKT (UTC+5)
    const pkt = new Date(now.getTime() + 5 * 3600 * 1000);
    const currentDay = pkt.getUTCDay();
    const currentHour = pkt.getUTCHours();
    const currentMin = pkt.getUTCMinutes();

    const notAllowed: number[] = JSON.parse(settings.NOT_ALLOWED_DAYS || '[0,6]');
    if (notAllowed.includes(currentDay)) return false;

    const [startH, startM] = (settings.WORKFLOW_START_TIME || '09:00').split(':').map(Number);
    const [endH, endM] = (settings.WORKFLOW_END_TIME || '18:00').split(':').map(Number);

    const currentMins = currentHour * 60 + currentMin;
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    return currentMins >= startMins && currentMins < endMins;
  }

  // ─── GAP 3: Source exclusion ───────────────────────────────────────────────

  isSourceExcluded(sourceId: string, settings: Record<string, string>): boolean {
    if (!sourceId) return false;
    try {
      const excluded: string[] = JSON.parse(settings.EXCLUDED_SOURCES || '[]');
      return excluded.map((s) => s.toUpperCase()).includes(sourceId.toUpperCase());
    } catch {
      return false;
    }
  }

  // ─── Bitrix24: Lead details ────────────────────────────────────────────────

  async fetchLeadDetails(leadId: string, creds: BitrixCreds): Promise<LeadDetails> {
    try {
      const url = `${this.bitrixUrl('crm.lead.get', creds)}&id=${leadId}`;
      const res = await fetch(url);
      const data = (await res.json()) as any;
      const lead = data.result;
      if (!lead) return { name: `Lead #${leadId}`, source: 'CRM', sourceId: '', title: `Lead #${leadId}` };

      const contactName = [lead.NAME, lead.LAST_NAME].filter(Boolean).join(' ').trim();
      const displayName = contactName || lead.COMPANY_TITLE || lead.TITLE || `Lead #${leadId}`;
      const sourceId = lead.SOURCE_ID || '';
      const sourceLabel = SOURCE_LABELS[sourceId] || lead.SOURCE_DESCRIPTION || sourceId || 'CRM';

      return {
        name: displayName,
        source: sourceLabel,
        sourceId,
        title: lead.TITLE || displayName,
        assignedById: lead.ASSIGNED_BY_ID,
        modifyById: lead.MODIFY_BY_ID,
      };
    } catch (err) {
      this.logger.warn(`fetchLeadDetails failed for #${leadId}: ${(err as Error).message}`);
      return { name: `Lead #${leadId}`, source: 'CRM', sourceId: '', title: `Lead #${leadId}` };
    }
  }

  // ─── Bitrix24: Count tasks for a lead ─────────────────────────────────────

  async getTaskCountForLead(leadId: string, creds: BitrixCreds): Promise<number> {
    try {
      const url = `${this.bitrixUrl('tasks.task.list', creds)}&filter[UF_CRM_TASK]=L_${leadId}&select[]=ID`;
      const res = await fetch(url);
      const data = (await res.json()) as any;
      return data.result?.tasks?.length ?? 0;
    } catch {
      return 0;
    }
  }

  // ─── Bitrix24: Users & Departments ────────────────────────────────────────

  async fetchBitrixUsers(accessToken: string, domain: string): Promise<any[]> {
    const creds: BitrixCreds = { accessToken, domain };
    try {
      const deptRes = await fetch(this.bitrixUrl('department.get', creds));
      const deptData = (await deptRes.json()) as any;
      const departments: Record<number, string> = {};
      if (deptData.result) {
        for (const dept of deptData.result) departments[dept.ID] = dept.NAME;
      }

      const users: any[] = [];
      let start = 0;
      while (true) {
        const res = await fetch(`${this.bitrixUrl('user.get', creds)}&ACTIVE=Y&start=${start}`);
        const data = (await res.json()) as any;
        if (!data.result?.length) break;
        users.push(...data.result);
        if (!data.next) break;
        start = data.next;
      }

      return users.map((u) => ({
        id: String(u.ID),
        name: `${u.NAME || ''} ${u.LAST_NAME || ''}`.trim(),
        email: u.EMAIL || '',
        department_id: u.UF_DEPARTMENT?.[0] || null,
        department_name: u.UF_DEPARTMENT?.[0] ? departments[u.UF_DEPARTMENT[0]] || 'Unknown' : 'No Department',
        phone: u.PERSONAL_MOBILE || u.WORK_PHONE || '',
        active: u.ACTIVE === true || u.ACTIVE === 'Y',
      }));
    } catch (err) {
      this.logger.error(`fetchBitrixUsers failed: ${(err as Error).message}`);
      return [];
    }
  }

  async fetchBitrixDepartments(accessToken: string, domain: string): Promise<any[]> {
    try {
      const res = await fetch(`https://${domain}/rest/department.get.json?auth=${accessToken}`);
      const data = (await res.json()) as any;
      return (data.result || []).map((d: any) => ({ id: String(d.ID), name: d.NAME, parent: d.PARENT }));
    } catch (err) {
      this.logger.error(`fetchBitrixDepartments failed: ${(err as Error).message}`);
      return [];
    }
  }

  // ─── Bitrix24: Mutations ───────────────────────────────────────────────────

  async assignLeadInBitrix(leadId: string, assigneeUserId: string, creds: BitrixCreds): Promise<boolean> {
    try {
      const body = new URLSearchParams({ id: leadId, 'fields[ASSIGNED_BY_ID]': assigneeUserId });
      if (creds.accessToken) body.append('auth', creds.accessToken);
      const res = await fetch(this.bitrixUrl('crm.lead.update', creds), { method: 'POST', body });
      const data = (await res.json()) as any;
      return data.result === true;
    } catch (err) {
      this.logger.error(`assignLeadInBitrix failed: ${(err as Error).message}`);
      return false;
    }
  }

  async changeLeadStage(leadId: string, statusId: string, creds: BitrixCreds): Promise<boolean> {
    try {
      const body = new URLSearchParams({ id: leadId, 'fields[STATUS_ID]': statusId });
      if (creds.accessToken) body.append('auth', creds.accessToken);
      const res = await fetch(this.bitrixUrl('crm.lead.update', creds), { method: 'POST', body });
      const data = (await res.json()) as any;
      return data.result === true;
    } catch (err) {
      this.logger.error(`changeLeadStage failed: ${(err as Error).message}`);
      return false;
    }
  }

  async createBitrixTask(
    leadId: string,
    leadName: string,
    assigneeUserId: string,
    creds: BitrixCreds,
    deadlineHours: number,
    titleOverride?: string,
    descriptionOverride?: string,
  ): Promise<string | null> {
    try {
      const deadline = new Date(Date.now() + deadlineHours * 3600 * 1000).toISOString();
      const body = new URLSearchParams({
        'fields[TITLE]': titleOverride || `Follow up: ${leadName}`,
        'fields[DESCRIPTION]': descriptionOverride || `Please contact ${leadName} and update the lead status in Bitrix24 within ${deadlineHours} hours.`,
        'fields[RESPONSIBLE_ID]': assigneeUserId,
        'fields[DEADLINE]': deadline,
        'fields[UF_CRM_TASK]': `L_${leadId}`,
      });
      if (creds.accessToken) body.append('auth', creds.accessToken);
      const res = await fetch(this.bitrixUrl('tasks.task.add', creds), { method: 'POST', body });
      const data = (await res.json()) as any;
      if (data.result?.task?.id) return String(data.result.task.id);
      this.logger.warn(`createBitrixTask unexpected: ${JSON.stringify(data)}`);
      return null;
    } catch (err) {
      this.logger.error(`createBitrixTask failed: ${(err as Error).message}`);
      return null;
    }
  }

  async completeTask(taskId: string, creds: BitrixCreds): Promise<boolean> {
    try {
      const body = new URLSearchParams({ taskId });
      if (creds.accessToken) body.append('auth', creds.accessToken);
      const res = await fetch(this.bitrixUrl('tasks.task.complete', creds), { method: 'POST', body });
      const data = (await res.json()) as any;
      return !data.error;
    } catch {
      return false;
    }
  }

  // ─── Round-Robin Pick ──────────────────────────────────────────────────────

  async pickNextAgent(team: string): Promise<any | null> {
    const agents = await this.agent.findMany({
      where: { team, is_active: true },
      orderBy: { created_at: 'asc' },
    });
    if (agents.length === 0) return null;

    const lastLog = await this.assignmentLog.findFirst({
      where: { team },
      orderBy: { assigned_at: 'desc' },
    });
    if (!lastLog) return agents[0];

    const lastIdx = agents.findIndex((a) => a.id === lastLog.agent_id);
    return agents[(lastIdx + 1) % agents.length];
  }

  // ─── CORE: Process Lead Assignment ────────────────────────────────────────
  // Used by both manual force-assign and the cron job

  async processLeadAssignment(
    leadId: string,
    team: string,
    creds: BitrixCreds,
    force = false,
  ): Promise<{ success: boolean; agent?: any; taskId?: string | null; skipped?: boolean; queued?: boolean; message?: string }> {
    const settings = await this.getSettings();

    // Gap 2: Queue leads arriving outside business hours if not forced
    if (!force && !this.isWithinBusinessHours(settings)) {
      this.logger.log(`Lead #${leadId} arrived outside business hours. Queueing in LateLead...`);
      await this.storeLateLeadIfAbsent(leadId);
      return { success: true, queued: true, message: 'Outside business hours, lead queued.' };
    }

    // Gap 3: Skip excluded sources
    const lead = await this.fetchLeadDetails(leadId, creds);
    if (this.isSourceExcluded(lead.sourceId, settings)) {
      this.logger.log(`Lead #${leadId} skipped — source "${lead.sourceId}" is excluded`);
      await this.lateLead.updateMany({ where: { lead_id: leadId }, data: { processed: true, processed_at: new Date() } });
      return { success: true, skipped: true, message: `Source "${lead.sourceId}" is excluded` };
    }

    const agent = await this.pickNextAgent(team);
    if (!agent) return { success: false, message: `No active agents in team "${team}"` };

    const slaHours = parseInt(settings.SLA_HOURS || '24', 10);

    const [, taskId] = await Promise.all([
      this.assignLeadInBitrix(leadId, agent.bitrix_user_id, creds),
      this.createBitrixTask(leadId, lead.name, agent.bitrix_user_id, creds, slaHours),
    ]);

    const log = await this.assignmentLog.create({
      data: { lead_id: leadId, agent_id: agent.id, agent_name: agent.name, team },
    });

    await this.lateLead.updateMany({
      where: { lead_id: leadId },
      data: { processed: true, processed_at: new Date() },
    });

    // WhatsApp notification
    let waNotified = false;
    if (settings.WHATSAPP_ENABLED === 'true' && agent.whatsapp_phone) {
      waNotified = await this.whatsapp.sendLeadAssignedNotification(
        agent.whatsapp_phone,
        agent.name.split(' ')[0],
        lead.name,
        lead.source,
        settings.ONCLOUD_ASSIGN_TEMPLATE || 'lead_assigned',
        settings.ONCLOUD_TEMPLATE_LANGUAGE || 'en',
      );
      if (waNotified) {
        await this.assignmentLog.update({ where: { id: log.id }, data: { wa_notified: true } });
      }
    }

    this.logger.log(`"${lead.name}" (${lead.source}) → ${agent.name} [${team}]. Task: ${taskId}. WA: ${waNotified}`);
    return { success: true, agent, taskId };
  }

  // ─── GAP 1: Cron — Process all queued late leads ──────────────────────────
  // Called by CronService at WORKFLOW_START_TIME every enabled day

  async processAllLateLeads(): Promise<{ processed: number; skipped: number; failed: number }> {
    const leads = await this.getLateLeads();
    if (leads.length === 0) {
      this.logger.log('Cron: no late leads to process');
      return { processed: 0, skipped: 0, failed: 0 };
    }

    this.logger.log(`Cron: processing ${leads.length} late lead(s)`);
    const creds = this.getWebhookCreds();
    let processed = 0, skipped = 0, failed = 0;

    for (const lateLead of leads) {
      try {
        // Default team — could be extended to store team per LateLead in the future
        const result = await this.processLeadAssignment(lateLead.lead_id, 'Sales Executives', creds, true);
        if (result.skipped) skipped++;
        else if (result.success) processed++;
        else failed++;
      } catch (err) {
        this.logger.error(`Cron: failed to process lead #${lateLead.lead_id}: ${(err as Error).message}`);
        failed++;
      }
    }

    this.logger.log(`Cron done — processed: ${processed}, skipped: ${skipped}, failed: ${failed}`);
    return { processed, skipped, failed };
  }

  // ─── GAP 2: Task comment webhook — full parity logic ──────────────────────

  async handleTaskCommentWebhook(payload: any): Promise<{ action: string; detail?: string }> {
    const settings = await this.getSettings();
    const creds = this.getWebhookCreds();

    // Extract fields from Bitrix24 webhook payload
    const taskId: string = payload?.data?.FIELDS_AFTER?.TASK_ID
      || payload?.data?.FIELDS?.TASK_ID
      || payload?.TASK_ID || '';

    const comment: string = (payload?.data?.FIELDS_AFTER?.POST_MESSAGE || '').toLowerCase();
    const responsibleUserId: string = payload?.data?.FIELDS_AFTER?.CREATED_BY
      || payload?.data?.FIELDS?.CREATED_BY || '';
    const leadId: string = payload?.data?.LEAD_ID || payload?.LEAD_ID || '';

    // ── COMPLETED ──
    if (comment.includes('complete') || comment.includes('done') || comment.includes('finished')) {
      this.logger.log(`Task ${taskId} completed via webhook`);

      // Find who owns this task in our assignment log
      if (leadId) {
        const lastAssignment = await this.assignmentLog.findFirst({
          where: { lead_id: String(leadId) },
          orderBy: { assigned_at: 'desc' },
        });
        if (lastAssignment) {
          const agent = await this.agent.findUnique({ where: { id: lastAssignment.agent_id } });
          if (agent) {
            // Add this agent to the completed queue — they get priority on next overdue lead
            await this.addToCompletedQueue(agent.id, agent.name, agent.team, String(leadId));
          }
        }
        // Change lead stage to IN_PROCESS (matches old system behaviour)
        await this.changeLeadStage(String(leadId), 'IN_PROCESS', creds);
      }

      return { action: 'completed' };
    }

    // ── OVERDUE ──
    if (comment.includes('overdue') || comment.includes('expired') || comment.includes('deadline')) {
      this.logger.log(`Overdue task ${taskId} detected via webhook`);

      if (!leadId) return { action: 'received', detail: 'no lead_id in payload' };

      const lastAssignment = await this.assignmentLog.findFirst({
        where: { lead_id: String(leadId) },
        orderBy: { assigned_at: 'desc' },
      });

      if (!lastAssignment) return { action: 'received', detail: 'no assignment log entry' };

      const agent = await this.agent.findUnique({ where: { id: lastAssignment.agent_id } });
      const maxTasks = parseInt(settings.MAX_TASKS_BEFORE_ESCALATION || '2', 10);
      const taskCount = await this.getTaskCountForLead(String(leadId), creds);

      // Try to find an agent who already completed a task (FIFO priority queue)
      const completedEntry = await this.popFromCompletedQueue(lastAssignment.team);

      if (completedEntry && taskCount < maxTasks) {
        // Re-assign to the agent who completed first
        const targetAgent = await this.agent.findUnique({ where: { id: completedEntry.agent_id } });
        if (targetAgent) {
          this.logger.log(`Overdue lead #${leadId}: re-assigning to ${targetAgent.name} (was in completed queue)`);
          await this.processLeadAssignment(String(leadId), targetAgent.team, creds);
          return { action: 'reassigned', detail: `Reassigned to ${targetAgent.name} from completed queue` };
        }
      }

      if (taskCount >= maxTasks) {
        // Escalate to Workflow Manager
        this.logger.log(`Overdue lead #${leadId}: escalating to Workflow Manager (${taskCount} tasks already)`);
        const managerId = settings.WORKFLOW_MANAGER_ID || '1';
        const lead = await this.fetchLeadDetails(String(leadId), creds);

        // Assign lead to manager in Bitrix24
        await this.assignLeadInBitrix(String(leadId), managerId, creds);

        await this.createBitrixTask(
          String(leadId),
          lead.name,
          managerId,
          creds,
          parseInt(settings.SLA_HOURS || '24', 10),
          `⚠️ Action Required: ${lead.name}`,
          `Lead "${lead.name}" has had ${taskCount} tasks and still requires attention. Please review and reassign manually.`,
        );

        // WhatsApp to manager if configured
        if (settings.WHATSAPP_ENABLED === 'true' && agent?.whatsapp_phone) {
          await this.whatsapp.sendOverdueNotification(
            agent.whatsapp_phone,
            agent.name.split(' ')[0],
            lead.name,
            lead.source,
            settings.ONCLOUD_OVERDUE_TEMPLATE || 'lead_overdue',
            settings.ONCLOUD_TEMPLATE_LANGUAGE || 'en',
          );
        }
        return { action: 'escalated', detail: `Escalated to manager ID ${managerId}` };
      }

      // Standard overdue notification — no re-assignment, just notify
      if (settings.WHATSAPP_ENABLED === 'true' && agent?.whatsapp_phone) {
        const lead = await this.fetchLeadDetails(String(leadId), creds);
        await this.whatsapp.sendOverdueNotification(
          agent.whatsapp_phone,
          agent.name.split(' ')[0],
          lead.name,
          lead.source,
          settings.ONCLOUD_OVERDUE_TEMPLATE || 'lead_overdue',
          settings.ONCLOUD_TEMPLATE_LANGUAGE || 'en',
        );
      }

      return { action: 'notified' };
    }

    return { action: 'received' };
  }

  async handleSlaBreachCheck(leadId: string, leadName: string, source: string, assignedAt: Date): Promise<void> {
    const settings = await this.getSettings();
    if (settings.WHATSAPP_ENABLED !== 'true') return;
    const slaHours = parseInt(settings.SLA_HOURS || '24', 10);
    if (new Date() < new Date(assignedAt.getTime() + slaHours * 3600 * 1000)) return;

    const lastAssignment = await this.assignmentLog.findFirst({
      where: { lead_id: leadId },
      orderBy: { assigned_at: 'desc' },
    });
    if (!lastAssignment) return;

    const agent = await this.agent.findUnique({ where: { id: lastAssignment.agent_id } });
    if (agent?.whatsapp_phone) {
      await this.whatsapp.sendOverdueNotification(
        agent.whatsapp_phone,
        agent.name.split(' ')[0],
        leadName,
        source,
        settings.ONCLOUD_OVERDUE_TEMPLATE || 'lead_overdue',
        settings.ONCLOUD_TEMPLATE_LANGUAGE || 'en',
      );
    }
  }

  async fetchWorkflowManagerTasks(leadId: string, managerId: string, creds: BitrixCreds): Promise<string[]> {
    try {
      const url = `${this.bitrixUrl('tasks.task.list', creds)}&filter[UF_CRM_TASK]=L_${leadId}&filter[RESPONSIBLE_ID]=${managerId}&select[]=ID`;
      const res = await fetch(url);
      const data = (await res.json()) as any;
      const tasks = data.result?.tasks || [];
      return tasks.map((t: any) => String(t.id));
    } catch {
      return [];
    }
  }

  async handleLeadChangeWebhook(payload: any): Promise<{ action: string; detail?: string }> {
    const settings = await this.getSettings();
    const creds = this.getWebhookCreds();

    const leadId = payload?.data?.FIELDS?.ID || payload?.FIELDS?.ID || '';
    if (!leadId) return { action: 'ignored', detail: 'No lead ID in payload' };

    const lead = await this.fetchLeadDetails(leadId, creds);
    const managerId = settings.WORKFLOW_MANAGER_ID || '1';

    // Check if the change was made by the workflow manager, and the assignee is now a salesperson (not the manager)
    if (lead.modifyById === managerId && lead.assignedById !== managerId && lead.assignedById) {
      this.logger.log(`Manual reassignment of escalated lead #${leadId} detected. Reassigned by Manager to ${lead.assignedById}`);

      // Complete manager's active tasks for this lead
      const managerTasks = await this.fetchWorkflowManagerTasks(leadId, managerId, creds);
      for (const taskId of managerTasks) {
        await this.completeTask(taskId, creds);
        this.logger.log(`Auto-completed manager task ${taskId}`);
      }

      // Create new follow-up task for the new salesperson
      const slaHours = parseInt(settings.SLA_HOURS || '24', 10);
      const taskId = await this.createBitrixTask(leadId, lead.name, lead.assignedById, creds, slaHours);
      this.logger.log(`Created follow-up task ${taskId} for new assignee ${lead.assignedById}`);

      // Log the assignment in our local logs
      const agent = await this.agent.findFirst({ where: { bitrix_user_id: lead.assignedById } });
      await this.assignmentLog.create({
        data: {
          lead_id: leadId,
          agent_id: agent?.id || 'manual-assignee',
          agent_name: agent?.name || `Bitrix User #${lead.assignedById}`,
          team: agent?.team || 'Sales Executives',
        },
      });

      return { action: 'processed', detail: `Reassigned from manager to ${lead.assignedById}` };
    }

    return { action: 'ignored', detail: 'Not a manager reassignment' };
  }
}
