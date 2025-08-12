import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::geo-location.geo-location', ({ strapi }) => ({
  /**
   * Trigger geofence evaluation (fast path)
   */
  async triggerGeofenceEvaluation(userId: string, location: any) {
    const logger = strapi.log;
    
    try {
      logger.info(`[F-002] Triggering geofence evaluation for user ${userId}`, {
        spec_id: 'F-002',
        user_id: userId,
        location_id: location.id,
      });

      // TODO: Implement actual geofence evaluation logic
      // This would typically check if the location is within any defined geofences
      // and trigger appropriate actions

      logger.debug(`[F-002] Geofence evaluation completed`, {
        spec_id: 'F-002',
        user_id: userId,
        location_id: location.id,
      });
    } catch (error) {
      logger.error(`[F-002] Geofence evaluation failed`, {
        spec_id: 'F-002',
        user_id: userId,
        error: error.message,
      });
    }
  },

  /**
   * Schedule async tasks (pruning and background evaluation)
   */
  async scheduleAsyncTasks(userId: string) {
    const logger = strapi.log;

    try {
      // Prune old locations (keep only latest 500 per user)
      await this.pruneOldLocations(userId);

      // Trigger background evaluation if needed
      await this.triggerBackgroundEvaluation(userId);
    } catch (error) {
      logger.error(`[F-002] Async tasks failed for user ${userId}`, {
        spec_id: 'F-002',
        user_id: userId,
        error: error.message,
      });
    }
  },

  /**
   * Prune old locations keeping only the latest 500 per user
   */
  async pruneOldLocations(userId: string) {
    const logger = strapi.log;

    try {
      // Get total count of locations for user
      const totalCount = await strapi.db.query('api::geo-location.geo-location').count({
        where: { user_id: userId },
      });

      if (totalCount > 500) {
        const excessCount = totalCount - 500;
        
        logger.info(`[F-002] Pruning ${excessCount} old locations for user ${userId}`, {
          spec_id: 'F-002',
          user_id: userId,
          total_count: totalCount,
          excess_count: excessCount,
        });

        // Get oldest locations to delete
        const oldLocations = await strapi.db.query('api::geo-location.geo-location').findMany({
          where: { user_id: userId },
          orderBy: { recorded_at: 'asc' },
          limit: excessCount,
          select: ['id'],
        });

        // Delete old locations
        for (const location of oldLocations) {
          await strapi.entityService.delete('api::geo-location.geo-location', location.id);
        }

        logger.info(`[F-002] Pruned ${excessCount} old locations`, {
          spec_id: 'F-002',
          user_id: userId,
          pruned_count: excessCount,
        });
      }
    } catch (error) {
      logger.error(`[F-002] Failed to prune old locations`, {
        spec_id: 'F-002',
        user_id: userId,
        error: error.message,
      });
    }
  },

  /**
   * Trigger background evaluation if needed
   */
  async triggerBackgroundEvaluation(userId: string) {
    const logger = strapi.log;

    try {
      logger.debug(`[F-002] Triggering background evaluation for user ${userId}`, {
        spec_id: 'F-002',
        user_id: userId,
      });

      // TODO: Implement background evaluation logic
      // This could include more complex geofence analysis, pattern detection, etc.

      logger.debug(`[F-002] Background evaluation completed`, {
        spec_id: 'F-002',
        user_id: userId,
      });
    } catch (error) {
      logger.error(`[F-002] Background evaluation failed`, {
        spec_id: 'F-002',
        user_id: userId,
        error: error.message,
      });
    }
  },
}));