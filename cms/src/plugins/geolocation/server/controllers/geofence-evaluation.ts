import cronTasks from '../cron-tasks';

export default ({ strapi }) => ({
  async trigger(ctx) {
    try {
      await cronTasks.triggerManual(strapi);
      ctx.body = {
        success: true,
        message: 'Geofence evaluation triggered successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  },

  async status(ctx) {
    const status = cronTasks.getStatus();
    ctx.body = {
      success: true,
      status,
      timestamp: new Date().toISOString()
    };
  }
});