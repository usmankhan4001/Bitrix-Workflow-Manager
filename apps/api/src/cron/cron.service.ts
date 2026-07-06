import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WorkflowService } from '../workflow/workflow.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly workflow: WorkflowService) {}

  /**
   * Runs every minute, checks if it is the workflow start time on an allowed day.
   * When it fires at exactly the start time it processes all queued late leads
   * — matching the old system's 10 AM daily cron, but configurable via the UI.
   */
  @Cron('* * * * *') // every minute
  async maybeProcessLateLeads() {
    const settings = await this.workflow.getSettings();

    // Check if we're in the 1-minute window at the start of the business day
    if (!this.isStartOfDay(settings)) return;

    const pending = await this.workflow.getLateLeads();
    if (pending.length === 0) return;

    this.logger.log(`⏰ Day-start cron triggered — ${pending.length} late lead(s) to process`);
    const result = await this.workflow.processAllLateLeads();
    this.logger.log(`✅ Cron complete — processed: ${result.processed}, skipped: ${result.skipped}, failed: ${result.failed}`);
  }

  private isStartOfDay(settings: Record<string, string>): boolean {
    const now = new Date();
    // Adjust to PKT (UTC+5)
    const pkt = new Date(now.getTime() + 5 * 3600 * 1000);
    const currentDay = pkt.getUTCDay();
    const currentHour = pkt.getUTCHours();
    const currentMin = pkt.getUTCMinutes();

    const notAllowed: number[] = JSON.parse(settings.NOT_ALLOWED_DAYS || '[0,6]');
    if (notAllowed.includes(currentDay)) return false;

    const [startH, startM] = (settings.WORKFLOW_START_TIME || '09:00').split(':').map(Number);

    // Fire within the first minute of the configured start time
    return currentHour === startH && currentMin === startM;
  }
}
