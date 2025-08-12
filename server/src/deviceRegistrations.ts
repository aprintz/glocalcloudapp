import { z } from 'zod';
import { query } from './db.js';
import { encryptPushToken, decryptPushToken, EncryptedToken } from './encryption.js';

/**
 * Device registration service for managing push notification tokens
 * Implements secure storage with AES-256-GCM encryption
 */

// Validation schemas
export const DeviceRegistrationSchema = z.object({
  deviceId: z.string().min(1).max(255),
  userId: z.string().optional(),
  platform: z.enum(['ios', 'android', 'web']),
  pushToken: z.string().min(1),
  appVersion: z.string().optional(),
  deviceMetadata: z.record(z.any()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  tokenExpiresAt: z.string().datetime().optional()
});

export const DeviceUpdateSchema = z.object({
  pushToken: z.string().min(1).optional(),
  userId: z.string().optional(),
  appVersion: z.string().optional(),
  deviceMetadata: z.record(z.any()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional()
});

export type DeviceRegistration = z.infer<typeof DeviceRegistrationSchema>;
export type DeviceUpdate = z.infer<typeof DeviceUpdateSchema>;

export interface DeviceRegistrationRecord {
  id: string;
  deviceId: string;
  userId?: string;
  platform: 'ios' | 'android' | 'web';
  appVersion?: string;
  tokenExpiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  deviceMetadata: Record<string, any>;
  hasPushToken: boolean;
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Register a new device or update existing registration
 */
export async function registerDevice(registration: DeviceRegistration): Promise<DeviceRegistrationRecord> {
  // Encrypt the push token
  const encryptedToken = encryptPushToken(registration.pushToken);
  
  const params: any[] = [
    registration.deviceId,
    registration.platform,
    encryptedToken.encryptedData,
    encryptedToken.iv,
    encryptedToken.tag
  ];
  
  let query_text = `
    INSERT INTO device_registrations (
      device_id, platform, encrypted_token, token_iv, token_tag
  `;
  
  let values = `VALUES ($1, $2, $3, $4, $5`;
  let paramIndex = 6;
  
  // Add optional fields
  if (registration.userId) {
    query_text += `, user_id`;
    values += `, $${paramIndex}`;
    params.push(registration.userId);
    paramIndex++;
  }
  
  if (registration.appVersion) {
    query_text += `, app_version`;
    values += `, $${paramIndex}`;
    params.push(registration.appVersion);
    paramIndex++;
  }
  
  if (registration.deviceMetadata) {
    query_text += `, device_metadata`;
    values += `, $${paramIndex}::jsonb`;
    params.push(JSON.stringify(registration.deviceMetadata));
    paramIndex++;
  }
  
  if (registration.tokenExpiresAt) {
    query_text += `, token_expires_at`;
    values += `, $${paramIndex}::timestamptz`;
    params.push(registration.tokenExpiresAt);
    paramIndex++;
  }
  
  if (registration.latitude !== undefined && registration.longitude !== undefined) {
    query_text += `, last_known_location`;
    values += `, ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography`;
    params.push(registration.longitude, registration.latitude);
    paramIndex += 2;
  }
  
  query_text += `) ${values}) 
    ON CONFLICT (device_id) DO UPDATE SET
      platform = EXCLUDED.platform,
      encrypted_token = EXCLUDED.encrypted_token,
      token_iv = EXCLUDED.token_iv,
      token_tag = EXCLUDED.token_tag,
      user_id = EXCLUDED.user_id,
      app_version = EXCLUDED.app_version,
      device_metadata = EXCLUDED.device_metadata,
      token_expires_at = EXCLUDED.token_expires_at,
      last_known_location = EXCLUDED.last_known_location,
      is_active = true,
      updated_at = now()
    RETURNING id, device_id, user_id, platform, app_version, token_expires_at, 
              last_used_at, created_at, updated_at, is_active, device_metadata,
              ST_X(last_known_location::geometry) as longitude,
              ST_Y(last_known_location::geometry) as latitude
  `;
  
  const result = await query(query_text, params);
  const row = result.rows[0];
  
  return {
    id: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    platform: row.platform,
    appVersion: row.app_version,
    tokenExpiresAt: row.token_expires_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active,
    deviceMetadata: row.device_metadata || {},
    hasPushToken: true,
    lastKnownLocation: row.longitude && row.latitude ? {
      longitude: row.longitude,
      latitude: row.latitude
    } : undefined
  };
}

/**
 * Update an existing device registration
 */
export async function updateDevice(deviceId: string, update: DeviceUpdate): Promise<DeviceRegistrationRecord | null> {
  const sets: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  // Handle encrypted token update
  if (update.pushToken) {
    const encryptedToken = encryptPushToken(update.pushToken);
    sets.push(`encrypted_token = $${paramIndex}`);
    sets.push(`token_iv = $${paramIndex + 1}`);
    sets.push(`token_tag = $${paramIndex + 2}`);
    params.push(encryptedToken.encryptedData, encryptedToken.iv, encryptedToken.tag);
    paramIndex += 3;
  }
  
  if (update.userId !== undefined) {
    sets.push(`user_id = $${paramIndex}`);
    params.push(update.userId);
    paramIndex++;
  }
  
  if (update.appVersion !== undefined) {
    sets.push(`app_version = $${paramIndex}`);
    params.push(update.appVersion);
    paramIndex++;
  }
  
  if (update.deviceMetadata !== undefined) {
    sets.push(`device_metadata = $${paramIndex}::jsonb`);
    params.push(JSON.stringify(update.deviceMetadata));
    paramIndex++;
  }
  
  if (update.tokenExpiresAt !== undefined) {
    sets.push(`token_expires_at = $${paramIndex}::timestamptz`);
    params.push(update.tokenExpiresAt);
    paramIndex++;
  }
  
  if (update.isActive !== undefined) {
    sets.push(`is_active = $${paramIndex}`);
    params.push(update.isActive);
    paramIndex++;
  }
  
  if (update.latitude !== undefined && update.longitude !== undefined) {
    sets.push(`last_known_location = ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography`);
    params.push(update.longitude, update.latitude);
    paramIndex += 2;
  }
  
  if (sets.length === 0) {
    throw new Error('No fields to update');
  }
  
  // Always update the updated_at timestamp
  sets.push('updated_at = now()');
  
  params.push(deviceId);
  
  const query_text = `
    UPDATE device_registrations 
    SET ${sets.join(', ')}
    WHERE device_id = $${paramIndex}
    RETURNING id, device_id, user_id, platform, app_version, token_expires_at, 
              last_used_at, created_at, updated_at, is_active, device_metadata,
              ST_X(last_known_location::geometry) as longitude,
              ST_Y(last_known_location::geometry) as latitude
  `;
  
  const result = await query(query_text, params);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  
  return {
    id: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    platform: row.platform,
    appVersion: row.app_version,
    tokenExpiresAt: row.token_expires_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active,
    deviceMetadata: row.device_metadata || {},
    hasPushToken: true,
    lastKnownLocation: row.longitude && row.latitude ? {
      longitude: row.longitude,
      latitude: row.latitude
    } : undefined
  };
}

/**
 * Get device registration (without exposing the actual push token)
 */
export async function getDeviceRegistration(deviceId: string): Promise<DeviceRegistrationRecord | null> {
  const result = await query(`
    SELECT * FROM device_registrations_safe WHERE device_id = $1
  `, [deviceId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  
  return {
    id: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    platform: row.platform,
    appVersion: row.app_version,
    tokenExpiresAt: row.token_expires_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active,
    deviceMetadata: row.device_metadata || {},
    hasPushToken: row.has_push_token,
    lastKnownLocation: row.longitude && row.latitude ? {
      longitude: row.longitude,
      latitude: row.latitude
    } : undefined
  };
}

/**
 * Get the decrypted push token for sending notifications
 * This should only be used by authorized notification services
 */
export async function getDecryptedPushToken(deviceId: string): Promise<string | null> {
  const result = await query(`
    SELECT encrypted_token, token_iv, token_tag, is_active 
    FROM device_registrations 
    WHERE device_id = $1 AND is_active = true
  `, [deviceId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  
  try {
    const encryptedToken: EncryptedToken = {
      encryptedData: row.encrypted_token,
      iv: row.token_iv,
      tag: row.token_tag
    };
    
    return decryptPushToken(encryptedToken);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to decrypt push token for device ${deviceId}:`, errorMessage);
    return null;
  }
}

/**
 * List device registrations for a user
 */
export async function getUserDevices(userId: string): Promise<DeviceRegistrationRecord[]> {
  const result = await query(`
    SELECT * FROM device_registrations_safe 
    WHERE user_id = $1 AND is_active = true 
    ORDER BY updated_at DESC
  `, [userId]);
  
  return result.rows.map(row => ({
    id: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    platform: row.platform,
    appVersion: row.app_version,
    tokenExpiresAt: row.token_expires_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active,
    deviceMetadata: row.device_metadata || {},
    hasPushToken: row.has_push_token,
    lastKnownLocation: row.longitude && row.latitude ? {
      longitude: row.longitude,
      latitude: row.latitude
    } : undefined
  }));
}

/**
 * Update last used timestamp for a device (when sending push notification)
 */
export async function updateLastUsed(deviceId: string): Promise<void> {
  await query(`
    UPDATE device_registrations 
    SET last_used_at = now() 
    WHERE device_id = $1
  `, [deviceId]);
}

/**
 * Deactivate a device registration
 */
export async function deactivateDevice(deviceId: string): Promise<boolean> {
  const result = await query(`
    UPDATE device_registrations 
    SET is_active = false, updated_at = now() 
    WHERE device_id = $1 AND is_active = true
  `, [deviceId]);
  
  return (result.rowCount ?? 0) > 0;
}

/**
 * Clean up expired device registrations
 */
export async function cleanupExpiredRegistrations(): Promise<number> {
  const result = await query('SELECT cleanup_expired_device_registrations()');
  return result.rows[0].cleanup_expired_device_registrations;
}