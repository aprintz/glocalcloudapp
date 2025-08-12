import { pool, query } from './db.js';

interface GeofenceConfig {
  batchSize: number;
  lookbackMinutes: number;
  logSpecId: string;
}

interface GeofenceHit {
  geofenceId: string;
  geofenceName: string;
  userId: string;
  userLocationId: string;
  distanceMeters: number;
  detectionType: 'realtime' | 'catchup';
  metadata?: any;
}

interface UserLocationPoint {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  createdAt: Date;
}

interface GeofenceZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  metadata: any;
}

export class GeofenceEvaluationService {
  private config: GeofenceConfig;

  constructor(config: Partial<GeofenceConfig> = {}) {
    this.config = {
      batchSize: Number(process.env.GEOFENCE_BATCH_SIZE) || 100,
      lookbackMinutes: Number(process.env.GEOFENCE_LOOKBACK_MINUTES) || 30,
      logSpecId: 'F-003',
      ...config
    };
  }

  /**
   * Main catch-up evaluation method - processes unprocessed user locations
   * against active geofences to detect missed events
   */
  async runCatchupEvaluation(): Promise<void> {
    const startTime = Date.now();
    this.log('Starting geofence catch-up evaluation', { 
      batchSize: this.config.batchSize,
      lookbackMinutes: this.config.lookbackMinutes 
    });

    try {
      // Get active geofences
      const geofences = await this.getActiveGeofences();
      if (geofences.length === 0) {
        this.log('No active geofences found', { count: 0 });
        return;
      }

      let totalProcessed = 0;
      let totalHits = 0;
      let hasMoreData = true;

      while (hasMoreData) {
        // Get batch of unprocessed user locations
        const userLocations = await this.getUnprocessedUserLocations(this.config.batchSize);
        
        if (userLocations.length === 0) {
          hasMoreData = false;
          break;
        }

        this.log('Processing batch', { 
          batchSize: userLocations.length,
          firstLocationId: userLocations[0].id,
          lastLocationId: userLocations[userLocations.length - 1].id
        });

        // Evaluate each location against all active geofences
        const hits = await this.evaluateLocationsAgainstGeofences(userLocations, geofences);
        
        if (hits.length > 0) {
          // Store geofence hits
          await this.storeGeofenceHits(hits);
          
          // Send notifications
          await this.sendNotifications(hits);
          
          totalHits += hits.length;
        }

        // Mark locations as processed
        await this.markLocationsAsProcessed(userLocations.map(loc => loc.id));
        
        totalProcessed += userLocations.length;

        // Break if we processed less than the batch size (no more data)
        if (userLocations.length < this.config.batchSize) {
          hasMoreData = false;
        }
      }

      const duration = Date.now() - startTime;
      this.log('Completed geofence catch-up evaluation', {
        totalProcessed,
        totalHits,
        durationMs: duration,
        geofenceCount: geofences.length
      });

    } catch (error) {
      this.log('Error during catch-up evaluation', { error: error instanceof Error ? error.message : String(error) }, 'error');
      throw error;
    }
  }

