import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl = 'https://apps.oncloudapi.com';

  private cachedTemplates: any[] = [];
  private lastFetched = 0;

  private getToken(): string {
    return process.env.ONCLOUD_API_TOKEN || '';
  }

  async getCachedTemplates(): Promise<any[]> {
    const now = Date.now();
    if (this.cachedTemplates.length === 0 || now - this.lastFetched > 600000) {
      this.cachedTemplates = await this.getTemplates();
      this.lastFetched = now;
    }
    return this.cachedTemplates;
  }

  async hasDynamicUrlButton(templateName: string): Promise<boolean> {
    try {
      const templates = await this.getCachedTemplates();
      const template = templates.find(t => t.name === templateName);
      if (!template) return false;
      const components = JSON.parse(template.components || '[]');
      const buttonsComponent = components.find((c: any) => String(c.type).toUpperCase() === 'BUTTONS');
      if (!buttonsComponent || !Array.isArray(buttonsComponent.buttons)) return false;
      return buttonsComponent.buttons.some((b: any) => 
        String(b.type).toUpperCase() === 'URL' && 
        b.url && 
        b.url.includes('{{1}}')
      );
    } catch (err) {
      this.logger.warn(`hasDynamicUrlButton check failed for ${templateName}: ${(err as Error).message}`);
      return false;
    }
  }

  async sendTemplateMessage(
    phone: string,
    templateName: string,
    templateLanguage: string,
    bodyParams: string[],
    buttonUrlParam?: string,
  ): Promise<boolean> {
    const token = this.getToken();
    if (!token) {
      this.logger.warn('ONCLOUD_API_TOKEN not set — skipping WhatsApp notification');
      return false;
    }

    // OnCloud expects a bare international number (country code + number, digits only).
    // Strip '+', spaces, dashes, parentheses — these are the most common rejection cause.
    const normalizedPhone = phone.replace(/[^\d]/g, '');
    if (!normalizedPhone) {
      this.logger.warn(`WhatsApp skipped — invalid phone "${phone}"`);
      return false;
    }

    const components: any[] = [
      {
        type: 'body',
        parameters: bodyParams.map((text) => ({ type: 'text', text })),
      },
    ];

    if (buttonUrlParam) {
      const hasBtn = await this.hasDynamicUrlButton(templateName);
      if (hasBtn) {
        const normalizedButtonParam = buttonUrlParam.replace(/[^\d]/g, '');
        if (normalizedButtonParam) {
          components.push({
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              {
                type: 'text',
                text: normalizedButtonParam,
              },
            ],
          });
        }
      } else {
        this.logger.log(`Template "${templateName}" does not have a dynamic URL button — skipping button component.`);
      }
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/wpbox/sendtemplatemessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          phone: normalizedPhone,
          template_name: templateName,
          template_language: templateLanguage,
          components,
        }),
      });
      const data = (await res.json()) as any;
      if (data.status === 'success' || data.message_id) {
        this.logger.log(`WhatsApp sent to ${normalizedPhone} via template "${templateName}"`);
        return true;
      }
      this.logger.warn(`WhatsApp API non-success for ${normalizedPhone} (template "${templateName}"): ${JSON.stringify(data)}`);
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
    leadPhone?: string,
  ): Promise<boolean> {
    return this.sendTemplateMessage(
      agentPhone,
      templateName,
      templateLanguage,
      [agentFirstName, leadName, source],
      leadPhone,
    );
  }

  // Params sent: {{1}} Agent first name  {{2}} Lead name/title  {{3}} Source
  async sendOverdueNotification(
    agentPhone: string,
    agentFirstName: string,
    leadName: string,
    source: string,
    templateName: string,
    templateLanguage = 'en',
    leadPhone?: string,
  ): Promise<boolean> {
    return this.sendTemplateMessage(
      agentPhone,
      templateName,
      templateLanguage,
      [agentFirstName, leadName, source],
      leadPhone,
    );
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
