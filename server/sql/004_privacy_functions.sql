-- Privacy and data retention functions

-- Function to purge user locations older than specified days
CREATE OR REPLACE FUNCTION purge_old_user_locations(days_old INTEGER DEFAULT 30)
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  result_count BIGINT;
BEGIN
  DELETE FROM user_locations 
  WHERE created_at < (now() - make_interval(days => days_old));
  
  GET DIAGNOSTICS result_count = ROW_COUNT;
  
  -- Log the purge operation
  INSERT INTO privacy_audit_log (operation, table_name, affected_rows, retention_days, created_at)
  VALUES ('purge_old_locations', 'user_locations', result_count, days_old, now());
  
  RETURN QUERY SELECT result_count;
END;
$$ LANGUAGE plpgsql;

-- Function to delete all data for a specific user (GDPR compliance)
CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS TABLE(
  user_locations_deleted BIGINT,
  events_deleted BIGINT
) AS $$
DECLARE
  locations_count BIGINT := 0;
  events_count BIGINT := 0;
BEGIN
  -- Delete user locations
  DELETE FROM user_locations WHERE user_id = target_user_id;
  GET DIAGNOSTICS locations_count = ROW_COUNT;
  
  -- Delete user events (if events table has user_id in payload)
  DELETE FROM events WHERE payload @> jsonb_build_object('user_id', target_user_id::text);
  GET DIAGNOSTICS events_count = ROW_COUNT;
  
  -- Log the deletion operation
  INSERT INTO privacy_audit_log (operation, table_name, affected_rows, user_id, created_at)
  VALUES 
    ('user_data_deletion', 'user_locations', locations_count, target_user_id, now()),
    ('user_data_deletion', 'events', events_count, target_user_id, now());
  
  RETURN QUERY SELECT locations_count, events_count;
END;
$$ LANGUAGE plpgsql;

-- Privacy audit log table for compliance tracking
CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL, -- 'purge_old_locations', 'user_data_deletion', etc.
  table_name TEXT NOT NULL,
  affected_rows BIGINT NOT NULL DEFAULT 0,
  user_id UUID, -- NULL for bulk operations like purge
  retention_days INTEGER, -- For purge operations
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_operation ON privacy_audit_log (operation);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_user_id ON privacy_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_created_at ON privacy_audit_log (created_at DESC);