  /**
   * Get all active geofences
   */
  private async getActiveGeofences(): Promise<GeofenceZone[]> {
    const sql = `
      SELECT id, name, 
             ST_Y(geog::geometry) as latitude,
             ST_X(geog::geometry) as longitude,
             radius_meters, is_active, metadata
      FROM geofences 
      WHERE is_active = true
      ORDER BY name
    `;
    
    const result = await query(sql);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      radiusMeters: row.radius_meters,
      isActive: row.is_active,
      metadata: row.metadata || {}
    }));
  }

  /**
   * Get unprocessed user locations within the lookback window
   */
  private async getUnprocessedUserLocations(limit: number): Promise<UserLocationPoint[]> {
    const sql = `
      SELECT id, user_id,
             ST_Y(geog::geometry) as latitude,
             ST_X(geog::geometry) as longitude,
             accuracy_meters, created_at
      FROM user_locations 
      WHERE processed_at IS NULL 
        AND created_at >= now() - INTERVAL '${this.config.lookbackMinutes} minutes'
      ORDER BY created_at ASC
      LIMIT $1
    `;
    
    const result = await query(sql, [limit]);
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracyMeters: row.accuracy_meters,
      createdAt: new Date(row.created_at)
    }));
  }

  /**
   * Evaluate user locations against geofences to detect hits
   */
  private async evaluateLocationsAgainstGeofences(
    locations: UserLocationPoint[], 
    geofences: GeofenceZone[]
  ): Promise<GeofenceHit[]> {
    const hits: GeofenceHit[] = [];

    for (const location of locations) {
      for (const geofence of geofences) {
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          geofence.latitude,
          geofence.longitude
        );

        // Check if location is within geofence radius
        if (distance <= geofence.radiusMeters) {
          // Check if this user already has a recent hit for this geofence
          const hasRecentHit = await this.hasRecentGeofenceHit(
            geofence.id,
            location.userId,
            location.createdAt
          );

          if (!hasRecentHit) {
            hits.push({
              geofenceId: geofence.id,
              geofenceName: geofence.name,
              userId: location.userId,
              userLocationId: location.id,
              distanceMeters: distance,
              detectionType: 'catchup',
              metadata: {
                accuracy: location.accuracyMeters,
                geofenceMetadata: geofence.metadata
              }
            });

            this.log('Geofence hit detected', {
              geofenceId: geofence.id,
              geofenceName: geofence.name,
              userId: location.userId,
              distance: Math.round(distance),
              detectionType: 'catchup'
            });
          }
        }
      }
    }

    return hits;
  }

  /**
   * Check if user has a recent hit for the same geofence (to avoid duplicate notifications)
   */
  private async hasRecentGeofenceHit(
    geofenceId: string, 
    userId: string, 
    currentTime: Date
  ): Promise<boolean> {
    const sql = `
      SELECT 1 FROM geofence_hits 
      WHERE geofence_id = $1 
        AND user_id = $2 
        AND created_at >= $3 - INTERVAL '15 minutes'
      LIMIT 1
    `;
    
    const result = await query(sql, [geofenceId, userId, currentTime]);
    return result.rows.length > 0;
  }

  /**
   * Store geofence hits in the database
   */
  private async storeGeofenceHits(hits: GeofenceHit[]): Promise<void> {
    if (hits.length === 0) return;

    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const hit of hits) {
      values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      params.push(
        hit.geofenceId,
        hit.userId,
        hit.userLocationId,
        hit.distanceMeters,
        hit.detectionType,
        false, // notification_sent - will be updated after sending
        JSON.stringify(hit.metadata || {})
      );
    }

    const sql = `
      INSERT INTO geofence_hits 
      (geofence_id, user_id, user_location_id, distance_meters, detection_type, notification_sent, metadata)
      VALUES ${values.join(', ')}
    `;

    await query(sql, params);
    this.log('Stored geofence hits', { count: hits.length });
  }

  /**
   * Send notifications for geofence hits
   */
  private async sendNotifications(hits: GeofenceHit[]): Promise<void> {
    // Group hits by user to batch notifications
    const hitsByUser = hits.reduce((acc, hit) => {
      if (!acc[hit.userId]) acc[hit.userId] = [];
      acc[hit.userId].push(hit);
      return acc;
    }, {} as Record<string, GeofenceHit[]>);

    for (const [userId, userHits] of Object.entries(hitsByUser)) {
      try {
        // For now, just log the notification
        // In a real implementation, this would integrate with a notification service
        this.log('Sending notification', {
          userId,
          geofenceHits: userHits.map(hit => ({
            geofenceName: hit.geofenceName,
            distance: Math.round(hit.distanceMeters)
          }))
        });

        // Mark notifications as sent
        const hitIds = userHits.map(hit => `'${hit.geofenceId}'`).join(',');
        await query(`
          UPDATE geofence_hits 
          SET notification_sent = true 
          WHERE geofence_id IN (${hitIds}) AND user_id = $1
        `, [userId]);

      } catch (error) {
        this.log('Failed to send notification', { 
          userId, 
          error: error instanceof Error ? error.message : String(error) 
        }, 'error');
      }
    }
  }

  /**
   * Mark user locations as processed
   */
  private async markLocationsAsProcessed(locationIds: string[]): Promise<void> {
    if (locationIds.length === 0) return;

    const placeholders = locationIds.map((_, i) => `$${i + 1}`).join(',');
    const sql = `
      UPDATE user_locations 
      SET processed_at = now() 
      WHERE id IN (${placeholders})
    `;

    await query(sql, locationIds);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  }

  /**
   * Structured logging with spec_id
   */
  private log(message: string, metadata: any = {}, level: 'info' | 'error' = 'info'): void {
    const logEntry = {
      spec_id: this.config.logSpecId,
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'geofence-catchup',
      ...metadata
    };

    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }
}