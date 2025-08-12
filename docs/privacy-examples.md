# Privacy Features Usage Examples

This document provides examples of how to use the privacy and data retention features.

## Setting up Environment

Add to your `.env` file:

```bash
# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/glocalcloudapp
DATABASE_SSL=false

# API authentication
APP_API_KEY=your-secure-api-key-here

# Privacy settings
LOCATION_RETENTION_DAYS=30  # Default: 30 days
```

## API Usage Examples

### 1. Creating User Location Records

```bash
# Create a user location
curl -X POST http://localhost:4000/user-locations \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "sessionId": "123e4567-e89b-12d3-a456-426614174001",
    "longitude": -122.4194,
    "latitude": 37.7749,
    "accuracy": 10,
    "payload": {
      "source": "mobile_app",
      "activity": "walking"
    }
  }'
```

### 2. Retrieving User Locations

```bash
# Get locations for a specific user
curl "http://localhost:4000/user-locations?userId=123e4567-e89b-12d3-a456-426614174000&limit=50"

# Get recent locations (last 24 hours)
curl "http://localhost:4000/user-locations?sinceHours=24&limit=100"

# Get locations for a specific session
curl "http://localhost:4000/user-locations?sessionId=123e4567-e89b-12d3-a456-426614174001"
```

### 3. GDPR User Data Deletion

```bash
# Delete all data for a user (requires API key)
curl -X DELETE http://localhost:4000/privacy/user-data/123e4567-e89b-12d3-a456-426614174000 \
  -H "x-app-key: your-api-key"
```

### 4. Manual Location Purge

```bash
# Purge locations older than 30 days (requires API key)
curl -X POST http://localhost:4000/privacy/purge-locations \
  -H "Content-Type: application/json" \
  -H "x-app-key: your-api-key" \
  -d '{"retentionDays": 30}'
```

### 5. Privacy Audit Log

```bash
# Get audit log
curl "http://localhost:4000/privacy/audit-log?limit=10" \
  -H "x-app-key: your-api-key"

# Get deletion operations only
curl "http://localhost:4000/privacy/audit-log?operation=user_data_deletion" \
  -H "x-app-key: your-api-key"

# Get audit log for specific user
curl "http://localhost:4000/privacy/audit-log?userId=123e4567-e89b-12d3-a456-426614174000" \
  -H "x-app-key: your-api-key"
```

### 6. Manual Job Trigger

```bash
# Trigger purge job manually (requires API key)
curl -X POST http://localhost:4000/privacy/trigger-purge \
  -H "Content-Type: application/json" \
  -H "x-app-key: your-api-key" \
  -d '{"retentionDays": 7}'
```

## Database Operations

### Running Migrations

```bash
# Apply new privacy-related database migrations
cd server
npm run migrate
```

### Manual Database Functions

You can also call the privacy functions directly in the database:

```sql
-- Purge locations older than 30 days
SELECT * FROM purge_old_user_locations(30);

-- Delete all data for a user
SELECT * FROM delete_user_data('123e4567-e89b-12d3-a456-426614174000'::uuid);

-- Check audit log
SELECT * FROM privacy_audit_log ORDER BY created_at DESC LIMIT 10;
```

## Scheduled Jobs

The application automatically starts scheduled jobs when the server starts:

- **Nightly Purge**: Runs every 24 hours to remove old location data
- **Configurable Retention**: Set via `LOCATION_RETENTION_DAYS` environment variable
- **Automatic Logging**: All operations are logged to the audit trail

## Testing

```bash
# Run privacy validation tests
cd server
npm run validate:privacy

# Run privacy function tests (requires database)
npm run test:privacy
```

## Compliance Notes

- All privacy operations require API key authentication
- User data deletion is immediate and irreversible
- Audit logs provide complete compliance trail
- Location data is automatically purged based on retention policy
- Geographic data uses PostGIS for efficient spatial operations