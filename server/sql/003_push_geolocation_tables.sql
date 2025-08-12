-- Migration: Push Notification and Geolocation Tables
-- Creates tables for device registrations, user locations, geofences, and geofence hits
-- Includes PostGIS support with proper geographic indexes

-- Device registrations table for push notification tokens
CREATE TABLE IF NOT EXISTS device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Optional user linkage
  device_id TEXT NOT NULL, -- Platform device identifier
  token_hash TEXT NOT NULL, -- Hashed/encrypted notification token for security
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  app_version TEXT,
  os_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Unique constraint to prevent duplicate device registrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_registrations_device_token 
ON device_registrations (device_id, token_hash);

-- Index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_device_registrations_user_id 
ON device_registrations (user_id) WHERE user_id IS NOT NULL;

-- Index for active device filtering
CREATE INDEX IF NOT EXISTS idx_device_registrations_active 
ON device_registrations (is_active, updated_at DESC) WHERE is_active = true;

-- Index for platform-specific queries
CREATE INDEX IF NOT EXISTS idx_device_registrations_platform 
ON device_registrations (platform, is_active);

-- User locations table for periodic location tracking
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Optional user linkage
  device_id TEXT NOT NULL,
  geog GEOGRAPHY(Point, 4326) NOT NULL, -- PostGIS geographic point
  accuracy_meters FLOAT, -- GPS accuracy in meters
  speed_mps FLOAT, -- Speed in meters per second
  heading_degrees FLOAT CHECK (heading_degrees >= 0 AND heading_degrees < 360), -- Compass heading
  altitude_meters FLOAT, -- Altitude above sea level
  timestamp TIMESTAMPTZ NOT NULL, -- When location was recorded
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  idempotency_key TEXT -- For preventing duplicate location entries
);

-- Spatial index for geographic queries (most important for performance)
CREATE INDEX IF NOT EXISTS idx_user_locations_geog_gist 
ON user_locations USING GIST (geog);

-- Index for user-specific location history
CREATE INDEX IF NOT EXISTS idx_user_locations_user_timestamp 
ON user_locations (user_id, timestamp DESC) WHERE user_id IS NOT NULL;

-- Index for device-specific location history
CREATE INDEX IF NOT EXISTS idx_user_locations_device_timestamp 
ON user_locations (device_id, timestamp DESC);

