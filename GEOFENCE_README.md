# Geofence Catch-up Evaluation System

This document describes the implementation of the geofence catch-up evaluation system as specified in issue requirements.

## Overview

The system implements a scheduled (cron) task that runs every 5 minutes to scan recent locations for missed geofence events. It processes users/locations not handled by the fast path (real-time mobile client checking) and updates geofence_hits with notifications.

## Architecture

### Database Schema

- **geofences**: Stores geofence zones with center point and radius
- **user_locations**: Tracks user location history with processing status
- **geofence_hits**: Records detected geofence entry events

See: `server/sql/003_geofence_schema.sql`

### Core Components

1. **GeofenceEvaluationService** (`server/src/geofence-service.ts`)
   - Main evaluation logic with batch processing
   - Configurable batch size and lookback window
   - Structured logging with spec_id F-003

2. **Strapi Geolocation Plugin** (`cms/src/plugins/geolocation/`)
   - Cron task running every 5 minutes
   - Manual trigger and status endpoints
   - Automatic startup with Strapi

3. **User Location API** (`server/src/server.ts`)
   - Endpoint for mobile apps to submit location updates
   - Authenticated with APP_API_KEY

## Configuration

Environment variables for tuning:

```bash
# Batch processing configuration
GEOFENCE_BATCH_SIZE=100          # Number of locations processed per batch
GEOFENCE_LOOKBACK_MINUTES=30     # How far back to scan for unprocessed locations

# Database and API
DATABASE_URL=postgresql://...
APP_API_KEY=your-secure-key
```

## API Endpoints

### Location Tracking
```
POST /locations
Content-Type: application/json
Authorization: Bearer <APP_API_KEY>

{
  "userId": "user123",
  "lat": 37.7749,
  "lon": -122.4194,
  "accuracy": 10
}
```

### Geofence Evaluation (Strapi Plugin)
```
# Manual trigger
POST /api/geolocation/geofence-evaluation/trigger

# Check status
GET /api/geolocation/geofence-evaluation/status
```

## Setup Instructions

1. **Run Database Migrations**
   ```bash
   cd server
   npm run migrate
   ```

2. **Start Server**
   ```bash
   cd server
   npm run dev
   ```

3. **Start Strapi CMS**
   ```bash
   cd cms
   npm run develop
   ```

The cron task will automatically start when Strapi boots up.

## Logging

All operations are logged with structured JSON format including:
- `spec_id`: "F-003" 
- `timestamp`: ISO 8601 timestamp
- `service`: "geofence-catchup"
- Contextual metadata (batch sizes, user counts, etc.)

## Performance Tuning

- **GEOFENCE_BATCH_SIZE**: Increase for better throughput, decrease for lower memory usage
- **GEOFENCE_LOOKBACK_MINUTES**: Adjust based on your location update frequency
- Database indexes are automatically created for optimal query performance

## Testing

Run the test script to validate the setup:
```bash
npx tsx test-geofence.ts
```

Note: Requires a working PostgreSQL database with PostGIS extension.

## Implementation Notes

- Uses PostGIS for efficient geospatial queries
- Prevents duplicate notifications with 15-minute cooldown per user/geofence
- Marks locations as processed to avoid reprocessing
- Graceful error handling with detailed logging
- Compatible with existing LocationService.ts on mobile clients