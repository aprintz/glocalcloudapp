-- Migration for native push notifications and location tracking
-- Add device_tokens table for native push token registration
CREATE TABLE IF NOT EXISTS device_tokens (
  device_id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ios', 'android')),
  platform TEXT NOT NULL,
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens (token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_updated_at ON device_tokens (updated_at DESC);

-- Location updates table for background location tracking
CREATE TABLE IF NOT EXISTS location_updates (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  accuracy DOUBLE PRECISION NOT NULL CHECK (accuracy >= 0),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  geog GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED
);

-- Add foreign key constraint to device_tokens
ALTER TABLE location_updates 
ADD CONSTRAINT fk_location_updates_device_id 
FOREIGN KEY (device_id) REFERENCES device_tokens(device_id) 
ON DELETE CASCADE;

-- Indexes for efficient location queries
CREATE INDEX IF NOT EXISTS idx_location_updates_device_id ON location_updates (device_id);
CREATE INDEX IF NOT EXISTS idx_location_updates_timestamp ON location_updates (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_updates_geog_gist ON location_updates USING GIST (geog);
CREATE INDEX IF NOT EXISTS idx_location_updates_created_at ON location_updates (created_at DESC);

-- Composite index for device + timestamp queries
CREATE INDEX IF NOT EXISTS idx_location_updates_device_timestamp ON location_updates (device_id, timestamp DESC);