-- Unique index for idempotency (prevent duplicate entries)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_locations_idempotency 
ON user_locations (device_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_user_locations_timestamp 
ON user_locations (timestamp DESC);

-- Geofences table for geographic boundaries and notification content
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  -- Support both point (with radius) and polygon geofences
  geog GEOGRAPHY(Geometry, 4326) NOT NULL, -- Can be Point or Polygon
  radius_meters FLOAT, -- Only used for Point geofences
  notification_title TEXT,
  notification_body TEXT,
  notification_data JSONB DEFAULT '{}', -- Additional notification payload
  created_by UUID, -- User who created the geofence
  is_active BOOLEAN NOT NULL DEFAULT true,
  entry_notification_enabled BOOLEAN NOT NULL DEFAULT true,
  exit_notification_enabled BOOLEAN NOT NULL DEFAULT false,
  suppression_duration_minutes INTEGER DEFAULT 60, -- Minimum time between notifications
  max_daily_notifications INTEGER DEFAULT 10, -- Limit notifications per day
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index for geofence boundary checks (critical for performance)
CREATE INDEX IF NOT EXISTS idx_geofences_geog_gist 
ON geofences USING GIST (geog);

-- Index for active geofences
CREATE INDEX IF NOT EXISTS idx_geofences_active 
ON geofences (is_active, created_at DESC) WHERE is_active = true;

-- Index for creator-specific queries
CREATE INDEX IF NOT EXISTS idx_geofences_created_by 
ON geofences (created_by, is_active) WHERE created_by IS NOT NULL;

-- JSONB index for notification data queries
CREATE INDEX IF NOT EXISTS idx_geofences_notification_data_gin 
ON geofences USING GIN (notification_data);

-- Geofence hits table for tracking entries/exits and deduplication
CREATE TABLE IF NOT EXISTS geofence_hits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  user_id UUID, -- Optional user linkage
  device_id TEXT NOT NULL,
  hit_type TEXT NOT NULL CHECK (hit_type IN ('enter', 'exit')),
  user_location_id UUID REFERENCES user_locations(id), -- Location that triggered the hit
  geog GEOGRAPHY(Point, 4326) NOT NULL, -- Location where hit occurred
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_suppressed BOOLEAN NOT NULL DEFAULT false,
  suppression_reason TEXT, -- Why notification was suppressed (rate limit, duplicate, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign key index for geofence lookups
CREATE INDEX IF NOT EXISTS idx_geofence_hits_geofence_id 
ON geofence_hits (geofence_id, created_at DESC);

-- Index for user-specific hit history
CREATE INDEX IF NOT EXISTS idx_geofence_hits_user_id 
ON geofence_hits (user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Index for device-specific hit history
CREATE INDEX IF NOT EXISTS idx_geofence_hits_device_id 
ON geofence_hits (device_id, created_at DESC);

-- Spatial index for geographic queries on hit locations
CREATE INDEX IF NOT EXISTS idx_geofence_hits_geog_gist 
ON geofence_hits USING GIST (geog);

-- Index for notification status queries
CREATE INDEX IF NOT EXISTS idx_geofence_hits_notification_status 
ON geofence_hits (notification_sent, notification_suppressed, created_at DESC);

-- Compound index for deduplication queries (same device hitting same geofence recently)
CREATE INDEX IF NOT EXISTS idx_geofence_hits_deduplication 
ON geofence_hits (geofence_id, device_id, hit_type, created_at DESC);

-- Index for suppression window queries
CREATE INDEX IF NOT EXISTS idx_geofence_hits_suppression_window 
ON geofence_hits (geofence_id, device_id, created_at DESC) 
WHERE notification_sent = true OR notification_suppressed = true;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at timestamps
DROP TRIGGER IF EXISTS update_device_registrations_updated_at ON device_registrations;
CREATE TRIGGER update_device_registrations_updated_at 
  BEFORE UPDATE ON device_registrations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_geofences_updated_at ON geofences;
CREATE TRIGGER update_geofences_updated_at 
  BEFORE UPDATE ON geofences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create helpful views for common queries

-- View for active device registrations with user info
CREATE OR REPLACE VIEW active_device_registrations AS
SELECT 
  id,
  user_id,
  device_id,
  platform,
  app_version,
  os_version,
  created_at,
  updated_at,
  last_used_at
FROM device_registrations 
WHERE is_active = true;

-- View for active geofences with metadata
CREATE OR REPLACE VIEW active_geofences AS
SELECT 
  id,
  name,
  description,
  geog,
  radius_meters,
  notification_title,
  notification_body,
  notification_data,
  created_by,
  entry_notification_enabled,
  exit_notification_enabled,
  suppression_duration_minutes,
  max_daily_notifications,
  created_at,
  updated_at
FROM geofences 
WHERE is_active = true;

-- Function to check if a point intersects with any active geofences
CREATE OR REPLACE FUNCTION get_intersecting_geofences(
  check_point GEOGRAPHY(Point, 4326)
) RETURNS TABLE (
  geofence_id UUID,
  name TEXT,
  notification_title TEXT,
  notification_body TEXT,
  notification_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.notification_title,
    g.notification_body,
    g.notification_data
  FROM geofences g
  WHERE g.is_active = true
    AND (
      -- Point geofence with radius
      (ST_GeometryType(g.geog::geometry) = 'ST_Point' AND g.radius_meters IS NOT NULL 
       AND ST_DWithin(g.geog, check_point, g.radius_meters))
      OR
      -- Polygon geofence (convert to geometry for ST_Contains)
      (ST_GeometryType(g.geog::geometry) IN ('ST_Polygon', 'ST_MultiPolygon') 
       AND ST_Contains(g.geog::geometry, check_point::geometry))
    );
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE device_registrations IS 'Stores device registration tokens for push notifications with encryption support';
COMMENT ON TABLE user_locations IS 'Stores periodic user location data with accuracy and speed information';
COMMENT ON TABLE geofences IS 'Defines geographic boundaries (points with radius or polygons) for location-based notifications';
COMMENT ON TABLE geofence_hits IS 'Tracks when devices enter/exit geofences with deduplication and suppression logic';

COMMENT ON COLUMN device_registrations.token_hash IS 'Hashed/encrypted notification token for security - never store plain tokens';
COMMENT ON COLUMN user_locations.idempotency_key IS 'Prevents duplicate location entries from the same device';
COMMENT ON COLUMN geofences.suppression_duration_minutes IS 'Minimum time between notifications for the same geofence';
COMMENT ON COLUMN geofence_hits.suppression_reason IS 'Explains why a notification was suppressed (rate limit, duplicate, etc.)';