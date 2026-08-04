import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WorkflowService } from '../workflow/workflow.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly workflow: WorkflowService) {}

  /**
   * Runs every minute, checks if it is the start of today's business-hours
   * window (per the per-day BUSINESS_HOURS schedule). When it fires at exactly
   * that time it processes all queued off-hours leads.
   */
  @Cron('* * * * *') // every minute
  async maybeProcessLateLeads() {
    const settings = await this.workflow.getSettings();

    // Check if we're in the 1-minute window at the start of today's business hours
    if (!this.isStartOfDay(settings)) return;

    const pending = await this.workflow.getLateLeads();
    if (pending.length === 0) return;

    this.logger.log(`⏰ Day-start cron triggered — ${pending.length} queued lead(s) to process`);
    const result = await this.workflow.processAllLateLeads();
    this.logger.log(`✅ Cron complete — processed: ${result.processed}, skipped: ${result.skipped}, failed: ${result.failed}`);
  }

  private isStartOfDay(settings: Record<string, string>): boolean {
    const { day, hour, minute } = this.workflow.getPKTime();
    const schedule = this.workflow.getBusinessHoursSchedule(settings);
    const window = schedule[String(day)];
    if (!window) return false; // day is closed

    const [startH, startM] = window.start.split(':').map(Number);
    // Fire within the first minute of the configured start time
    return hour === startH && minute === startM;
  }

  /**
   * SLA rotation sweep — reassigns leads whose current agent has let the
   * 1-hour (business-time) window lapse without moving the lead out of "New
   * Lead". Runs every 2 minutes; cheap when idle since it only does local time
   * math unless a lead has actually timed out.
   */
  @Cron('*/2 * * * *')
  async sweepRotationTimeouts() {
    const result = await this.workflow.sweepRotationTimeouts();
    if (result.rotated || result.escalated) {
      this.logger.log(`⏱️ SLA sweep — checked: ${result.checked}, rotated: ${result.rotated}, escalated: ${result.escalated}`);
    }
  }
}
