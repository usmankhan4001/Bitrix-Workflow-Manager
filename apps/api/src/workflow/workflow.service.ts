import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { WhatsappService } from '../whatsapp/whatsapp.service';

const SETTING_DEFAULTS: Record<string, string> = {
  WORKFLOW_START_TIME: '09:00',
  WORKFLOW_END_TIME: '18:00',
  NOT_ALLOWED_DAYS: '[0,6]',
  WHATSAPP_ENABLED: 'false',
  SLA_HOURS: '24',
  ALLOWED_SOURCES: '[]',              // JSON array of source IDs eligible for assignment; empty = all sources allowed
  WORKFLOW_MANAGER_ID: '1',
  WORKFLOW_ENABLED: 'true',            // master on/off switch — set to 'false' to pause all lead assignment
  // Assignment scope
  LEAD_ASSIGNMENT_TEAM: 'B2C',        // rotation team that receives incoming leads
  ELIGIBLE_DEPT_IDS: '[]',            // JSON array of Bitrix24 dept IDs eligible for assignment; empty = no restriction
};

interface LeadDetails {
  name: string;
  source: string;
  sourceId: string;
  title: string;
  phone?: string;
  email?: string;
  isReturnCustomer?: boolean;
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
  private readonly activeAssignments = new Set<string>();

  constructor(private readonly whatsapp: WhatsappService) {
    super();
  }

