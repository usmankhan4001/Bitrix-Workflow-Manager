import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BitrixService {
  private readonly logger = new Logger(BitrixService.name);

  // Exchange auth code for tokens
  async exchangeAuthCode(code: string, domain: string): Promise<any> {
    const clientId = process.env.BITRIX_CLIENT_ID;
    const clientSecret = process.env.BITRIX_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Bitrix credentials not configured');
    }

    try {
      const url = `https://${domain}/oauth/token/?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      this.logger.log(`Successfully authenticated via domain: ${domain}`);
      return data;
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Error exchanging auth code: ${msg}`);
      throw error;
    }
  }

  // Example method to get user info after auth
  async getCurrentUser(accessToken: string, domain: string) {
    const url = `https://${domain}/rest/user.current.json?auth=${accessToken}`;
    const response = await fetch(url);
    return await response.json();
  }

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

  // Fetch leads from Bitrix24
  async getLeads(accessToken: string, domain: string) {
    // Note: crm.lead.list returns a list of leads
    const url = `https://${domain}/rest/crm.lead.list.json?auth=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error_description || data.error);
    }
    
    return data;
  }
}
