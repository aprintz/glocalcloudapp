-- Enable required extensions (requires superuser on local; on Azure, use "azure_superuser")
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid

-- Core table for geotagged events/notifications
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  geog GEOGRAPHY(Point, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index for fast radius/polygon/nearest queries
CREATE INDEX IF NOT EXISTS idx_events_geog_gist ON events USING GIST (geog);

-- JSONB index for metadata lookups
CREATE INDEX IF NOT EXISTS idx_events_payload_gin ON events USING GIN (payload);

-- Timestamp index for time window filtering
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at DESC);

-- Optional: sample data
-- INSERT INTO events (title, geog) VALUES (
--   'Sample', ST_SetSRID(ST_MakePoint(12.5683, 55.6761), 4326)::geography
-- );
