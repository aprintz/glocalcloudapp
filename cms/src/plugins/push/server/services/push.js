const { NotificationHubsClient } = require('@azure/notification-hubs');
const { TokenHasher } = require('../utils/token-hasher');
const { DeviceRegistration } = require('../validation/schemas');

module.exports = ({ strapi }) => ({
  /**
   * Register a device for push notifications
   */
  async registerDevice(data, options = { logSpecId: 'F-001' }) {
    const { deviceToken, deviceId, platform, suffix, userId } = data;
    const { encryptTokens = false, logSpecId } = options;

    strapi.log.info(`[${logSpecId}] Registering device: ${deviceId} for platform: ${platform}`);

    try {
      // Hash or encrypt and hash the device token
      const deviceTokenHash = encryptTokens 
        ? TokenHasher.encryptAndHashToken(deviceToken)
        : TokenHasher.hashToken(deviceToken);

      // Check if device already exists
      const existingDevice = await this.findDeviceByDeviceId(deviceId);
      
      if (existingDevice) {
        strapi.log.info(`[${logSpecId}] Updating existing device: ${deviceId}`);
        return await this.updateDevice(existingDevice.id, {
          deviceTokenHash,
          platform,
          suffix,
          userId,
          updatedAt: new Date()
        });
      }

      // Create new device record
      const deviceRecord = {
        deviceId,
        deviceTokenHash,
        platform,
        suffix,
        userId,
      };

      const savedDevice = await this.createDevice(deviceRecord);
      
      // Queue Azure Notification Hub registration asynchronously
      this.queueNotificationHubRegistration(savedDevice, deviceToken, logSpecId);

      strapi.log.info(`[${logSpecId}] Device registered successfully: ${deviceId}`);
      return savedDevice;

    } catch (error) {
      strapi.log.error(`[${logSpecId}] Device registration failed for ${deviceId}:`, error);
      throw new Error('Device registration failed');
    }
  },

  /**
   * Find device by device ID
   */
  async findDeviceByDeviceId(deviceId) {
    // In a real implementation, this would query the database
    // For now, we'll simulate with in-memory storage or use Strapi's entity service
    try {
      // This is a placeholder - in real implementation, use Strapi's entity service
      // or direct database access
      return null;
    } catch (error) {
      strapi.log.error('[F-001] Error finding device:', error);
      return null;
    }
  },

  /**
   * Create a new device record
   */
  async createDevice(deviceData) {
    const now = new Date();
    const device = {
      ...deviceData,
      id: Math.floor(Math.random() * 1000000), // Temporary ID generation
      createdAt: now,
      updatedAt: now,
    };

    // TODO: Implement actual database storage using Strapi entity service
    strapi.log.info('[F-001] Device record created (in-memory):', device.deviceId);
    return device;
  },

  /**
   * Update an existing device record
   */
  async updateDevice(id, updates) {
    // TODO: Implement actual database update using Strapi entity service
    const updatedDevice = {
      id,
      deviceId: 'updated-device',
      deviceTokenHash: 'updated-hash',
      platform: 'ios',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...updates,
    };

    strapi.log.info('[F-001] Device record updated:', id);
    return updatedDevice;
  },

  /**
   * Queue Azure Notification Hub registration (async)
   */
  queueNotificationHubRegistration(device, originalToken, logSpecId) {
    // Queue this for background processing
    setImmediate(async () => {
      try {
        await this.registerWithNotificationHub(device, originalToken, logSpecId);
      } catch (error) {
        strapi.log.error(`[${logSpecId}] Azure Notification Hub registration failed for device ${device.deviceId}:`, error);
      }
    });
  },

  /**
   * Register device with Azure Notification Hub
   */
  async registerWithNotificationHub(device, deviceToken, logSpecId) {
    const config = {
      connectionString: process.env.AZURE_NOTIFICATION_HUB_CONNECTION_STRING || '',
      hubName: process.env.AZURE_NOTIFICATION_HUB_NAME || '',
    };

    if (!config.connectionString || !config.hubName) {
      strapi.log.warn(`[${logSpecId}] Azure Notification Hub not configured, skipping registration`);
      return null;
    }

    try {
      strapi.log.info(`[${logSpecId}] Registering device ${device.deviceId} with Azure Notification Hub`);
      
      const client = new NotificationHubsClient(config.connectionString, config.hubName);
      
      // Create platform-specific registration
      const registration = device.platform === 'ios' 
        ? await client.createAppleRegistration({
            deviceToken,
            tags: device.suffix ? [device.suffix] : undefined,
          })
        : await client.createFcmRegistration({
            fcmRegistrationId: deviceToken,
            tags: device.suffix ? [device.suffix] : undefined,
          });

      strapi.log.info(`[${logSpecId}] Azure Notification Hub registration successful for device ${device.deviceId}`);
      return registration.registrationId || null;

    } catch (error) {
      strapi.log.error(`[${logSpecId}] Azure Notification Hub registration failed:`, error);
      throw error;
    }
  },
});