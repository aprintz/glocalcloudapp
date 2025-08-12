import { purgeOldUserLocations } from './privacy.js';

export class ScheduledJobs {
  private intervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  /**
   * Start all scheduled jobs
   */
  start(): void {
    if (this.isRunning) {
      console.log('Scheduled jobs already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting scheduled jobs...');

    // Nightly purge job - runs every 24 hours
    this.scheduleNightlyPurge();
    
    console.log('Scheduled jobs started');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping scheduled jobs...');
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.isRunning = false;
    console.log('Scheduled jobs stopped');
  }

  /**
   * Schedule nightly purge of old user locations (runs every 24 hours)
   */
  private scheduleNightlyPurge(): void {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const RETENTION_DAYS = parseInt(process.env.LOCATION_RETENTION_DAYS || '30', 10);

    // Run initial purge after 1 minute (for testing purposes)
    setTimeout(() => {
      this.runLocationPurge(RETENTION_DAYS);
    }, 60 * 1000);

    // Schedule recurring purge every 24 hours
    const interval = setInterval(() => {
      this.runLocationPurge(RETENTION_DAYS);
    }, TWENTY_FOUR_HOURS);

    this.intervals.push(interval);
    console.log(`Scheduled nightly location purge (${RETENTION_DAYS} days retention)`);
  }

  /**
   * Execute location purge operation
   */
  private async runLocationPurge(retentionDays: number): Promise<void> {
    try {
      console.log(`Starting location purge job (${retentionDays} days retention)...`);
      const deletedCount = await purgeOldUserLocations(retentionDays);
      console.log(`Location purge completed: ${deletedCount} records deleted`);
    } catch (error) {
      console.error('Location purge job failed:', error);
    }
  }

  /**
   * Manually trigger location purge (for testing/admin purposes)
   */
  async triggerLocationPurge(retentionDays?: number): Promise<number> {
    const days = retentionDays || parseInt(process.env.LOCATION_RETENTION_DAYS || '30', 10);
    console.log(`Manual location purge triggered (${days} days retention)`);
    return await purgeOldUserLocations(days);
  }
}

// Singleton instance
export const scheduledJobs = new ScheduledJobs();