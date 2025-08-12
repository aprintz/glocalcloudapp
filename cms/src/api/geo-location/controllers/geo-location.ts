import { factories } from '@strapi/strapi';
import { z } from 'zod';

// Validation schema
const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  speed: z.number().min(0).optional(),
  recordedAt: z.string().datetime(),
});

export default factories.createCoreController('api::geo-location.geo-location', ({ strapi }) => ({
  /**
   * Custom create method with validation and logging
   */
  async create(ctx) {
    const logger = strapi.log;

    try {
      // Extract user ID from authenticated user or request
      const userId = ctx.request.body?.userId || ctx.query?.userId;
      
      if (!userId) {
        ctx.status = 400;
        ctx.body = {
          error: 'Missing required field: userId',
          message: 'User ID must be provided',
        };
        return;
      }

      // Validate input data with Zod
      const validationResult = locationSchema.safeParse(ctx.request.body);
      
      if (!validationResult.success) {
        logger.warn(`[F-002] Invalid location data received`, {
          spec_id: 'F-002',
          user_id: userId,
          errors: validationResult.error.errors,
        });

        ctx.status = 400;
        ctx.body = {
          error: 'Validation failed',
          message: 'Invalid location data provided',
          details: validationResult.error.errors,
        };
        return;
      }

      const locationData = validationResult.data;

      logger.info(`[F-002] Ingesting location for user ${userId}`, {
        spec_id: 'F-002',
        user_id: userId,
        latitude: locationData.lat,
        longitude: locationData.lon,
        recorded_at: locationData.recordedAt,
      });

      // Check for idempotency - avoid duplicate entries for same user and timestamp
      const existing = await strapi.entityService.findMany(
        'api::geo-location.geo-location',
        {
          filters: {
            user_id: userId,
            recorded_at: locationData.recordedAt,
          },
          limit: 1,
        }
      );

      if (existing.length > 0) {
        logger.info(`[F-002] Duplicate location entry detected, skipping`, {
          spec_id: 'F-002',
          user_id: userId,
          recorded_at: locationData.recordedAt,
        });
        
        ctx.status = 200;
        ctx.body = {
          success: true,
          data: existing[0],
          message: 'Location already exists (idempotent)',
        };
        return;
      }

      // Create new location entry
      const newLocation = await strapi.entityService.create(
        'api::geo-location.geo-location',
        {
          data: {
            user_id: userId,
            latitude: locationData.lat,
            longitude: locationData.lon,
            accuracy: locationData.accuracy,
            speed: locationData.speed,
            recorded_at: locationData.recordedAt,
          },
        }
      );

      logger.info(`[F-002] Location ingested successfully`, {
        spec_id: 'F-002',
        location_id: newLocation.id,
        user_id: userId,
      });

      // Trigger geofence evaluation (fast path)
      setImmediate(() => {
        strapi.service('api::geo-location.geo-location').triggerGeofenceEvaluation(userId, newLocation);
      });

      // Schedule async tasks
      setImmediate(() => {
        strapi.service('api::geo-location.geo-location').scheduleAsyncTasks(userId);
      });

      ctx.status = 201;
      ctx.body = {
        success: true,
        data: newLocation,
        message: 'Location ingested successfully',
      };

    } catch (error) {
      logger.error(`[F-002] Error in geo-location controller`, {
        spec_id: 'F-002',
        error: error.message,
        stack: error.stack,
      });

      ctx.status = 500;
      ctx.body = {
        error: 'Internal server error',
        message: 'Failed to process location data',
      };
    }
  },

  /**
   * Custom find method with user filtering
   */
  async find(ctx) {
    const logger = strapi.log;

    try {
      const userId = ctx.query?.userId;
      
      if (!userId) {
        ctx.status = 400;
        ctx.body = {
          error: 'Missing required parameter: userId',
          message: 'User ID must be provided as query parameter',
        };
        return;
      }

      const locations = await strapi.entityService.findMany(
        'api::geo-location.geo-location',
        {
          filters: { user_id: userId },
          sort: { recorded_at: 'desc' },
          limit: parseInt(ctx.query.limit as string) || 100,
        }
      );

      logger.debug(`[F-002] Retrieved ${locations.length} locations for user`, {
        spec_id: 'F-002',
        user_id: userId,
        count: locations.length,
      });

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: locations,
        count: locations.length,
      };

    } catch (error) {
      logger.error(`[F-002] Error retrieving locations`, {
        spec_id: 'F-002',
        error: error.message,
      });

      ctx.status = 500;
      ctx.body = {
        error: 'Internal server error',
        message: 'Failed to retrieve locations',
      };
    }
  },
}));