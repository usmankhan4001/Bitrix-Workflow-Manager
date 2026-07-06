import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BitrixService {
  private readonly logger = new Logger(BitrixService.name);

  // Resolves the webhook base URL whether the token is a full URL or just the token part
  private resolveWebhookBase(webhookToken: string, portalUrl: string): string {
    // Full URL already: https://pcicrm.bitrix24.com/rest/11/xxxtoken/
    if (webhookToken.startsWith('http')) {
      return webhookToken.replace(/\/$/, ''); // strip trailing slash
    }
    // Just the token part: 11/xxxtoken
    return `${portalUrl}/rest/${webhookToken}`.replace(/\/$/, '');
  }

  // Fetch users + departments via inbound webhook (no OAuth)
  async getWebhookUsers(webhookToken: string, portalUrl: string): Promise<any[]> {
    const base = this.resolveWebhookBase(webhookToken, portalUrl);
    const users: any[] = [];
    let start = 0;
    while (true) {
      const res = await fetch(`${base}/user.get.json?ACTIVE=Y&start=${start}`);
      const data = (await res.json()) as any;
      if (!data.result?.length) break;
      users.push(...data.result);
      if (!data.next) break;
      start = data.next;
    }
    return users;
  }

  async getWebhookDepartments(webhookToken: string, portalUrl: string): Promise<any[]> {
    const base = this.resolveWebhookBase(webhookToken, portalUrl);
    try {
      const res = await fetch(`${base}/department.get.json`);
      if (!res.ok) {
        this.logger.warn(`department.get returned ${res.status} — webhook may be missing "department" scope`);
        return [];
      }
      const data = (await res.json()) as any;
      if (data.error) {
        this.logger.warn(`department.get error: ${data.error_description || data.error}`);
        return [];
      }
      return data.result || [];
    } catch (err) {
      this.logger.warn(`getWebhookDepartments failed: ${(err as Error).message}`);
      return [];
    }
  }

  async getWebhookSources(webhookToken: string, portalUrl: string): Promise<any[]> {
    const base = this.resolveWebhookBase(webhookToken, portalUrl);
    try {
      const res = await fetch(`${base}/crm.status.list.json?filter[ENTITY_ID]=SOURCE`);
      if (!res.ok) {
        this.logger.warn(`crm.status.list returned ${res.status} — webhook may be missing "crm" scope`);
        return [];
      }
      const data = (await res.json()) as any;
      if (data.error) {
        this.logger.warn(`crm.status.list error: ${data.error_description || data.error}`);
        return [];
      }
      const statuses = data.result || [];
      return statuses.map((s: any) => ({ id: s.STATUS_ID, name: s.NAME }));
    } catch (err) {
      this.logger.warn(`getWebhookSources failed: ${(err as Error).message}`);
      return [];
    }
  }

  // Build a department name map from user UF_DEPARTMENT IDs
  // Used as fallback when department.get is not permitted
  buildDeptMapFromUsers(users: any[]): Record<number, string> {
    const map: Record<number, string> = {};
    for (const u of users) {
      const deptIds: number[] = u.UF_DEPARTMENT || [];
      for (const id of deptIds) {
        if (!map[id]) map[id] = `Department ${id}`;
      }
    }
    return map;
  }
}
