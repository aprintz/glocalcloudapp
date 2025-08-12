import { GeofenceEvaluationService } from '../../../../../server/src/geofence-service.js';

let cronInterval: NodeJS.Timeout | null = null;
let isRunning = false;
let lastRunTime: Date | null = null;
let lastRunStatus: 'success' | 'error' | 'running' = 'success';
let lastError: string | null = null;

const CRON_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default {
  start(strapi: any) {
    if (cronInterval) {
      strapi.log.warn('[Geolocation Plugin] Cron task already running');
      return;
    }

    strapi.log.info('[Geolocation Plugin] Starting geofence catch-up cron task');
    
    // Run immediately on startup
    runGeofenceEvaluation(strapi);
    
    // Schedule to run every 5 minutes
    cronInterval = setInterval(() => {
      runGeofenceEvaluation(strapi);
    }, CRON_INTERVAL_MS);

    strapi.log.info(`[Geolocation Plugin] Cron task scheduled every ${CRON_INTERVAL_MS / 1000} seconds`);
  },

  stop(strapi: any) {
    if (cronInterval) {
      clearInterval(cronInterval);
      cronInterval = null;
      strapi.log.info('[Geolocation Plugin] Cron task stopped');
    }
  },

  getStatus() {
    return {
      isRunning,
      lastRunTime,
      lastRunStatus,
      lastError,
      intervalMs: CRON_INTERVAL_MS,
      nextRunTime: lastRunTime ? new Date(lastRunTime.getTime() + CRON_INTERVAL_MS) : null
    };
  },

  async triggerManual(strapi: any) {
    if (isRunning) {
      throw new Error('Geofence evaluation is already running');
    }
    
    return runGeofenceEvaluation(strapi);
  }
};

async function runGeofenceEvaluation(strapi: any) {
  if (isRunning) {
    strapi.log.warn('[Geolocation Plugin] Geofence evaluation already running, skipping');
    return;
  }

  isRunning = true;
  lastRunTime = new Date();
  lastRunStatus = 'running';
  lastError = null;

  try {
    strapi.log.info('[Geolocation Plugin] Starting geofence catch-up evaluation');
    
    const service = new GeofenceEvaluationService({
      batchSize: Number(process.env.GEOFENCE_BATCH_SIZE) || 100,
      lookbackMinutes: Number(process.env.GEOFENCE_LOOKBACK_MINUTES) || 30,
      logSpecId: 'F-003'
    });

    await service.runCatchupEvaluation();
    
    lastRunStatus = 'success';
    strapi.log.info('[Geolocation Plugin] Geofence catch-up evaluation completed successfully');
    
  } catch (error) {
    lastRunStatus = 'error';
    lastError = error instanceof Error ? error.message : String(error);
    strapi.log.error('[Geolocation Plugin] Geofence catch-up evaluation failed:', error);
  } finally {
    isRunning = false;
  }
}