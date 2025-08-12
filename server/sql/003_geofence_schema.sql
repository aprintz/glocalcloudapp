-- Geofence zones table
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  geog GEOGRAPHY(Point, 4326) NOT NULL, -- center point
  radius_meters INTEGER NOT NULL CHECK (radius_meters > 0),
  metadata JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User locations table for tracking location history
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- external user identifier
  geog GEOGRAPHY(Point, 4326) NOT NULL,
  accuracy_meters REAL,
  processed_at TIMESTAMPTZ, -- null means not processed by catch-up job
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Geofence hits tracking table
CREATE TABLE IF NOT EXISTS geofence_hits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_location_id UUID NOT NULL REFERENCES user_locations(id) ON DELETE CASCADE,
  distance_meters REAL NOT NULL,
  detection_type TEXT NOT NULL CHECK (detection_type IN ('realtime', 'catchup')),
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_geofences_geog_gist ON geofences USING GIST (geog);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_locations_geog_gist ON user_locations USING GIST (geog);
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations (user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_created_at ON user_locations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_locations_processed_at ON user_locations (processed_at) WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_geofence_hits_geofence_id ON geofence_hits (geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofence_hits_user_id ON geofence_hits (user_id);
CREATE INDEX IF NOT EXISTS idx_geofence_hits_created_at ON geofence_hits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_hits_detection_type ON geofence_hits (detection_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_geofences_updated_at
  BEFORE UPDATE ON geofences
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();