const { deviceRegistrationSchema } = require('../validation/schemas');

module.exports = ({ strapi }) => ({
  /**
   * POST /api/push/devices
   * Register a device for push notifications
   */
  async registerDevice(ctx) {
    const logSpecId = 'F-001';
    
    try {
      strapi.log.info(`[${logSpecId}] Device registration request received`);

      // Validate request body using Zod
      const validationResult = deviceRegistrationSchema.safeParse(ctx.request.body);
      
      if (!validationResult.success) {
        strapi.log.warn(`[${logSpecId}] Validation failed:`, validationResult.error.errors);
        ctx.status = 400;
        ctx.body = {
          error: 'Validation failed',
          details: validationResult.error.errors,
        };
        return;
      }

      const deviceData = validationResult.data;

      // Get authenticated user ID if available
      if (ctx.state.user && !deviceData.userId) {
        deviceData.userId = ctx.state.user.id;
      }

      // Register device using the push service
      const device = await strapi
        .plugin('push')
        .service('push')
        .registerDevice(deviceData, { 
          encryptTokens: process.env.PUSH_ENCRYPT_TOKENS === 'true',
          logSpecId 
        });

      strapi.log.info(`[${logSpecId}] Device registration completed successfully`);

      ctx.status = 201;
      ctx.body = {
        success: true,
        data: {
          deviceId: device.deviceId,
          platform: device.platform,
          registeredAt: device.createdAt,
        },
      };

    } catch (error) {
      strapi.log.error(`[${logSpecId}] Device registration controller error:`, error);
      
      ctx.status = 500;
      ctx.body = {
        error: 'Internal server error',
        message: 'Device registration failed',
      };
    }
  },

  /**
   * GET /api/push/devices/:deviceId
   * Get device registration info (optional endpoint for debugging)
   */
  async getDevice(ctx) {
    const { deviceId } = ctx.params;
    const logSpecId = 'F-001';

    try {
      strapi.log.info(`[${logSpecId}] Getting device info for: ${deviceId}`);

      const device = await strapi
        .plugin('push')
        .service('push')
        .findDeviceByDeviceId(deviceId);

      if (!device) {
        ctx.status = 404;
        ctx.body = {
          error: 'Device not found',
          message: `Device with ID ${deviceId} not found`,
        };
        return;
      }

      // Return minimal device info (no sensitive token data)
      ctx.body = {
        success: true,
        data: {
          deviceId: device.deviceId,
          platform: device.platform,
          suffix: device.suffix,
          registeredAt: device.createdAt,
          lastUpdated: device.updatedAt,
        },
      };

    } catch (error) {
      strapi.log.error(`[${logSpecId}] Get device controller error:`, error);
      
      ctx.status = 500;
      ctx.body = {
        error: 'Internal server error',
        message: 'Failed to retrieve device information',
      };
    }
  },
});