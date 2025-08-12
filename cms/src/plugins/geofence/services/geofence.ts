import { Core } from '@strapi/strapi';

export interface GeofenceZone {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  userId: string;
  isActive: boolean;
  notificationMessage: string;
  suppressionMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeofenceEvent {
  id: string;
  zoneId: string;
  userId: string;
  eventType: 'enter' | 'exit';
  latitude: number;
  longitude: number;
  timestamp: Date;
  notificationSent: boolean;
  suppressed: boolean;
}

export interface NotificationSuppression {
  userId: string;
  zoneId: string;
  suppressUntil: Date;
}

export interface GeofenceService {
  createZone(zone: Omit<GeofenceZone, 'id' | 'createdAt' | 'updatedAt'>): Promise<GeofenceZone>;
  updateZone(zoneId: string, updates: Partial<GeofenceZone>): Promise<GeofenceZone>;
  deleteZone(zoneId: string): Promise<boolean>;
  checkGeofences(userId: string, latitude: number, longitude: number): Promise<GeofenceEvent[]>;
  processNotificationQueue(): Promise<number>;
  suppressNotifications(userId: string, zoneId: string, minutes: number): Promise<void>;
  isNotificationSuppressed(userId: string, zoneId: string): Promise<boolean>;
  batchProcessEvents(events: GeofenceEvent[]): Promise<number>;
  scheduleCronTasks(): void;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createZone(zone: Omit<GeofenceZone, 'id' | 'createdAt' | 'updatedAt'>): Promise<GeofenceZone> {
    // Feature spec: GEO-ZONE-001 - Geofence zone creation
    this.validateZoneData(zone);

    const newZone: GeofenceZone = {
      id: crypto.randomUUID(),
      ...zone,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await strapi.db.query('plugin::geofence.zone').create({
      data: newZone
    });

    strapi.log.info(`Created geofence zone: ${newZone.name}`, {
      id: newZone.id,
      center: [newZone.latitude, newZone.longitude],
      radius: newZone.radius
    });

    return result;
  },

  async updateZone(zoneId: string, updates: Partial<GeofenceZone>): Promise<GeofenceZone> {
    // Feature spec: GEO-ZONE-002 - Geofence zone updates
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    if (updates.latitude !== undefined || updates.longitude !== undefined || updates.radius !== undefined) {
      this.validateZoneData(updateData as any);
    }

    return await strapi.db.query('plugin::geofence.zone').update({
      where: { id: zoneId },
      data: updateData
    });
  },

  async deleteZone(zoneId: string): Promise<boolean> {
    // Feature spec: GEO-ZONE-003 - Geofence zone deletion
    try {
      await strapi.db.query('plugin::geofence.zone').delete({
        where: { id: zoneId }
      });
      
      // Clean up related events
      await strapi.db.query('plugin::geofence.event').deleteMany({
        where: { zoneId }
      });

      return true;
    } catch (error) {
      strapi.log.error('Failed to delete geofence zone', error);
      return false;
    }
  },

  async checkGeofences(userId: string, latitude: number, longitude: number): Promise<GeofenceEvent[]> {
    // Feature spec: GEO-CHECK-001 - Real-time geofence checking
    const activeZones = await strapi.db.query('plugin::geofence.zone').findMany({
      where: { isActive: true }
    });

    const events: GeofenceEvent[] = [];

    for (const zone of activeZones) {
      const distance = this.calculateDistance(latitude, longitude, zone.latitude, zone.longitude);
      const isInside = distance <= zone.radius;

      // Get last event for this user/zone
      const lastEvent = await strapi.db.query('plugin::geofence.event').findOne({
        where: { userId, zoneId: zone.id },
        orderBy: { timestamp: 'desc' }
      });

      const wasInside = lastEvent?.eventType === 'enter';

      // Check for state changes
      if (isInside && !wasInside) {
        // Enter event
        const event = await this.createEvent(zone.id, userId, 'enter', latitude, longitude);
        events.push(event);
      } else if (!isInside && wasInside) {
        // Exit event
        const event = await this.createEvent(zone.id, userId, 'exit', latitude, longitude);
        events.push(event);
      }
    }

    return events;
  },

  async createEvent(zoneId: string, userId: string, eventType: 'enter' | 'exit', latitude: number, longitude: number): Promise<GeofenceEvent> {
    // Feature spec: GEO-EVENT-001 - Geofence event creation
    const event: GeofenceEvent = {
      id: crypto.randomUUID(),
      zoneId,
      userId,
      eventType,
      latitude,
      longitude,
      timestamp: new Date(),
      notificationSent: false,
      suppressed: false
    };

    // Check if notification should be suppressed
    const suppressed = await this.isNotificationSuppressed(userId, zoneId);
    event.suppressed = suppressed;

    const result = await strapi.db.query('plugin::geofence.event').create({
      data: event
    });

    // Queue notification if not suppressed
    if (!suppressed) {
      await this.queueNotification(result);
    }

    return result;
  },

  async processNotificationQueue(): Promise<number> {
    // Feature spec: GEO-NOTIF-001 - Notification processing
    const pendingEvents = await strapi.db.query('plugin::geofence.event').findMany({
      where: {
        notificationSent: false,
        suppressed: false
      },
      limit: 100
    });

    let processedCount = 0;

    for (const event of pendingEvents) {
      try {
        const zone = await strapi.db.query('plugin::geofence.zone').findOne({
          where: { id: event.zoneId }
        });

        if (zone) {
          // Send notification via push service
          const pushService = strapi.plugin('push').service('push');
          const success = await pushService.sendToUser(event.userId, {
            title: `Geofence ${event.eventType}`,
            body: zone.notificationMessage,
            data: {
              zoneId: zone.id,
              eventType: event.eventType,
              eventId: event.id
            }
          });

          if (success > 0) {
            // Mark as sent and apply suppression
            await strapi.db.query('plugin::geofence.event').update({
              where: { id: event.id },
              data: { notificationSent: true }
            });

            if (zone.suppressionMinutes) {
              await this.suppressNotifications(event.userId, zone.id, zone.suppressionMinutes);
            }

            processedCount++;
          }
        }
      } catch (error) {
        strapi.log.error('Failed to process geofence notification', error);
      }
    }

    return processedCount;
  },

  async suppressNotifications(userId: string, zoneId: string, minutes: number): Promise<void> {
    // Feature spec: GEO-SUPP-001 - Notification suppression
    const suppressUntil = new Date();
    suppressUntil.setMinutes(suppressUntil.getMinutes() + minutes);

    // Check if suppression exists
    const existing = await strapi.db.query('plugin::geofence.suppression').findOne({
      where: { userId, zoneId }
    });

    if (existing) {
      await strapi.db.query('plugin::geofence.suppression').update({
        where: { userId, zoneId },
        data: { suppressUntil }
      });
    } else {
      await strapi.db.query('plugin::geofence.suppression').create({
        data: {
          userId,
          zoneId,
          suppressUntil
        }
      });
    }
  },

  async isNotificationSuppressed(userId: string, zoneId: string): Promise<boolean> {
    // Feature spec: GEO-SUPP-002 - Suppression check
    const suppression = await strapi.db.query('plugin::geofence.suppression').findOne({
      where: { userId, zoneId }
    });

    if (!suppression) return false;

    const now = new Date();
    return suppression.suppressUntil > now;
  },

  async batchProcessEvents(events: GeofenceEvent[]): Promise<number> {
    // Feature spec: GEO-BATCH-001 - Batch event processing
    let processedCount = 0;

    for (const event of events) {
      try {
        await strapi.db.query('plugin::geofence.event').create({
          data: event
        });
        processedCount++;
      } catch (error) {
        strapi.log.error('Failed to process batch event', error);
      }
    }

    return processedCount;
  },

  scheduleCronTasks(): void {
    // Feature spec: GEO-CRON-001 - Scheduled tasks
    // Clean up old suppressions
    setInterval(async () => {
      const now = new Date();
      await strapi.db.query('plugin::geofence.suppression').deleteMany({
        where: {
          suppressUntil: { $lt: now }
        }
      });
    }, 60 * 60 * 1000); // Every hour

    // Process notification queue
    setInterval(async () => {
      await this.processNotificationQueue();
    }, 30 * 1000); // Every 30 seconds
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Feature spec: GEO-CALC-001 - Distance calculation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  },

  validateZoneData(zone: Partial<GeofenceZone>): void {
    // Feature spec: GEO-VAL-002 - Zone validation
    if (!zone.name || zone.name.trim().length === 0) {
      throw new Error('Zone name is required');
    }
    
    if (typeof zone.latitude !== 'number' || zone.latitude < -90 || zone.latitude > 90) {
      throw new Error('Invalid latitude');
    }
    
    if (typeof zone.longitude !== 'number' || zone.longitude < -180 || zone.longitude > 180) {
      throw new Error('Invalid longitude');
    }

    if (typeof zone.radius !== 'number' || zone.radius <= 0) {
      throw new Error('Radius must be positive');
    }

    if (zone.radius > 10000) {
      throw new Error('Radius cannot exceed 10km');
    }
  },

  async queueNotification(event: GeofenceEvent): Promise<void> {
    // Helper method to queue notification
    // This could be enhanced to use a proper job queue
    setImmediate(async () => {
      await this.processNotificationQueue();
    });
  }
});