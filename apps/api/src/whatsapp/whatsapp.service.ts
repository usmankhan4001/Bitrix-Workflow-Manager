import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl = 'https://apps.oncloudapi.com';

  private getToken(): string {
    return process.env.ONCLOUD_API_TOKEN || '';
  }

  async sendTemplateMessage(
    phone: string,
    templateName: string,
    templateLanguage: string,
    bodyParams: string[],
  ): Promise<boolean> {
    const token = this.getToken();
    if (!token) {
      this.logger.warn('ONCLOUD_API_TOKEN not set — skipping WhatsApp notification');
      return false;
    }

    const components = [
      {
        type: 'body',
        parameters: bodyParams.map((text) => ({ type: 'text', text })),
      },
    ];

    try {
      const res = await fetch(`${this.baseUrl}/api/wpbox/sendtemplatemessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          phone,
          template_name: templateName,
          template_language: templateLanguage,
          components,
        }),
      });
      const data = (await res.json()) as any;
      if (data.status === 'success' || data.message_id) {
        this.logger.log(`WhatsApp sent to ${phone} via template "${templateName}"`);
        return true;
      }
      this.logger.warn(`WhatsApp API non-success: ${JSON.stringify(data)}`);
      return false;
    } catch (err) {
      this.logger.error(`WhatsApp send failed: ${(err as Error).message}`);
      return false;
    }
  }

  // Params sent: {{1}} Agent first name  {{2}} Lead name/title  {{3}} Source
  async sendLeadAssignedNotification(
    agentPhone: string,
    agentFirstName: string,
    leadName: string,
    source: string,
    templateName: string,
    templateLanguage = 'en',
  ): Promise<boolean> {
    return this.sendTemplateMessage(agentPhone, templateName, templateLanguage, [
      agentFirstName,
      leadName,
      source,
    ]);
  }

  // Params sent: {{1}} Agent first name  {{2}} Lead name/title  {{3}} Source
  async sendOverdueNotification(
    agentPhone: string,
    agentFirstName: string,
    leadName: string,
    source: string,
    templateName: string,
    templateLanguage = 'en',
  ): Promise<boolean> {
    return this.sendTemplateMessage(agentPhone, templateName, templateLanguage, [
      agentFirstName,
      leadName,
      source,
    ]);
  }

  async testConnection(_phone: string): Promise<{ success: boolean; message: string }> {
    const token = this.getToken();
    if (!token) return { success: false, message: 'ONCLOUD_API_TOKEN not configured' };
    try {
      const res = await fetch(`${this.baseUrl}/api/wpbox/getTemplates?token=${token}`);
      const data = (await res.json()) as any;
      if (data.status === 'success' || Array.isArray(data.templates)) {
        return { success: true, message: `Connected. ${data.templates?.length ?? 0} templates found.` };
      }
      return { success: false, message: data.message || 'Unexpected response' };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  }

  async getTemplates(): Promise<any[]> {
    const token = this.getToken();
    if (!token) return [];
    try {
      const res = await fetch(`${this.baseUrl}/api/wpbox/getTemplates?token=${token}`);
      const data = (await res.json()) as any;
      return data.templates || [];
    } catch {
      return [];
    }
  }
}
