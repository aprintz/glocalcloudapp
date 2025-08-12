import { Strapi } from '@strapi/strapi';

interface LocationPoint {
  latitude: number;
  longitude: number;
  user_id: string;
  tenant?: string;
}

interface GeofenceHit {
  geofence_id: number;
  user_id: string;
  event_type: 'enter' | 'exit';
  latitude: number;
  longitude: number;
  distance_from_center?: number;
  triggered_at: Date;
  notification_sent: boolean;
  suppressed: boolean;
  suppression_reason?: string;
  tenant: string;
  spec_id: string;
}

export default ({ strapi }: { strapi: Strapi }) => ({
  async evaluateUserLocation(location: LocationPoint) {
    try {
      const tenant = location.tenant || 'public';
      const geofences = await strapi.plugin('geofences').service('geofence').findActiveGeofences(tenant);
      const results = [];

      for (const geofence of geofences) {
        const isInside = this.isPointInGeofence(location, geofence);
        const wasInside = await this.wasUserInGeofence(location.user_id, geofence.id);
        
        // Check for entry/exit events with hysteresis
        const event = this.determineEvent(isInside, wasInside, location, geofence);
        
        if (event) {
          // Check suppression window
          const shouldSuppress = await this.shouldSuppressNotification(location.user_id, geofence.id, event.event_type);
          
          const hit: GeofenceHit = {
            geofence_id: geofence.id,
            user_id: location.user_id,
            event_type: event.event_type,
            latitude: location.latitude,
            longitude: location.longitude,
            distance_from_center: event.distance,
            triggered_at: new Date(),
            notification_sent: false,
            suppressed: shouldSuppress.suppress,
            suppression_reason: shouldSuppress.reason,
            tenant,
            spec_id: 'F-003'
          };

          // Record the hit
          const savedHit = await this.recordGeofenceHit(hit);
          
          // Send notification if not suppressed
          if (!shouldSuppress.suppress && geofence.notification_template) {
            await this.sendNotification(geofence, hit);
            await this.updateHitNotificationSent(savedHit.id);
          }

          results.push({
            geofence: geofence.name,
            event_type: event.event_type,
            suppressed: shouldSuppress.suppress,
            hit_id: savedHit.id
          });

          // Log the event
          strapi.log.info(`Geofence ${event.event_type}: ${geofence.name}`, {
            spec_id: 'F-003',
            user_id: location.user_id,
            geofence_id: geofence.id,
            event_type: event.event_type,
            suppressed: shouldSuppress.suppress,
            latitude: location.latitude,
            longitude: location.longitude
          });
        }
      }

      return results;
    } catch (error) {
      strapi.log.error('Error evaluating user location:', error);
      throw error;
    }
  },

  async evaluateAllGeofences() {
    try {
      // This would typically get recent user locations from a tracking system
      // For now, we'll implement a basic version that can be extended
      strapi.log.info('Running geofence evaluation cron job', {
        spec_id: 'F-003',
        action: 'cron_evaluation'
      });
      
      // In a real implementation, this would:
      // 1. Get all active users with recent location updates
      // 2. Evaluate each against all geofences
      // 3. Handle batch processing for performance
      
      return { evaluated: 0, hits: 0 };
    } catch (error) {
      strapi.log.error('Error in cron geofence evaluation:', error);
      throw error;
    }
  },

  isPointInGeofence(location: LocationPoint, geofence: any): boolean {
    if (geofence.geometry_type === 'point_radius') {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        geofence.center_latitude,
        geofence.center_longitude
      );
      return distance <= geofence.radius_meters;
    } else if (geofence.geometry_type === 'polygon') {
      return this.isPointInPolygon(location, geofence.polygon_coordinates);
    }
    return false;
  },

  isPointInPolygon(point: LocationPoint, polygon: number[][]): boolean {
    const x = point.longitude;
    const y = point.latitude;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  determineEvent(isInside: boolean, wasInside: boolean, location: LocationPoint, geofence: any) {
    const hysteresisBuffer = geofence.hysteresis_buffer_meters || 10;
    
    if (isInside && !wasInside) {
      // Entry event
      const distance = geofence.geometry_type === 'point_radius' 
        ? this.calculateDistance(location.latitude, location.longitude, geofence.center_latitude, geofence.center_longitude)
        : 0;
      
      return { event_type: 'enter' as const, distance };
    } else if (!isInside && wasInside) {
      // Check hysteresis for exit
      const distance = geofence.geometry_type === 'point_radius' 
        ? this.calculateDistance(location.latitude, location.longitude, geofence.center_latitude, geofence.center_longitude)
        : 0;
      
      // Only trigger exit if they're beyond the hysteresis buffer
      if (geofence.geometry_type === 'point_radius' && distance < geofence.radius_meters + hysteresisBuffer) {
        return null; // Still within hysteresis buffer
      }
      
      return { event_type: 'exit' as const, distance };
    }
    
    return null;
  },

  async wasUserInGeofence(userId: string, geofenceId: number): Promise<boolean> {
    try {
      const recentHits = await strapi.entityService.findMany('plugin::geofences.geofence-hit', {
        filters: {
          user_id: userId,
          geofence_id: geofenceId,
          triggered_at: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        sort: { triggered_at: 'desc' },
        limit: 1
      });

      if (recentHits.length === 0) return false;
      return recentHits[0].event_type === 'enter';
    } catch (error) {
      strapi.log.error('Error checking user geofence status:', error);
      return false;
    }
  },

  async shouldSuppressNotification(userId: string, geofenceId: number, eventType: 'enter' | 'exit') {
    try {
      const geofence = await strapi.plugin('geofences').service('geofence').findOne(geofenceId);
      if (!geofence) return { suppress: true, reason: 'Geofence not found' };

      const suppressionWindow = geofence.suppression_window_seconds || 300; // 5 minutes default
      const cutoffTime = new Date(Date.now() - suppressionWindow * 1000);

      const recentHits = await strapi.entityService.findMany('plugin::geofences.geofence-hit', {
        filters: {
          user_id: userId,
          geofence_id: geofenceId,
          event_type: eventType,
          triggered_at: {
            $gte: cutoffTime
          }
        },
        limit: 1
      });

      if (recentHits.length > 0) {
        return { 
          suppress: true, 
          reason: `Recent ${eventType} event within suppression window (${suppressionWindow}s)` 
        };
      }

      return { suppress: false, reason: null };
    } catch (error) {
      strapi.log.error('Error checking suppression:', error);
      return { suppress: true, reason: 'Error checking suppression' };
    }
  },

  async recordGeofenceHit(hit: GeofenceHit) {
    try {
      return await strapi.entityService.create('plugin::geofences.geofence-hit', {
        data: hit
      });
    } catch (error) {
      strapi.log.error('Error recording geofence hit:', error);
      throw error;
    }
  },

  async updateHitNotificationSent(hitId: number) {
    try {
      return await strapi.entityService.update('plugin::geofences.geofence-hit', hitId, {
        data: {
          notification_sent: true,
          notification_sent_at: new Date()
        }
      });
    } catch (error) {
      strapi.log.error('Error updating hit notification status:', error);
      throw error;
    }
  },

  async sendNotification(geofence: any, hit: GeofenceHit) {
    try {
      const template = geofence.notification_template;
      if (!template) return;

      // Implement different notification types
      switch (template.notification_type) {
        case 'push':
          await this.sendPushNotification(template, hit);
          break;
        case 'email':
          await this.sendEmailNotification(template, hit);
          break;
        case 'sms':
          await this.sendSMSNotification(template, hit);
          break;
        case 'webhook':
          await this.sendWebhookNotification(template, hit);
          break;
      }

      strapi.log.info(`Notification sent: ${template.notification_type}`, {
        spec_id: 'F-003',
        template_id: template.id,
        hit_id: hit.geofence_id,
        user_id: hit.user_id
      });
    } catch (error) {
      strapi.log.error('Error sending notification:', error);
      throw error;
    }
  },

  async sendPushNotification(template: any, hit: GeofenceHit) {
    // Implement push notification logic
    console.log(`Push notification: ${template.title} - ${template.message}`, {
      user_id: hit.user_id,
      priority: template.priority
    });
  },

  async sendEmailNotification(template: any, hit: GeofenceHit) {
    // Implement email notification logic
    console.log(`Email notification: ${template.title}`, {
      user_id: hit.user_id,
      template: template.email_template
    });
  },

  async sendSMSNotification(template: any, hit: GeofenceHit) {
    // Implement SMS notification logic
    console.log(`SMS notification: ${template.sms_template}`, {
      user_id: hit.user_id
    });
  },

  async sendWebhookNotification(template: any, hit: GeofenceHit) {
    // Implement webhook notification logic
    try {
      const payload = {
        template_id: template.id,
        user_id: hit.user_id,
        event_type: hit.event_type,
        geofence_id: hit.geofence_id,
        timestamp: hit.triggered_at,
        title: template.title,
        message: template.message,
        custom_data: template.custom_data,
        spec_id: 'F-003'
      };

      // In a real implementation, use fetch or axios to send to webhook_url
      console.log(`Webhook notification to ${template.webhook_url}:`, payload);
    } catch (error) {
      strapi.log.error('Error sending webhook notification:', error);
      throw error;
    }
  }
});