  getPKTime(): { day: number; hour: number; minute: number } {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Karachi',
      hourCycle: 'h23',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
    });
    const parts = formatter.formatToParts(now);
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

    const weekdayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };

    const day = weekdayMap[partMap.weekday] ?? 0;
    const hour = parseInt(partMap.hour, 10);
    const minute = parseInt(partMap.minute, 10);

    return { day, hour, minute };
  }

  getPKTMidnight(): Date {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Karachi',
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(now);
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

    const isoString = `${partMap.year}-${partMap.month.padStart(2, '0')}-${partMap.day.padStart(2, '0')}T00:00:00+05:00`;
    return new Date(isoString);
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
    return this.agent.findMany({ orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }] });
  }

  async reorderAgents(orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) => this.agent.update({ where: { id }, data: { sort_order: index } }))
    );
    return this.getAgents();
  }

  async addAgent(data: { bitrix_user_id: string; name: string; team: string; whatsapp_phone?: string; department_id?: string; department_name?: string }) {
    return this.agent.create({
      data: {
        ...data,
        whatsapp_phone: data.whatsapp_phone ?? null,
        department_id: data.department_id ?? null,
        department_name: data.department_name ?? null,
        is_active: true,
      },
    });
  }

  async updateAgent(id: string, data: { name?: string; team?: string; whatsapp_phone?: string; department_id?: string; department_name?: string }) {
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
    const midnight = this.getPKTMidnight();
    return this.assignmentLog.count({ where: { assigned_at: { gte: midnight } } });
  }

  // ─── Time / Day Helpers ────────────────────────────────────────────────────

  isWithinBusinessHours(settings: Record<string, string>): boolean {
    const { day, hour, minute } = this.getPKTime();

    const notAllowed: number[] = JSON.parse(settings.NOT_ALLOWED_DAYS || '[0,6]');
    if (notAllowed.includes(day)) return false;

    const [startH, startM] = (settings.WORKFLOW_START_TIME || '09:00').split(':').map(Number);
    const [endH, endM] = (settings.WORKFLOW_END_TIME || '18:00').split(':').map(Number);

    const currentMins = hour * 60 + minute;
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    return currentMins >= startMins && currentMins < endMins;
  }

  // ─── Source allow-list ─────────────────────────────────────────────────────

  isSourceAllowed(sourceId: string, settings: Record<string, string>): boolean {
    const allowedRaw = settings.ALLOWED_SOURCES || '[]';
    let allowed: string[] = [];
    try { allowed = JSON.parse(allowedRaw); } catch { return true; }
    if (allowed.length === 0) return true;
    if (!sourceId) return false;
    return allowed.map((s) => s.toUpperCase()).includes(sourceId.toUpperCase());
  }

  // ─── Bitrix24: Source labels (live, cached) ────────────────────────────────
  // Replaces the old hardcoded SOURCE_LABELS map. Pulls human-readable names from
  // crm.status.list (ENTITY_ID=SOURCE) and caches them so we don't hit Bitrix on
  // every lead. Cache refreshes every 30 minutes.

  private sourceLabelCache: { labels: Record<string, string>; fetchedAt: number } | null = null;
  private readonly SOURCE_LABEL_TTL_MS = 30 * 60 * 1000;

  private async getSourceLabels(creds: BitrixCreds): Promise<Record<string, string>> {
    if (this.sourceLabelCache && Date.now() - this.sourceLabelCache.fetchedAt < this.SOURCE_LABEL_TTL_MS) {
      return this.sourceLabelCache.labels;
    }
    try {
      const sep = this.bitrixUrl('crm.status.list', creds).includes('?') ? '&' : '?';
      const url = `${this.bitrixUrl('crm.status.list', creds)}${sep}filter[ENTITY_ID]=SOURCE`;
      const res = await fetch(url);
      const data = (await res.json()) as any;
      const labels: Record<string, string> = {};
      for (const s of data.result || []) labels[s.STATUS_ID] = s.NAME;
      this.sourceLabelCache = { labels, fetchedAt: Date.now() };
      return labels;
    } catch (err) {
      this.logger.warn(`getSourceLabels failed: ${(err as Error).message}`);
      return this.sourceLabelCache?.labels || {};
    }
  }

  // ─── Bitrix24: Lead details ────────────────────────────────────────────────

  async fetchLeadDetails(leadId: string, creds: BitrixCreds): Promise<LeadDetails> {
    try {
      const separator = this.bitrixUrl('crm.lead.get', creds).includes('?') ? '&' : '?';
      const url = `${this.bitrixUrl('crm.lead.get', creds)}${separator}id=${leadId}`;
      const res = await fetch(url);
      const data = (await res.json()) as any;
      const lead = data.result;
      if (!lead) return { name: `Lead #${leadId}`, source: 'CRM', sourceId: '', title: `Lead #${leadId}` };

      const contactName = [lead.NAME, lead.LAST_NAME].filter(Boolean).join(' ').trim();
      const displayName = contactName || lead.COMPANY_TITLE || lead.TITLE || `Lead #${leadId}`;
      const sourceId = lead.SOURCE_ID || '';
      const sourceLabels = await this.getSourceLabels(creds);
      const sourceLabel = sourceLabels[sourceId] || lead.SOURCE_DESCRIPTION || sourceId || 'CRM';

      let phone = '';
      if (lead.PHONE && Array.isArray(lead.PHONE) && lead.PHONE.length > 0) {
        phone = lead.PHONE[0]?.VALUE || '';
      }
      let email = '';
      if (lead.EMAIL && Array.isArray(lead.EMAIL) && lead.EMAIL.length > 0) {
        email = lead.EMAIL[0]?.VALUE || '';
      }

      return {
        name: displayName,
        source: sourceLabel,
        sourceId,
        title: lead.TITLE || displayName,
        phone,
        email,
        isReturnCustomer: lead.IS_RETURN_CUSTOMER === 'Y',
        assignedById: lead.ASSIGNED_BY_ID,
        modifyById: lead.MODIFY_BY_ID,
      };
    } catch (err) {
      this.logger.warn(`fetchLeadDetails failed for #${leadId}: ${(err as Error).message}`);
      return { name: `Lead #${leadId}`, source: 'CRM', sourceId: '', title: `Lead #${leadId}` };
    }
  }

  // ─── Duplicate detection & sticky ownership ────────────────────────────────
  // The same customer often enters Bitrix as several leads from different sources
  // (e.g. Website + CRM form). To prevent two reps fighting over one customer, a
  // duplicate is routed to the rep who ALREADY owns that customer (sticky
  // ownership). If that owner is inactive/unknown, it goes to the Escalation
  // Manager. Matching is by phone or email (Bitrix's own repeat flag is ignored —
  // the app stays in control).

  // Ask Bitrix for other lead IDs that share this phone/email (excludes the lead itself).
  private async findDuplicateLeadIds(
    leadId: string,
    phone: string,
    email: string,
    creds: BitrixCreds,
  ): Promise<string[]> {
    const matches = new Set<string>();
    const lookups: Array<{ type: string; value: string }> = [];
    if (phone) lookups.push({ type: 'PHONE', value: phone });
    if (email) lookups.push({ type: 'EMAIL', value: email });

    for (const { type, value } of lookups) {
      try {
        const sep = this.bitrixUrl('crm.duplicate.findbycomm', creds).includes('?') ? '&' : '?';
        const url = `${this.bitrixUrl('crm.duplicate.findbycomm', creds)}${sep}type=${type}&entity_type=LEAD&values[]=${encodeURIComponent(value)}`;
        const res = await fetch(url);
        const data = (await res.json()) as any;
        const ids: any[] = data.result?.LEAD || [];
        for (const id of ids) {
          if (String(id) !== String(leadId)) matches.add(String(id));
        }
      } catch (err) {
        this.logger.warn(`findDuplicateLeadIds (${type}) failed for #${leadId}: ${(err as Error).message}`);
      }
    }
    return [...matches];
  }

  // Given the existing duplicate lead IDs, find the ACTIVE agent who owns the
  // customer. Prefers our own assignment log (most recent), then falls back to the
  // existing lead's Bitrix ASSIGNED_BY_ID. Returns null if no active owner found.
  private async resolveDuplicateOwner(dupLeadIds: string[], creds: BitrixCreds): Promise<any | null> {
    // 1) Our assignment log — who did WE assign these duplicate leads to?
    const logs = await this.assignmentLog.findMany({
      where: { lead_id: { in: dupLeadIds } },
      orderBy: { assigned_at: 'desc' },
    });
    for (const log of logs) {
      const agent = await this.agent.findUnique({ where: { id: log.agent_id } });
      if (agent && agent.is_active) return agent;
    }

    // 2) Fall back to the existing lead's responsible person in Bitrix
    for (const dupId of dupLeadIds) {
      const dupLead = await this.fetchLeadDetails(dupId, creds);
      if (dupLead.assignedById) {
        const agent = await this.agent.findFirst({ where: { bitrix_user_id: dupLead.assignedById } });
        if (agent && agent.is_active) return agent;
      }
    }

    return null;
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
      const body = new URLSearchParams();
      body.append('fields[TITLE]', titleOverride || `Follow up: ${leadName}`);
      body.append('fields[DESCRIPTION]', descriptionOverride || `Please contact ${leadName} and update the lead status in Bitrix24 within ${deadlineHours} hours.`);
      body.append('fields[RESPONSIBLE_ID]', assigneeUserId);
      // NOTE: CREATED_BY is intentionally left unset so the task is created by the
      // webhook/integration account. Setting it to another user makes Bitrix reject
      // tasks.task.add unless that account has impersonation rights.
      body.append('fields[DEADLINE]', deadline);
      body.append('fields[UF_CRM_TASK][0]', `L_${leadId}`);
      body.append('fields[ALLOW_CHANGE_DEADLINE]', 'N');

      if (creds.accessToken) body.append('auth', creds.accessToken);
      const res = await fetch(this.bitrixUrl('tasks.task.add', creds), { method: 'POST', body });
      const data = (await res.json()) as any;
      if (data.result?.task?.id) return String(data.result.task.id);
      this.logger.warn(`createBitrixTask unexpected response: ${JSON.stringify(data)}`);
      return null;
    } catch (err) {
      this.logger.error(`createBitrixTask failed: ${(err as Error).message}`);
      return null;
    }
  }

  // ─── Round-Robin Pick ──────────────────────────────────────────────────────

  async pickNextAgent(team: string): Promise<any | null> {
    const settings = await this.getSettings();
    let deptFilter: string[] = [];
    try { deptFilter = JSON.parse(settings.ELIGIBLE_DEPT_IDS || '[]'); } catch {}

    const agents = await this.agent.findMany({
      where: {
        team,
        is_active: true,
        ...(deptFilter.length > 0 ? { department_id: { in: deptFilter } } : {}),
      },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
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
    targetAgent?: any,
  ): Promise<{ success: boolean; agent?: any; taskId?: string | null; skipped?: boolean; queued?: boolean; message?: string }> {
    const settings = await this.getSettings();

    if (settings.WORKFLOW_ENABLED !== 'true') {
      this.logger.log(`Lead #${leadId} skipped — workflow engine is paused`);
      return { success: false, message: 'Workflow engine is paused' };
    }

    const cleanLeadId = String(leadId);

    // Concurrency Lock: Serialize concurrent calls for the same lead
    if (this.activeAssignments.has(cleanLeadId)) {
      this.logger.log(`Lead #${cleanLeadId} assignment is already in progress. Skipping concurrent request.`);
      return { success: false, message: 'Assignment already in progress' };
    }
    this.activeAssignments.add(cleanLeadId);

    try {
      // Prevent duplicate assignment if not forced and not a specific reassignment
      if (!force && !targetAgent) {
        const existing = await this.assignmentLog.findFirst({
          where: { lead_id: cleanLeadId },
        });
        if (existing) {
          this.logger.log(`Lead #${cleanLeadId} has already been assigned to ${existing.agent_name}. Skipping.`);
          return { success: true, skipped: true, message: `Lead already assigned to ${existing.agent_name}` };
        }
      }

      // Gap 2: Queue leads arriving outside business hours if not forced
      if (!force && !this.isWithinBusinessHours(settings)) {
        this.logger.log(`Lead #${cleanLeadId} arrived outside business hours. Queueing in LateLead...`);
        await this.storeLateLeadIfAbsent(cleanLeadId);
        return { success: true, queued: true, message: 'Outside business hours, lead queued.' };
      }

      // Skip sources outside the allow-list (empty list = all allowed)
      const lead = await this.fetchLeadDetails(cleanLeadId, creds);
      if (!force && !this.isSourceAllowed(lead.sourceId, settings)) {
        this.logger.log(`Lead #${cleanLeadId} skipped — source "${lead.sourceId}" is not allowed`);
        await this.lateLead.updateMany({ where: { lead_id: cleanLeadId }, data: { processed: true, processed_at: new Date() } });
        return { success: true, skipped: true, message: `Source "${lead.sourceId}" is not allowed` };
      }

      const slaHours = parseInt(settings.SLA_HOURS || '24', 10);

      // Decide who receives the lead.
      let agent: any = targetAgent;
      let assignReason = 'round-robin';
      let duplicateOf: string[] = [];

      if (!agent && !force) {
        // Duplicate? (same customer by phone/email) → sticky ownership.
        duplicateOf = await this.findDuplicateLeadIds(cleanLeadId, lead.phone || '', lead.email || '', creds);
        if (duplicateOf.length > 0) {
          agent = await this.resolveDuplicateOwner(duplicateOf, creds);
          assignReason = agent
            ? `duplicate of lead(s) ${duplicateOf.join(', ')} → existing owner ${agent.name}`
            : `duplicate of lead(s) ${duplicateOf.join(', ')} → owner inactive/unknown`;
        }
      }

      // Fresh lead → normal round-robin.
      if (!agent && duplicateOf.length === 0) {
        agent = await this.pickNextAgent(team);
      }

      // Manager fallback: no active agents, OR a duplicate whose owner is gone.
      if (!agent) {
        const managerId = settings.WORKFLOW_MANAGER_ID || '1';
        const manager = await this.agent.findFirst({ where: { bitrix_user_id: managerId } });
        const isDup = duplicateOf.length > 0;
        const reason = isDup ? assignReason : `no active agents in team "${team}"`;
        this.logger.warn(`Lead #${cleanLeadId} ("${lead.name}") → Escalation Manager (${reason})`);

        const title = isDup ? `⚠️ Duplicate lead — review: ${lead.name}` : `⚠️ No agent available: ${lead.name}`;
        const desc = isDup
          ? `Lead "${lead.name}" is a duplicate of ${duplicateOf.join(', ')} but its previous owner is inactive/unknown. Please review, merge, or assign.`
          : `No active sales agent was available in team "${team}" to take lead "${lead.name}". Please assign it manually.`;

        const [, mgrTaskId] = await Promise.all([
          this.assignLeadInBitrix(cleanLeadId, managerId, creds),
          this.createBitrixTask(cleanLeadId, lead.name, managerId, creds, slaHours, title, desc),
        ]);

        const mlog = await this.assignmentLog.create({
          data: { lead_id: cleanLeadId, agent_id: manager?.id || 'escalation-manager', agent_name: manager?.name || `Manager #${managerId}`, team },
        });
        await this.lateLead.updateMany({ where: { lead_id: cleanLeadId }, data: { processed: true, processed_at: new Date() } });

        if (settings.WHATSAPP_ENABLED === 'true' && manager?.whatsapp_phone) {
          const ok = await this.whatsapp.sendLeadAssignedNotification(manager.whatsapp_phone, manager.name, lead.name, lead.phone || '', slaHours);
          if (ok) await this.assignmentLog.update({ where: { id: mlog.id }, data: { wa_notified: true } });
        }

        return { success: true, agent: manager, taskId: mgrTaskId, message: reason };
      }

      // Assign to the chosen agent (round-robin or sticky-ownership owner).
      const [, taskId] = await Promise.all([
        this.assignLeadInBitrix(cleanLeadId, agent.bitrix_user_id, creds),
        this.createBitrixTask(cleanLeadId, lead.name, agent.bitrix_user_id, creds, slaHours),
      ]);

      const log = await this.assignmentLog.create({
        data: { lead_id: cleanLeadId, agent_id: agent.id, agent_name: agent.name, team },
      });

      await this.lateLead.updateMany({
        where: { lead_id: cleanLeadId },
        data: { processed: true, processed_at: new Date() },
      });

      // WhatsApp notification
      let waNotified = false;
      if (settings.WHATSAPP_ENABLED === 'true' && agent.whatsapp_phone) {
        waNotified = await this.whatsapp.sendLeadAssignedNotification(agent.whatsapp_phone, agent.name, lead.name, lead.phone || '', slaHours);
        if (waNotified) {
          await this.assignmentLog.update({ where: { id: log.id }, data: { wa_notified: true } });
        }
      }

      this.logger.log(`"${lead.name}" (${lead.source}) → ${agent.name} [${team}] (${assignReason}). Task: ${taskId}. WA: ${waNotified}`);
      return { success: true, agent, taskId };
    } finally {
      this.activeAssignments.delete(cleanLeadId);
    }
  }

  // ─── GAP 1: Cron — Process all queued late leads ──────────────────────────
  // Called by CronService at WORKFLOW_START_TIME every enabled day

  async processAllLateLeads(): Promise<{ processed: number; skipped: number; failed: number }> {
    const leads = await this.getLateLeads();
    if (leads.length === 0) {
      this.logger.log('Cron: no late leads to process');
      return { processed: 0, skipped: 0, failed: 0 };
    }

    const settings = await this.getSettings();

    if (settings.WORKFLOW_ENABLED !== 'true') {
      this.logger.log('Cron: skipped — workflow engine is paused');
      return { processed: 0, skipped: leads.length, failed: 0 };
    }

    const defaultTeam = settings.LEAD_ASSIGNMENT_TEAM || 'B2C';
    this.logger.log(`Cron: processing ${leads.length} late lead(s) → team "${defaultTeam}"`);
    const creds = this.getWebhookCreds();
    let processed = 0, skipped = 0, failed = 0;

    for (const lateLead of leads) {
      try {
        const result = await this.processLeadAssignment(lateLead.lead_id, defaultTeam, creds, true);
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

  // ─── Dashboard Status (combined snapshot for the UI) ────────────────────────

  async getWorkflowStatus(): Promise<any> {
    const settings = await this.getSettings();
    const team = settings.LEAD_ASSIGNMENT_TEAM || 'B2C';
    const engineEnabled = settings.WORKFLOW_ENABLED !== 'false';

    // Get agents for the active team
    let deptFilter: string[] = [];
    try { deptFilter = JSON.parse(settings.ELIGIBLE_DEPT_IDS || '[]'); } catch {}
    const agents = await this.agent.findMany({
      where: {
        team,
        is_active: true,
        ...(deptFilter.length > 0 ? { department_id: { in: deptFilter } } : {}),
      },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    });

    const totalAgents = await this.agent.count({ where: { team } });

    // Find last assignment and next agent
    const lastLog = await this.assignmentLog.findFirst({
      where: { team },
      orderBy: { assigned_at: 'desc' },
    });

    let lastAssigned: any = null;
    let nextAgent: any = null;
    if (lastLog) {
      lastAssigned = { id: lastLog.agent_id, name: lastLog.agent_name };
      const lastIdx = agents.findIndex(a => a.id === lastLog.agent_id);
      const nextIdx = (lastIdx + 1) % agents.length;
      if (agents[nextIdx]) {
        nextAgent = { id: agents[nextIdx].id, name: agents[nextIdx].name };
      }
    } else if (agents.length > 0) {
      nextAgent = { id: agents[0].id, name: agents[0].name };
    }

    // Queue depth
    const queueDepth = await this.lateLead.count({ where: { processed: false } });

    // Assigned today count
    const midnight = this.getPKTMidnight();
    const assignedToday = await this.assignmentLog.count({ where: { assigned_at: { gte: midnight } } });

    // Per-agent workload today
    const todayLogs = await this.assignmentLog.findMany({ where: { assigned_at: { gte: midnight } } });
    const workloadMap: Record<string, { name: string; count: number }> = {};
    for (const log of todayLogs) {
      if (!workloadMap[log.agent_id]) workloadMap[log.agent_id] = { name: log.agent_name, count: 0 };
      workloadMap[log.agent_id].count++;
    }
    const agentWorkload = Object.values(workloadMap).sort((a, b) => b.count - a.count);

    // Dynamic teams list
    const allAgents = await this.agent.findMany({ select: { team: true } });
    const teams = [...new Set(allAgents.map(a => a.team))].sort();

    return {
      engineEnabled,
      assignmentTeam: team,
      withinBusinessHours: this.isWithinBusinessHours(settings),
      lastAssigned,
      nextAgent,
      activeAgentCount: agents.length,
      totalAgentCount: totalAgents,
      queueDepth,
      assignedToday,
      agentWorkload,
      teams,
      agents: agents.map(a => ({ id: a.id, name: a.name, team: a.team, is_active: a.is_active })),
    };
  }

  // ─── Dynamic Teams ──────────────────────────────────────────────────────────

  async getTeams(): Promise<string[]> {
    const allAgents = await this.agent.findMany({ select: { team: true } });
    return [...new Set(allAgents.map(a => a.team))].sort();
  }

  async clearQueue() {
    const result = await this.lateLead.updateMany({
      where: { processed: false },
      data: { processed: true, processed_at: new Date() }
    });
    this.logger.log(`Cleared ${result.count} leads from the queue without assigning them.`);
    return { success: true, clearedCount: result.count };
  }
}
