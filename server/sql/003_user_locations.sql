-- User locations table for privacy and retention management
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Reference to user (could be anonymous identifier)
  session_id UUID, -- Optional session tracking
  geog GEOGRAPHY(Point, 4326) NOT NULL,
  accuracy FLOAT, -- Location accuracy in meters
  payload JSONB NOT NULL DEFAULT '{}', -- Additional metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index for fast radius/polygon/nearest queries
CREATE INDEX IF NOT EXISTS idx_user_locations_geog_gist ON user_locations USING GIST (geog);

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations (user_id);

-- Index for session-based queries
CREATE INDEX IF NOT EXISTS idx_user_locations_session_id ON user_locations (session_id);

-- JSONB index for metadata lookups
CREATE INDEX IF NOT EXISTS idx_user_locations_payload_gin ON user_locations USING GIN (payload);

-- Timestamp index for time window filtering and retention policy
CREATE INDEX IF NOT EXISTS idx_user_locations_created_at ON user_locations (created_at DESC);

-- Index to support efficient purge operations (older than X days)
CREATE INDEX IF NOT EXISTS idx_user_locations_purge ON user_locations (created_at) WHERE created_at < (now() - interval '30 days');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER trigger_user_locations_updated_at
  BEFORE UPDATE ON user_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_locations_updated_at();