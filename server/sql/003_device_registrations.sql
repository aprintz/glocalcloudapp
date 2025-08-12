-- Device registrations table for push notifications with encrypted token storage
-- This table stores device information and encrypted push tokens for Azure Notification Hub integration

CREATE TABLE IF NOT EXISTS device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE, -- unique device identifier (could be device UUID, IMEI hash, etc.)
  user_id TEXT, -- optional user association
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')), -- device platform
  app_version TEXT, -- app version for compatibility tracking
  
  -- Encrypted push token storage (AES-256-GCM)
  encrypted_token TEXT NOT NULL, -- base64 encoded encrypted push token
  token_iv TEXT NOT NULL, -- initialization vector for GCM mode (base64 encoded)
  token_tag TEXT NOT NULL, -- authentication tag for GCM mode (base64 encoded)
  
  -- Token metadata
  token_expires_at TIMESTAMPTZ, -- when the push token expires (if known)
  last_used_at TIMESTAMPTZ, -- last time this token was used for push
  
  -- Registration metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true, -- whether this registration is active
  
  -- Optional device metadata for targeting
  device_metadata JSONB DEFAULT '{}', -- timezone, language, etc.
  
  -- Geographic location for location-based notifications (optional)
  last_known_location GEOGRAPHY(Point, 4326)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_device_registrations_device_id ON device_registrations (device_id);
CREATE INDEX IF NOT EXISTS idx_device_registrations_user_id ON device_registrations (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_device_registrations_platform ON device_registrations (platform);
CREATE INDEX IF NOT EXISTS idx_device_registrations_active ON device_registrations (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_device_registrations_expires_at ON device_registrations (token_expires_at) WHERE token_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_device_registrations_location ON device_registrations USING GIST (last_known_location) WHERE last_known_location IS NOT NULL;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_device_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_device_registrations_updated_at
  BEFORE UPDATE ON device_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_device_registrations_updated_at();

-- Function to clean up expired tokens (to be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_device_registrations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Soft delete expired registrations
  UPDATE device_registrations 
  SET is_active = false, updated_at = now()
  WHERE token_expires_at < now() 
    AND is_active = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View for accessing device registrations without exposing encrypted data
-- This should be used by most application code to prevent accidental exposure
CREATE OR REPLACE VIEW device_registrations_safe AS
SELECT 
  id,
  device_id,
  user_id,
  platform,
  app_version,
  token_expires_at,
  last_used_at,
  created_at,
  updated_at,
  is_active,
  device_metadata,
  last_known_location,
  -- Indicate whether token is present without exposing it
  CASE WHEN encrypted_token IS NOT NULL THEN true ELSE false END as has_push_token
FROM device_registrations;

-- Grant appropriate permissions (adjust as needed for your security model)
-- Note: Only specific service accounts should have access to the raw encrypted_token fields