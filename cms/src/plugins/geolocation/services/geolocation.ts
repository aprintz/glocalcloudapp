import { Core } from '@strapi/strapi';

export interface LocationData {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp?: Date;
  ingestionId?: string;
}

export interface LocationHub {
  id: string;
  name: string;
  description?: string;
  adminUserId: string;
  isActive: boolean;
  userCount: number;
  createdAt: Date;
}

export interface GeolocationService {
  ingestLocation(locationData: Omit<LocationData, 'id'>): Promise<LocationData>;
  pruneOldLocations(retentionDays: number): Promise<number>;
  checkIdempotency(ingestionId: string): Promise<boolean>;
  getUserLocations(userId: string, limit?: number): Promise<LocationData[]>;
  createHub(adminUserId: string, name: string, description?: string): Promise<LocationHub>;
  joinHub(userId: string, hubId: string): Promise<boolean>;
  leaveHub(userId: string, hubId: string): Promise<boolean>;
  getHubUsers(hubId: string): Promise<string[]>;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async ingestLocation(locationData: Omit<LocationData, 'id'>): Promise<LocationData> {
    // Feature spec: GEO-ING-001 - Location data ingestion
    
    // Check idempotency if ingestionId provided
    if (locationData.ingestionId) {
      const exists = await this.checkIdempotency(locationData.ingestionId);
      if (exists) {
        throw new Error('Location already ingested with this ID');
      }
    }

    // Validate location data
    this.validateLocationData(locationData);

    const location: LocationData = {
      id: crypto.randomUUID(),
      ...locationData,
      timestamp: locationData.timestamp || new Date()
    };

    // Store in database
    const result = await strapi.db.query('plugin::geolocation.location').create({
      data: location
    });

    strapi.log.info(`Location ingested for user ${location.userId}`, {
      id: location.id,
      coordinates: [location.latitude, location.longitude]
    });

    return result;
  },

  async checkIdempotency(ingestionId: string): Promise<boolean> {
    // Feature spec: GEO-ING-002 - Idempotency check
    const existing = await strapi.db.query('plugin::geolocation.location').findOne({
      where: { ingestionId }
    });

    return !!existing;
  },

  async pruneOldLocations(retentionDays: number = 30): Promise<number> {
    // Feature spec: GEO-PRU-001 - Data pruning
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { count } = await strapi.db.query('plugin::geolocation.location').deleteMany({
      where: {
        timestamp: {
          $lt: cutoffDate
        }
      }
    });

    strapi.log.info(`Pruned ${count} old location records older than ${retentionDays} days`);
    return count;
  },

  async getUserLocations(userId: string, limit: number = 100): Promise<LocationData[]> {
    // Feature spec: GEO-QUE-001 - User location query
    return await strapi.db.query('plugin::geolocation.location').findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      limit
    });
  },

  async createHub(adminUserId: string, name: string, description?: string): Promise<LocationHub> {
    // Feature spec: GEO-HUB-001 - Hub creation
    const hub: LocationHub = {
      id: crypto.randomUUID(),
      name,
      description,
      adminUserId,
      isActive: true,
      userCount: 1,
      createdAt: new Date()
    };

    const result = await strapi.db.query('plugin::geolocation.hub').create({
      data: hub
    });

    // Add admin as first member
    await strapi.db.query('plugin::geolocation.hub-user').create({
      data: {
        hubId: hub.id,
        userId: adminUserId,
        joinedAt: new Date()
      }
    });

    return result;
  },

  async joinHub(userId: string, hubId: string): Promise<boolean> {
    // Feature spec: GEO-HUB-002 - Hub membership
    try {
      // Check if already member
      const existing = await strapi.db.query('plugin::geolocation.hub-user').findOne({
        where: { hubId, userId }
      });

      if (existing) {
        return false; // Already a member
      }

      await strapi.db.query('plugin::geolocation.hub-user').create({
        data: {
          hubId,
          userId,
          joinedAt: new Date()
        }
      });

      // Update user count
      await strapi.db.query('plugin::geolocation.hub').update({
        where: { id: hubId },
        data: {
          userCount: {
            $inc: 1
          }
        }
      });

      return true;
    } catch (error) {
      strapi.log.error('Failed to join hub', error);
      return false;
    }
  },

  async leaveHub(userId: string, hubId: string): Promise<boolean> {
    // Feature spec: GEO-HUB-003 - Hub membership removal
    try {
      const deleted = await strapi.db.query('plugin::geolocation.hub-user').deleteMany({
        where: { hubId, userId }
      });

      if (deleted.count > 0) {
        // Update user count
        await strapi.db.query('plugin::geolocation.hub').update({
          where: { id: hubId },
          data: {
            userCount: {
              $dec: 1
            }
          }
        });
      }

      return deleted.count > 0;
    } catch (error) {
      strapi.log.error('Failed to leave hub', error);
      return false;
    }
  },

  async getHubUsers(hubId: string): Promise<string[]> {
    // Feature spec: GEO-HUB-004 - Hub user listing
    const hubUsers = await strapi.db.query('plugin::geolocation.hub-user').findMany({
      where: { hubId },
      select: ['userId']
    });

    return hubUsers.map(hu => hu.userId);
  },

  validateLocationData(locationData: Partial<LocationData>): void {
    // Feature spec: GEO-VAL-001 - Location data validation
    if (!locationData.userId) {
      throw new Error('userId is required');
    }
    
    if (typeof locationData.latitude !== 'number' || 
        locationData.latitude < -90 || locationData.latitude > 90) {
      throw new Error('Invalid latitude');
    }
    
    if (typeof locationData.longitude !== 'number' || 
        locationData.longitude < -180 || locationData.longitude > 180) {
      throw new Error('Invalid longitude');
    }

    if (locationData.accuracy !== undefined && locationData.accuracy < 0) {
      throw new Error('Accuracy must be non-negative');
    }
  }
});