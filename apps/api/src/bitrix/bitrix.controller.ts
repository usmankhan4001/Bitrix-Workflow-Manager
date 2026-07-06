import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { BitrixService } from './bitrix.service';

@Controller('api/bitrix')
export class BitrixController {
  constructor(private readonly bitrixService: BitrixService) {}

  @Get('install')
  install(@Res() res: Response) {
    // Redirect to Bitrix24 OAuth authorization page
    const portalUrl = process.env.BITRIX_PORTAL_URL;
    const clientId = process.env.BITRIX_CLIENT_ID;
    const redirectUri = process.env.BITRIX_REDIRECT_URI;

    if (!portalUrl || !clientId || !redirectUri) {
      return res.status(500).send('Bitrix credentials not configured in .env');
    }

    const authUrl = `${portalUrl}/oauth/authorize/?client_id=${clientId}&response_type=code`;
    res.redirect(authUrl);
  }

  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('domain') domain: string,
    @Query('member_id') memberId: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      if (!code || !domain) {
        return res.redirect(`${frontendUrl}/auth/callback?error=missing_params`);
      }

      // Exchange the code for tokens
      const tokenData = await this.bitrixService.exchangeAuthCode(code, domain);

      // TODO: Save tokens to database (Prisma) associated with the organization/user
      
      // Redirect back to frontend dashboard with success params
      res.redirect(`${frontendUrl}/auth/callback?access_token=${tokenData.access_token}&domain=${domain}`);
    } catch (error) {
      res.redirect(`${frontendUrl}/auth/callback?error=authentication_failed`);
    }
  }

  // Uses BITRIX_WEBHOOK_TOKEN env var — no OAuth needed.
  // Get this from: Bitrix24 → Apps → Webhooks → Incoming webhooks
  @Get('webhook-users')
  async getWebhookUsers(@Res() res: Response) {
    const token = process.env.BITRIX_WEBHOOK_TOKEN;
    const portal = process.env.BITRIX_PORTAL_URL || 'https://pcicrm.bitrix24.com';
    if (!token) {
      return res.status(400).json({ error: 'BITRIX_WEBHOOK_TOKEN not configured in .env' });
    }

    const [rawUsers, rawDepts] = await Promise.all([
      this.bitrixService.getWebhookUsers(token, portal),
      this.bitrixService.getWebhookDepartments(token, portal),
    ]);

    // Build dept name map — real names if available, fallback IDs if dept.get was denied
    const deptNames: Record<number, string> =
      rawDepts.length > 0
        ? Object.fromEntries(rawDepts.map((d: any) => [Number(d.ID), d.NAME as string]))
        : this.bitrixService.buildDeptMapFromUsers(rawUsers);

    const hasDeptNames = rawDepts.length > 0;

    // Shape users for the frontend dropdown
    const users = rawUsers.map((u: any) => {
      const deptId: number = u.UF_DEPARTMENT?.[0] ?? 0;
      return {
        id: String(u.ID),
        name: `${u.NAME || ''} ${u.LAST_NAME || ''}`.trim(),
        email: u.EMAIL || '',
        phone: u.PERSONAL_MOBILE || u.WORK_PHONE || '',
        department_id: deptId ? String(deptId) : null,
        department_name: deptId ? (deptNames[deptId] || `Dept ${deptId}`) : 'No Department',
        active: u.ACTIVE === true || u.ACTIVE === 'Y',
      };
    });

    const departments = Object.entries(deptNames).map(([id, name]) => ({ id, name }));

    return res.json({
      users,
      departments,
      meta: {
        total_users: users.length,
        total_departments: departments.length,
        dept_names_resolved: hasDeptNames,
        note: hasDeptNames ? null : 'Department names unavailable — add "department" scope to your webhook for full names',
      },
    });
  }

  @Get('webhook-sources')
  async getWebhookSources(@Res() res: Response) {
    const token = process.env.BITRIX_WEBHOOK_TOKEN;
    const portal = process.env.BITRIX_PORTAL_URL || 'https://pcicrm.bitrix24.com';
    if (!token) {
      return res.status(400).json({ error: 'BITRIX_WEBHOOK_TOKEN not configured in .env' });
    }
    const sources = await this.bitrixService.getWebhookSources(token, portal);
    return res.json({ sources });
  }

  @Get('leads')
  async getLeads(
    @Query('access_token') accessToken: string,
    @Query('domain') domain: string,
    @Res() res: Response,
  ) {
    if (!accessToken || !domain) {
      return res.status(400).json({ error: 'Missing access_token or domain' });
    }

    try {
      const data = await this.bitrixService.getLeads(accessToken, domain);
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }
  }
}
