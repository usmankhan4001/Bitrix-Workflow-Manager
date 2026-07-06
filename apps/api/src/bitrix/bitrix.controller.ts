import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { BitrixService } from './bitrix.service';

@Controller('api/bitrix')
export class BitrixController {
  constructor(private readonly bitrixService: BitrixService) {}

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
}
