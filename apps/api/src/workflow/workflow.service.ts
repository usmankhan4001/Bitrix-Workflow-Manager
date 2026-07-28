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
  LEAD_ASSIGNMENT_TEAM: 'B2C',        // default rotation team — used when a lead's source isn't in SOURCE_TEAM_MAP
  ELIGIBLE_DEPT_IDS: '[]',            // JSON array of Bitrix24 dept IDs eligible for assignment; empty = no restriction
  SOURCE_TEAM_MAP: '{}',              // JSON object mapping Bitrix source ID -> team name, e.g. {"FACEBOOK":"B2C"}
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
  private readonly teamLocks = new Map<string, Promise<unknown>>();

  // Serialize "pick next agent → assign" per team so two leads arriving close
  // together for the same team can never both read the same last-assigned
  // agent and land on the same "next" pick.
  private async withTeamLock<T>(team: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.teamLocks.get(team) ?? Promise.resolve();
    const result = previous.then(fn, fn);
    this.teamLocks.set(team, result.catch(() => undefined));
    return result;
  }

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

  // ─── Lead owner tracking (cascading-reassignment guard) ───────────────────
  // Tracks the last Bitrix ASSIGNED_BY_ID we actually observed for each lead,
  // updated whenever we assign it ourselves or process a genuine external
  // owner change. handleLeadChangeWebhook uses this to tell "the owner
  // genuinely just changed" apart from "the manager's account merely touched
  // an already-correctly-assigned lead" (a comment, an unrelated field edit,
  // another automation running under their identity) — the latter used to be
  // misread as a fresh reassignment and re-notify the current owner, which is
  // how one lead could end up cycling through several agents with no real
  // handoff happening.

  private async getKnownOwner(leadId: string): Promise<string | null> {
    const row = await this.leadOwner.findUnique({ where: { lead_id: leadId } });
    return row?.assigned_by_id ?? null;
  }

  private async setKnownOwner(leadId: string, assignedById: string): Promise<void> {
    if (!assignedById) return;
    await this.leadOwner.upsert({
      where: { lead_id: leadId },
      update: { assigned_by_id: assignedById },
      create: { lead_id: leadId, assigned_by_id: assignedById },
    });
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
    // A source explicitly mapped in SOURCE_TEAM_MAP is a deliberate routing
    // decision — a stronger, more specific signal than the coarser
    // ALLOWED_SOURCES list, so it can't be silently dropped by it.
    if (sourceId) {
      let map: Record<string, string> = {};
      try { map = JSON.parse(settings.SOURCE_TEAM_MAP || '{}'); } catch {}
      if (Object.keys(map).some((src) => src.toUpperCase() === sourceId.toUpperCase())) return true;
    }

    const allowedRaw = settings.ALLOWED_SOURCES || '[]';
    let allowed: string[] = [];
    try { allowed = JSON.parse(allowedRaw); } catch { return true; }
    if (allowed.length === 0) return true;
    if (!sourceId) return false;
    return allowed.map((s) => s.toUpperCase()).includes(sourceId.toUpperCase());
  }

  // ─── Source → Team routing ─────────────────────────────────────────────────
  // One shared ONCRMLEADADD webhook receives every lead regardless of source;
  // this decides which team's rotation a lead lands in. A source explicitly
  // mapped in SOURCE_TEAM_MAP wins; anything else falls back to the single
  // default team (LEAD_ASSIGNMENT_TEAM) so unmapped sources still get assigned
  // rather than silently escalating.

  resolveTeamForSource(sourceId: string, settings: Record<string, string>): string {
    let map: Record<string, string> = {};
    try { map = JSON.parse(settings.SOURCE_TEAM_MAP || '{}'); } catch {}
    if (sourceId) {
      const hit = Object.entries(map).find(([src]) => src.toUpperCase() === sourceId.toUpperCase());
      if (hit) return hit[1].trim();
    }
    return (settings.LEAD_ASSIGNMENT_TEAM || 'B2C').trim();
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

      // Fallback: some leads keep no phone/email on the lead itself — it lives on
      // the linked contact. Pull it from there so the alert shows a real number.
      if ((!phone || !email) && lead.CONTACT_ID) {
        const contact = await this.fetchContactComm(String(lead.CONTACT_ID), creds);
        if (!phone) phone = contact.phone;
        if (!email) email = contact.email;
      }

      // Bitrix integrations (e.g. Website / CRM form) routinely create the Lead entity first,
      // and attach the PHONE or link CONTACT_ID 1-2 seconds later via update.
      // If phone & email are empty on first fetch, pause 2 seconds and re-check once.
      if (!phone && !email) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        try {
          const resRetry = await fetch(url);
          const dataRetry = (await resRetry.json()) as any;
          const retryLead = dataRetry.result;
          if (retryLead) {
            if (retryLead.PHONE && Array.isArray(retryLead.PHONE) && retryLead.PHONE.length > 0) {
              phone = retryLead.PHONE[0]?.VALUE || '';
            }
            if (retryLead.EMAIL && Array.isArray(retryLead.EMAIL) && retryLead.EMAIL.length > 0) {
              email = retryLead.EMAIL[0]?.VALUE || '';
            }
            if ((!phone || !email) && retryLead.CONTACT_ID) {
              const contact = await this.fetchContactComm(String(retryLead.CONTACT_ID), creds);
              if (!phone) phone = contact.phone;
              if (!email) email = contact.email;
            }
          }
        } catch {}
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

  // Read phone/email from a CRM contact (used when the lead has none of its own).
  private async fetchContactComm(contactId: string, creds: BitrixCreds): Promise<{ phone: string; email: string }> {
    try {
      const sep = this.bitrixUrl('crm.contact.get', creds).includes('?') ? '&' : '?';
      const res = await fetch(`${this.bitrixUrl('crm.contact.get', creds)}${sep}id=${contactId}`);
      const data = (await res.json()) as any;
      const c = data.result || {};
      const phone = Array.isArray(c.PHONE) && c.PHONE.length > 0 ? (c.PHONE[0]?.VALUE || '') : '';
      const email = Array.isArray(c.EMAIL) && c.EMAIL.length > 0 ? (c.EMAIL[0]?.VALUE || '') : '';
      return { phone, email };
    } catch {
      return { phone: '', email: '' };
    }
  }

  // ─── Duplicate detection ───────────────────────────────────────────────────
  // The same customer often enters Bitrix as several leads from different
  // sources (e.g. Website + CRM form), sometimes seconds apart from the same
  // form submission. Bitrix's own crm.duplicate.findbycomm only searches
  // phone/email stored directly on the Lead entity — confirmed against
  // production data that this portal's web-sourced leads routinely keep that
  // data on a linked Contact instead, which the Lead-level index can't see —
  // so we also check the Contact-level index and map back to its lead(s).
  // A same-name lead created within a short recency window is checked too,
  // since that's the only remaining signal once a lead has neither Lead- nor
  // Contact-level phone/email. Any of these routes to the Escalation Manager
  // instead of round-robining a second rep to the same customer.

  private normalizeName(name: string): string {
    return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private buildDisplayName(raw: any): string {
    const contactName = [raw.NAME, raw.LAST_NAME].filter(Boolean).join(' ').trim();
    return contactName || raw.COMPANY_TITLE || raw.TITLE || `Lead #${raw.ID}`;
  }

  // Ask Bitrix's own duplicate index for other lead IDs sharing this phone/email.
  private async findDuplicateLeadIdsByType(
    type: 'PHONE' | 'EMAIL',
    leadId: string,
    value: string,
    creds: BitrixCreds,
  ): Promise<string[]> {
    if (!value) return [];
    try {
      const sep = this.bitrixUrl('crm.duplicate.findbycomm', creds).includes('?') ? '&' : '?';
      const url = `${this.bitrixUrl('crm.duplicate.findbycomm', creds)}${sep}type=${type}&entity_type=LEAD&values[]=${encodeURIComponent(value)}`;
      const res = await fetch(url);
      const data = (await res.json()) as any;
      const ids: any[] = data.result?.LEAD || [];
      return ids.map(String).filter((id) => id !== String(leadId));
    } catch (err) {
      this.logger.warn(`findDuplicateLeadIdsByType (${type}) failed for #${leadId}: ${(err as Error).message}`);
      return [];
    }
  }

  // crm.duplicate.findbycomm with entity_type=LEAD only searches phone/email
  // values stored directly on the Lead entity. Confirmed against production
  // data (2026-07-22): this portal's web-sourced leads routinely arrive with
  // no phone/email on the Lead itself — Bitrix links a Contact record and the
  // communication data lives there instead — so findDuplicateLeadIdsByType
  // above silently misses these. Searching entity_type=CONTACT finds the
  // matching contact(s), which we then map back to whatever lead(s) they're
  // linked to.
  private async findDuplicateLeadIdsViaContact(
    type: 'PHONE' | 'EMAIL',
    leadId: string,
    value: string,
    creds: BitrixCreds,
  ): Promise<string[]> {
    if (!value) return [];
    try {
      const sep = this.bitrixUrl('crm.duplicate.findbycomm', creds).includes('?') ? '&' : '?';
      const url = `${this.bitrixUrl('crm.duplicate.findbycomm', creds)}${sep}type=${type}&entity_type=CONTACT&values[]=${encodeURIComponent(value)}`;
      const res = await fetch(url);
      const data = (await res.json()) as any;
      const contactIds: any[] = data.result?.CONTACT || [];
      if (contactIds.length === 0) return [];

      const params = new URLSearchParams();
      contactIds.forEach((id: any) => params.append('filter[CONTACT_ID][]', String(id)));
      params.append('select[]', 'ID');
      const sep2 = this.bitrixUrl('crm.lead.list', creds).includes('?') ? '&' : '?';
      const res2 = await fetch(`${this.bitrixUrl('crm.lead.list', creds)}${sep2}${params.toString()}`);
      const data2 = (await res2.json()) as any;
      const leadIds: any[] = data2.result || [];
      return leadIds.map((r: any) => String(r.ID)).filter((id) => id !== String(leadId));
    } catch (err) {
      this.logger.warn(`findDuplicateLeadIdsViaContact (${type}) failed for #${leadId}: ${(err as Error).message}`);
      return [];
    }
  }

  // Recent leads (any source, no source filter — confirmed against production
  // data that the same submission can double-post under two different
  // sources, e.g. "Website" + "CRM form", seconds apart) whose display name
  // matches and which were created within the time window. Recency is what
  // makes a bare name match trustworthy instead of a coincidental namesake.
  private async findRecentLeadsByName(
    leadId: string,
    name: string,
    creds: BitrixCreds,
    windowMinutes = 30,
    limit = 50,
  ): Promise<string[]> {
    const normalizedTarget = this.normalizeName(name);
    if (!normalizedTarget) return [];
    try {
      const params = new URLSearchParams();
      params.append('order[ID]', 'DESC');
      params.append('select[]', 'ID');
      params.append('select[]', 'NAME');
      params.append('select[]', 'LAST_NAME');
      params.append('select[]', 'COMPANY_TITLE');
      params.append('select[]', 'TITLE');
      params.append('select[]', 'DATE_CREATE');
      const sep = this.bitrixUrl('crm.lead.list', creds).includes('?') ? '&' : '?';
      const res = await fetch(`${this.bitrixUrl('crm.lead.list', creds)}${sep}${params.toString()}`);
      const data = (await res.json()) as any;
      const rows: any[] = (data.result || []).slice(0, limit);
      const cutoff = Date.now() - windowMinutes * 60 * 1000;
      return rows
        .filter((r) => String(r.ID) !== String(leadId))
        .filter((r) => this.normalizeName(this.buildDisplayName(r)) === normalizedTarget)
        .filter((r) => { const t = new Date(r.DATE_CREATE).getTime(); return !isNaN(t) && t >= cutoff; })
        .map((r) => String(r.ID));
    } catch (err) {
      this.logger.warn(`findRecentLeadsByName failed for #${leadId}: ${(err as Error).message}`);
      return [];
    }
  }

  canonicalPhone(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) return '';
    return digits.slice(-10);
  }

  private async findLeadsByCanonicalPhone(
    leadId: string,
    targetCanonicalPhone: string,
    creds: BitrixCreds,
  ): Promise<string[]> {
    if (!targetCanonicalPhone) return [];
    try {
      const matchedLeadIds = new Set<string>();

      // 1. Search recent leads directly
      const leadParams = new URLSearchParams();
      leadParams.append('order[ID]', 'DESC');
      leadParams.append('select[]', 'ID');
      leadParams.append('select[]', 'PHONE');
      leadParams.append('select[]', 'CONTACT_ID');
      const sep = this.bitrixUrl('crm.lead.list', creds).includes('?') ? '&' : '?';
      const res = await fetch(`${this.bitrixUrl('crm.lead.list', creds)}${sep}${leadParams.toString()}`);
      const data = (await res.json()) as any;
      const rows: any[] = (data.result || []).slice(0, 100);

      for (const r of rows) {
        const rId = String(r.ID);
        if (rId === String(leadId)) continue;
        const phones: any[] = Array.isArray(r.PHONE) ? r.PHONE : [];
        for (const p of phones) {
          const val = p?.VALUE || '';
          if (this.canonicalPhone(val) === targetCanonicalPhone) {
            matchedLeadIds.add(rId);
            break;
          }
        }
      }

      // 2. Search recent Contacts in Bitrix via crm.contact.list
      const contactParams = new URLSearchParams();
      contactParams.append('order[ID]', 'DESC');
      contactParams.append('select[]', 'ID');
      contactParams.append('select[]', 'PHONE');
      const resContacts = await fetch(`${this.bitrixUrl('crm.contact.list', creds)}${sep}${contactParams.toString()}`);
      const dataContacts = (await resContacts.json()) as any;
      const contactRows: any[] = (dataContacts.result || []).slice(0, 100);

      const matchingContactIds = new Set<string>();
      for (const c of contactRows) {
        const cPhones: any[] = Array.isArray(c.PHONE) ? c.PHONE : [];
        for (const p of cPhones) {
          if (this.canonicalPhone(p?.VALUE || '') === targetCanonicalPhone) {
            matchingContactIds.add(String(c.ID));
            break;
          }
        }
      }

      // Map matching contacts back to their leads
      if (matchingContactIds.size > 0) {
        for (const cId of matchingContactIds) {
          const params = new URLSearchParams();
          params.append('filter[CONTACT_ID]', cId);
          params.append('select[]', 'ID');
          const res2 = await fetch(`${this.bitrixUrl('crm.lead.list', creds)}${sep}${params.toString()}`);
          const data2 = (await res2.json()) as any;
          for (const l of data2.result || []) {
            if (String(l.ID) !== String(leadId)) matchedLeadIds.add(String(l.ID));
          }
        }
      }

      return [...matchedLeadIds];
    } catch (err) {
      this.logger.warn(`findLeadsByCanonicalPhone failed for #${leadId}: ${(err as Error).message}`);
      return [];
    }
  }

  // Combines phone/email (Lead-level and Contact-level index, plus canonical phone matching)
  // with a recent name match into one comprehensive duplicate check.
  async findGuardrailDuplicates(
    leadId: string,
    lead: LeadDetails,
    creds: BitrixCreds,
  ): Promise<{ leadId: string; matchedFields: string[] }[]> {
    const matched = new Map<string, Set<string>>();
    const addMatches = (ids: string[], ...fields: string[]) => {
      for (const id of ids) {
        if (id === String(leadId)) continue;
        if (!matched.has(id)) matched.set(id, new Set());
        fields.forEach((f) => matched.get(id)!.add(f));
      }
    };

    const targetCanonical = this.canonicalPhone(lead.phone || '');

    const [phoneIds, emailIds, phoneViaContact, emailViaContact, recentNameIds, canonicalPhoneIds] = await Promise.all([
      this.findDuplicateLeadIdsByType('PHONE', leadId, lead.phone || '', creds),
      this.findDuplicateLeadIdsByType('EMAIL', leadId, lead.email || '', creds),
      this.findDuplicateLeadIdsViaContact('PHONE', leadId, lead.phone || '', creds),
      this.findDuplicateLeadIdsViaContact('EMAIL', leadId, lead.email || '', creds),
      this.findRecentLeadsByName(leadId, lead.name, creds),
      targetCanonical ? this.findLeadsByCanonicalPhone(leadId, targetCanonical, creds) : Promise.resolve([]),
    ]);
    addMatches(phoneIds, 'phone');
    addMatches(emailIds, 'email');
    addMatches(phoneViaContact, 'phone (via contact)');
    addMatches(emailViaContact, 'email (via contact)');
    addMatches(recentNameIds, 'name+recent');
    addMatches(canonicalPhoneIds, 'canonical-phone');

    return [...matched.entries()].map(([id, fields]) => ({ leadId: id, matchedFields: [...fields].sort() }));
  }


  // ─── Bitrix24 Timeline & Status Mutations ────────────────────────────────

  async addLeadTimelineComment(leadId: string, comment: string, creds: BitrixCreds): Promise<boolean> {
    try {
      const body = new URLSearchParams();
      body.append('fields[ENTITY_ID]', leadId);
      body.append('fields[ENTITY_TYPE]', 'lead');
      body.append('fields[COMMENT]', comment);
      if (creds.accessToken) body.append('auth', creds.accessToken);

      const res = await fetch(this.bitrixUrl('crm.timeline.comment.add', creds), { method: 'POST', body });
      const data = (await res.json()) as any;
      if (data.result) {
        this.logger.log(`Added timeline comment to Lead #${leadId}`);
        return true;
      }
      this.logger.warn(`addLeadTimelineComment failed for Lead #${leadId}: ${JSON.stringify(data)}`);
      return false;
    } catch (err) {
      this.logger.error(`addLeadTimelineComment error for Lead #${leadId}: ${(err as Error).message}`);
      return false;
    }
  }

  async updateLeadStatus(leadId: string, statusId: string, creds: BitrixCreds): Promise<boolean> {
    try {
      const body = new URLSearchParams();
      body.append('id', leadId);
      body.append('fields[STATUS_ID]', statusId);
      if (creds.accessToken) body.append('auth', creds.accessToken);

      const res = await fetch(this.bitrixUrl('crm.lead.update', creds), { method: 'POST', body });
      const data = (await res.json()) as any;
      if (data.result === true) {
        this.logger.log(`Updated Lead #${leadId} STATUS_ID to "${statusId}"`);
        return true;
      }
      this.logger.warn(`updateLeadStatus failed for Lead #${leadId}: ${JSON.stringify(data)}`);
      return false;
    } catch (err) {
      this.logger.error(`updateLeadStatus error for Lead #${leadId}: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Option 1: True CRM Auto-Merge & Junk Closure
   * Merges duplicate Lead #2 into Primary Lead #1 in Bitrix24:
   * 1. Posts a timeline comment on Lead #1 with Lead #2's details and source.
   * 2. Sets Lead #2 status in Bitrix24 to JUNK (STATUS_ID: "JUNK").
   * 3. Sends a WhatsApp alert to Lead #1's assigned agent (if WA enabled).
   * 4. Logs the auto-merge in the DuplicateLead database table.
   */
  private async autoMergeLead(
    leadId: string,
    lead: LeadDetails,
    primaryLeadId: string,
    matchedFields: string[],
    team: string,
    creds: BitrixCreds,
  ): Promise<{ success: boolean; skipped: boolean; message: string }> {
    this.logger.warn(`[Auto-Merge] Lead #${leadId} ("${lead.name}") matches Primary Lead #${primaryLeadId} via ${matchedFields.join(', ')}. Merging & marking #${leadId} as JUNK.`);

    // 1. Post timeline comment on Primary Lead #1 in Bitrix24
    const commentText =
      `ℹ️ [BitrixFlow Auto-Merge]\n` +
      `Customer re-submitted a lead entry via channel "${lead.source}".\n` +
      `• Duplicate Lead ID: #${leadId}\n` +
      `• Name: ${lead.name}\n` +
      `• Phone: ${lead.phone || 'N/A'}\n` +
      `• Email: ${lead.email || 'N/A'}\n` +
      `• Matched via: ${matchedFields.join(', ')}\n` +
      `• Auto-Action: Marked Lead #${leadId} as JUNK in Bitrix24. Primary ownership remains unchanged.`;

    await this.addLeadTimelineComment(primaryLeadId, commentText, creds);

    // 2. Set Duplicate Lead #2 status to JUNK in Bitrix24
    await this.updateLeadStatus(leadId, 'JUNK', creds);

    // 3. Notify owner of Primary Lead #1 via WhatsApp if enabled
    try {
      const primaryLead = await this.fetchLeadDetails(primaryLeadId, creds);
      if (primaryLead.assignedById) {
        const ownerAgent = await this.agent.findFirst({ where: { bitrix_user_id: String(primaryLead.assignedById) } });
        const settings = await this.getSettings();
        if (ownerAgent && settings.WHATSAPP_ENABLED === 'true' && ownerAgent.whatsapp_phone) {
          await this.whatsapp.sendLeadAssignedNotification(
            ownerAgent.whatsapp_phone,
            ownerAgent.name,
            `${lead.name} (Re-engaged via ${lead.source})`,
            lead.phone || '',
            0,
            lead.source,
          );
        }
      }
    } catch (err) {
      this.logger.warn(`WhatsApp notification for auto-merge failed: ${(err as Error).message}`);
    }

    // 4. Record the auto-merge in DuplicateLead database table
    await this.duplicateLead.upsert({
      where: { lead_id: String(leadId) },
      update: {
        matched_lead_ids: JSON.stringify([String(primaryLeadId)]),
        matched_fields: JSON.stringify(matchedFields),
        team,
        auto_merged: true,
        resolved: true,
        resolved_at: new Date(),
      },
      create: {
        lead_id: String(leadId),
        lead_name: lead.name,
        team,
        matched_lead_ids: JSON.stringify([String(primaryLeadId)]),
        matched_fields: JSON.stringify(matchedFields),
        auto_merged: true,
        resolved: true,
        resolved_at: new Date(),
      },
    });

    return {
      success: true,
      skipped: true,
      message: `Auto-merged into Primary Lead #${primaryLeadId} — timeline comment added and Lead #${leadId} set to JUNK in Bitrix24.`,
    };
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

  // Add a user as an observer (auditor) on an existing Bitrix task.
  async addTaskAuditor(taskId: string, userId: string, creds: BitrixCreds): Promise<boolean> {
    try {
      const body = new URLSearchParams();
      body.append('taskId', taskId);
      body.append('fields[AUDITORS][0]', userId);
      if (creds.accessToken) body.append('auth', creds.accessToken);
      const res = await fetch(this.bitrixUrl('tasks.task.update', creds), { method: 'POST', body });
      const data = (await res.json()) as any;
      return !data.error;
    } catch (err) {
      this.logger.warn(`addTaskAuditor failed for task ${taskId}: ${(err as Error).message}`);
      return false;
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
    team: string | undefined,
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

    let phoneLockKey: string | null = null;

    try {
      // Idempotency guard. A lead already logged for this exact agent must never
      // produce a second task/WhatsApp/log row
      const existingLog = await this.assignmentLog.findFirst({
        where: { lead_id: cleanLeadId },
        orderBy: { assigned_at: 'desc' },
      });
      if (existingLog) {
        const targetId = targetAgent ? (targetAgent.id || 'manual-assignee') : null;
        const alreadyOnTarget = targetId ? existingLog.agent_id === targetId : !force;
        if (alreadyOnTarget) {
          this.logger.log(`Lead #${cleanLeadId} is already assigned to ${existingLog.agent_name}. Skipping duplicate assignment.`);
          return { success: true, skipped: true, message: `Lead already assigned to ${existingLog.agent_name}` };
        }
      }

      // Fetch lead details up front — needed for routing, phone locking, and deduplication.
      const lead = await this.fetchLeadDetails(cleanLeadId, creds);

      // Phone-Level Concurrency Lock: If another lead with the exact same canonical phone
      // is being processed right now, wait up to 3 seconds for it to finish so deduplication
      // sees the newly assigned primary lead.
      const cPhone = this.canonicalPhone(lead.phone || '');
      if (cPhone) {
        phoneLockKey = `phone_${cPhone}`;
        let waits = 0;
        while (this.activeAssignments.has(phoneLockKey) && waits < 6) {
          await new Promise((res) => setTimeout(res, 500));
          waits++;
        }
        this.activeAssignments.add(phoneLockKey);
      }

      // Already flagged as a duplicate on a previous pass
      if (!force) {
        const existingFlag = await this.duplicateLead.findUnique({ where: { lead_id: cleanLeadId } });
        if (existingFlag) {
          const matches = JSON.parse(existingFlag.matched_lead_ids || '[]').join(', ');
          return { success: true, skipped: true, message: `Lead flagged as duplicate of ${matches} — left unassigned` };
        }
      }

      // Skip sources outside the allow-list (empty list = all allowed)
      if (!force && !this.isSourceAllowed(lead.sourceId, settings)) {
        this.logger.log(`Lead #${cleanLeadId} skipped — source "${lead.sourceId}" is not allowed`);
        return { success: true, skipped: true, message: `Source "${lead.sourceId}" is not allowed` };
      }

      // Resolve the target team from the lead's own source unless the caller
      // pinned one explicitly (e.g. handleLeadChangeWebhook routing to the rep's
      // existing team). This is what lets one shared ONCRMLEADADD webhook route
      // every source to the right team instead of everything piling into a
      // single global team.
      const resolvedTeam = (team ? team.trim() : '') || this.resolveTeamForSource(lead.sourceId, settings);

      const slaHours = parseInt(settings.SLA_HOURS || '24', 10);

      // Directed re-assignment (e.g. the Escalation Manager picked a rep) — assign
      // straight to that agent and (re)start their follow-up workflow.
      if (targetAgent) {
        return this.assignToAgent(cleanLeadId, lead, targetAgent, resolvedTeam, slaHours, settings, creds, 'manager reassignment');
      }

      // ── Routing — the Escalation Manager is the catch-all. Anything that can't be
      // cleanly round-robin assigned to an active agent goes to the Manager. ──

      // Out of business hours → Queue for automatic round-robin assignment when business hours open.
      if (!force && !this.isWithinBusinessHours(settings)) {
        await this.storeLateLeadIfAbsent(cleanLeadId);
        this.logger.log(`Lead #${cleanLeadId} ("${lead.name}") queued — arrived outside business hours.`);
        return { success: true, queued: true, message: 'Arrived outside business hours — queued for automatic round-robin at business open' };
      }

      // Duplicate guardrail — Auto-Merge Lead #2 into Primary Lead #1 and set Lead #2 status to JUNK
      const duplicates = await this.findGuardrailDuplicates(cleanLeadId, lead, creds);
      if (duplicates.length > 0) {
        const primaryLeadId = duplicates[0].leadId;
        const matchedFields = [...new Set(duplicates.flatMap((d) => d.matchedFields))];
        return this.autoMergeLead(cleanLeadId, lead, primaryLeadId, matchedFields, resolvedTeam, creds);
      }

      // Fresh lead → round-robin to the next active agent. Locked per-team so
      // concurrent leads for the same team can't both pick the same agent.
      return this.withTeamLock(resolvedTeam, async () => {
        const agent = await this.pickNextAgent(resolvedTeam);
        if (!agent) {
          await this.storeLateLeadIfAbsent(cleanLeadId);
          this.logger.warn(`Lead #${cleanLeadId} ("${lead.name}") queued — no active agents in team "${resolvedTeam}".`);
          return { success: true, queued: true, message: `No active agents in team "${resolvedTeam}" — queued for round-robin when agent comes online` };
        }
        return this.assignToAgent(cleanLeadId, lead, agent, resolvedTeam, slaHours, settings, creds, 'round-robin');
      });
    } finally {
      this.activeAssignments.delete(cleanLeadId);
      if (phoneLockKey) this.activeAssignments.delete(phoneLockKey);
    }
  }

  // Assign a lead to a specific agent: update Bitrix, create the follow-up task,
  // log it, and send the WhatsApp alert. Used for round-robin and manager reassigns.
  private async assignToAgent(
    leadId: string, lead: LeadDetails, agent: any, team: string,
    slaHours: number, settings: Record<string, string>, creds: BitrixCreds, reason: string,
  ): Promise<any> {
    const [, taskId] = await Promise.all([
      this.assignLeadInBitrix(leadId, agent.bitrix_user_id, creds),
      this.createBitrixTask(leadId, lead.name, agent.bitrix_user_id, creds, slaHours),
    ]);
    await this.setKnownOwner(leadId, agent.bitrix_user_id);
    const agentId = agent.id || 'manual-assignee';
    const log = await this.assignmentLog.upsert({
      where: { lead_id_agent_id: { lead_id: leadId, agent_id: agentId } },
      update: { assigned_at: new Date() },
      create: { lead_id: leadId, agent_id: agentId, agent_name: agent.name, team },
    });
    let waNotified = false;
    if (settings.WHATSAPP_ENABLED === 'true' && agent.whatsapp_phone) {
      waNotified = await this.whatsapp.sendLeadAssignedNotification(agent.whatsapp_phone, agent.name, lead.name, lead.phone || '', slaHours, lead.source);
      if (waNotified) await this.assignmentLog.update({ where: { id: log.id }, data: { wa_notified: true } });
    }
    this.logger.log(`"${lead.name}" (${lead.source}) → ${agent.name} [${team}] (${reason}). Task: ${taskId}. WA: ${waNotified}`);
    return { success: true, agent, taskId };
  }

  // Route a lead to the Escalation Manager (out-of-hours, duplicate, or no agent).
  // The manager then sets the responsible person, which restarts the workflow via
  // handleLeadChangeWebhook.
  private async escalateToManager(
    leadId: string, lead: LeadDetails, team: string, slaHours: number,
    reason: string, settings: Record<string, string>, creds: BitrixCreds,
  ): Promise<any> {
    const managerId = settings.WORKFLOW_MANAGER_ID || '1';
    const manager = await this.agent.findFirst({ where: { bitrix_user_id: managerId } });
    this.logger.warn(`Lead #${leadId} ("${lead.name}") → Escalation Manager (${reason})`);

    const [, taskId] = await Promise.all([
      this.assignLeadInBitrix(leadId, managerId, creds),
      this.createBitrixTask(
        leadId, lead.name, managerId, creds, slaHours,
        `⚠️ Needs assignment: ${lead.name}`,
        `Lead "${lead.name}" (${lead.phone || 'no phone'}) ${reason}. Set the responsible person — the follow-up workflow starts automatically for them.`,
      ),
    ]);
    await this.setKnownOwner(leadId, managerId);
    const managerAgentId = manager?.id || 'escalation-manager';
    const log = await this.assignmentLog.upsert({
      where: { lead_id_agent_id: { lead_id: leadId, agent_id: managerAgentId } },
      update: { assigned_at: new Date() },
      create: { lead_id: leadId, agent_id: managerAgentId, agent_name: manager?.name || `Manager #${managerId}`, team },
    });
    if (settings.WHATSAPP_ENABLED === 'true' && manager?.whatsapp_phone) {
      const ok = await this.whatsapp.sendLeadAssignedNotification(manager.whatsapp_phone, manager.name, lead.name, lead.phone || '', slaHours, lead.source);
      if (ok) await this.assignmentLog.update({ where: { id: log.id }, data: { wa_notified: true } });
    }
    return { success: true, agent: manager, taskId, message: reason };
  }

  // Duplicate guardrail matched — left unassigned on purpose. No Bitrix
  // mutation at all (no ASSIGNED_BY_ID change, no task, no WhatsApp); just
  // recorded for a human to review from the Duplicates page.
  private async flagAsDuplicate(
    leadId: string,
    lead: LeadDetails,
    team: string,
    duplicates: { leadId: string; matchedFields: string[] }[],
  ): Promise<any> {
    const matchedLeadIds = duplicates.map((d) => d.leadId);
    const matchedFields = [...new Set(duplicates.flatMap((d) => d.matchedFields))];
    this.logger.warn(`Lead #${leadId} ("${lead.name}") flagged as duplicate of ${matchedLeadIds.join(', ')} — left unassigned.`);
    await this.duplicateLead.upsert({
      where: { lead_id: leadId },
      update: { matched_lead_ids: JSON.stringify(matchedLeadIds), matched_fields: JSON.stringify(matchedFields), team },
      create: {
        lead_id: leadId,
        lead_name: lead.name,
        team,
        matched_lead_ids: JSON.stringify(matchedLeadIds),
        matched_fields: JSON.stringify(matchedFields),
      },
    });
    return { success: true, skipped: true, message: `Flagged as duplicate of ${matchedLeadIds.join(', ')} — left unassigned` };
  }

  // ─── Duplicate review queue ─────────────────────────────────────────────────

  async getDuplicates(resolved?: boolean) {
    return this.duplicateLead.findMany({
      where: resolved === undefined ? {} : { resolved },
      orderBy: { detected_at: 'desc' },
    });
  }

  async resolveDuplicate(id: string) {
    return this.duplicateLead.update({ where: { id }, data: { resolved: true, resolved_at: new Date() } });
  }

  // ─── Manager reassignment → restart the workflow for the new rep ───────────
  // Fired by a Bitrix outbound webhook on lead update. When the Escalation Manager
  // changes the responsible person to someone else, we (re)start the follow-up
  // workflow (task + WhatsApp) for that new rep.
  async handleLeadChangeWebhook(payload: any): Promise<{ action: string; detail?: string }> {
    const settings = await this.getSettings();
    const creds = this.getWebhookCreds();

    const leadId = payload?.data?.FIELDS?.ID || payload?.FIELDS?.ID || payload?.lead_id || '';
    if (!leadId) return { action: 'ignored', detail: 'No lead ID in payload' };

    const lead = await this.fetchLeadDetails(String(leadId), creds);
    const managerId = settings.WORKFLOW_MANAGER_ID || '1';

    // Ignore events where the owner hasn't actually changed since we last saw
    // it — e.g. the manager commenting on or editing a lead that's already
    // correctly assigned. Without this, any such touch looks identical to a
    // deliberate reassignment and re-notifies the current owner, which is how
    // one lead could end up cycling through several agents with no real
    // handoff happening.
    const knownOwner = await this.getKnownOwner(String(leadId));
    if (knownOwner !== null && lead.assignedById && knownOwner === lead.assignedById) {
      return { action: 'ignored', detail: 'Owner unchanged since last observation' };
    }

    // Only react when the Escalation Manager handed the lead to a different person.
    if (lead.modifyById === managerId && lead.assignedById && lead.assignedById !== managerId) {
      const repAgent = await this.agent.findFirst({ where: { bitrix_user_id: lead.assignedById } });
      const team = (repAgent?.team || settings.LEAD_ASSIGNMENT_TEAM || 'B2C').trim();
      const targetAgent = repAgent || {
        id: 'manual-assignee', bitrix_user_id: lead.assignedById,
        name: `Bitrix User #${lead.assignedById}`, whatsapp_phone: null, team,
      };

      this.logger.log(`Manager reassigned lead #${leadId} → ${targetAgent.name}. Restarting workflow.`);
      const result = await this.processLeadAssignment(String(leadId), team, creds, true, targetAgent);

      // Keep the Escalation Manager in the loop on escalated leads: add them as an
      // observer on the rep's new follow-up task.
      if (result?.taskId) {
        await this.addTaskAuditor(String(result.taskId), managerId, creds);
        this.logger.log(`Added manager (${managerId}) as observer on task ${result.taskId}`);
      }

      return { action: 'restarted', detail: `Workflow restarted for ${targetAgent.name}` };
    }

    // Owner changed but not via a manager handoff we act on (e.g. a rep
    // reassigning peer-to-peer, or someone editing the lead directly in
    // Bitrix) — still record the new owner so a later manager touch with no
    // further change is correctly recognized as a no-op instead of
    // re-triggering the workflow.
    if (lead.assignedById) await this.setKnownOwner(String(leadId), lead.assignedById);

    return { action: 'ignored', detail: 'Not a manager reassignment' };
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

    this.logger.log(`Cron: processing ${leads.length} late lead(s) — team resolved per-lead by source`);
    const creds = this.getWebhookCreds();
    let processed = 0, skipped = 0, failed = 0;

    for (const lateLead of leads) {
      try {
        const result = await this.processLeadAssignment(lateLead.lead_id, undefined, creds, true);
        await this.lateLead.update({
          where: { lead_id: lateLead.lead_id },
          data: { processed: true, processed_at: new Date() },
        });
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

  async purgeStaleLateLeads(maxAgeHours = 48): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeHours * 3600 * 1000);
    const result = await this.lateLead.updateMany({
      where: { processed: false, created_at: { lt: cutoff } },
      data: { processed: true, processed_at: new Date() },
    });
    if (result.count > 0) {
      this.logger.log(`Auto-purged ${result.count} stale late lead(s) older than ${maxAgeHours} hours.`);
    }
    return result.count;
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
