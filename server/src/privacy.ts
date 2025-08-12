import { query } from './db.js';

export interface PurgeResult {
  deleted_count: string;
}

export interface UserDeletionResult {
  user_locations_deleted: string;
  events_deleted: string;
}

export interface AuditLogEntry {
  id: string;
  operation: string;
  table_name: string;
  affected_rows: string;
  user_id?: string;
  retention_days?: number;
  metadata?: any;
  created_at: string;
}

/**
 * Purge user locations older than specified days (default: 30)
 */
export async function purgeOldUserLocations(daysOld: number = 30): Promise<number> {
  const result = await query<PurgeResult>(
    'SELECT * FROM purge_old_user_locations($1)',
    [daysOld]
  );
  return parseInt(result.rows[0]?.deleted_count || '0', 10);
}

/**
 * Delete all data for a specific user (GDPR compliance)
 */
export async function deleteUserData(userId: string): Promise<UserDeletionResult> {
  const result = await query<UserDeletionResult>(
    'SELECT * FROM delete_user_data($1::uuid)',
    [userId]
  );
  return result.rows[0];
}

/**
 * Get privacy audit log entries
 */
export async function getPrivacyAuditLog(
  limit: number = 100,
  operation?: string,
  userId?: string
): Promise<AuditLogEntry[]> {
  let whereClause = '';
  const params: any[] = [];
  let paramIndex = 1;

  if (operation) {
    whereClause += ` WHERE operation = $${paramIndex++}`;
    params.push(operation);
  }

  if (userId) {
    whereClause += whereClause ? ' AND' : ' WHERE';
    whereClause += ` user_id = $${paramIndex++}::uuid`;
    params.push(userId);
  }

  params.push(limit);
  const sql = `
    SELECT id, operation, table_name, affected_rows, user_id, retention_days, metadata, created_at
    FROM privacy_audit_log
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex}
  `;

  const result = await query<AuditLogEntry>(sql, params);
  return result.rows;
}

/**
 * Create a user location entry
 */
export async function createUserLocation(data: {
  userId: string;
  sessionId?: string;
  longitude: number;
  latitude: number;
  accuracy?: number;
  payload?: any;
}): Promise<string> {
  const { userId, sessionId, longitude, latitude, accuracy, payload } = data;
  
  const sql = `
    INSERT INTO user_locations (user_id, session_id, geog, accuracy, payload)
    VALUES ($1::uuid, $2::uuid, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, $6::jsonb)
    RETURNING id
  `;
  
  const result = await query(sql, [
    userId,
    sessionId || null,
    longitude,
    latitude,
    accuracy || null,
    JSON.stringify(payload || {})
  ]);
  
  return result.rows[0].id;
}

/**
 * Get user locations with optional filtering
 */
export async function getUserLocations(options: {
  userId?: string;
  sessionId?: string;
  sinceHours?: number;
  limit?: number;
} = {}): Promise<any[]> {
  const { userId, sessionId, sinceHours, limit = 100 } = options;
  
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  if (userId) {
    conditions.push(`user_id = $${paramIndex++}::uuid`);
    params.push(userId);
  }
  
  if (sessionId) {
    conditions.push(`session_id = $${paramIndex++}::uuid`);
    params.push(sessionId);
  }
  
  if (sinceHours) {
    conditions.push(`created_at >= now() - ($${paramIndex++}::int || ' hours')::interval`);
    params.push(sinceHours);
  }
  
  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  params.push(limit);
  
  const sql = `
    SELECT 
      id, user_id, session_id, accuracy, payload, created_at, updated_at,
      ST_AsGeoJSON(geog::geometry) AS geojson
    FROM user_locations
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex}
  `;
  
  const result = await query(sql, params);
  return result.rows;
}