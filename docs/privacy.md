# Privacy and Data Retention Policy

## Overview

This document outlines the privacy and data retention policies for the GlocalCloudApp location services.

## Data Collection

### User Location Data

The application collects and stores user location data in the following circumstances:
- When users explicitly share their location
- During active use of location-based features
- For analytical and service improvement purposes (with consent)

### Data Types Collected

- **Geographic Coordinates**: Latitude and longitude coordinates
- **Accuracy Information**: Location accuracy measurements in meters
- **Timestamps**: When location data was collected
- **Session Information**: Optional session identifiers for tracking user sessions
- **Metadata**: Additional contextual information in JSON format

## Data Retention

### Automatic Data Purge

- **User location data** is automatically purged after **30 days** by default
- This retention period can be configured via the `LOCATION_RETENTION_DAYS` environment variable
- Purge operations run nightly as scheduled background jobs
- All purge operations are logged in the privacy audit log

### Audit Trail

All privacy-related operations are logged with:
- Operation type (purge, user deletion, etc.)
- Affected table and row counts
- Timestamps
- User identifiers (where applicable)
- Retention policy parameters

## User Rights (GDPR Compliance)

### Right to Deletion

Users have the right to request complete deletion of their data:
- **Endpoint**: `DELETE /privacy/user-data/:userId`
- **Authentication**: Requires valid API key
- **Scope**: Deletes all user location data and associated events
- **Audit**: All deletions are logged for compliance tracking

### Right to Access

Users can request access to their stored location data:
- **Endpoint**: `GET /user-locations?userId=:userId`
- **Returns**: All stored location data for the specified user
- **Format**: JSON with geographic coordinates, timestamps, and metadata

## Technical Implementation

### Database Schema

The system uses PostgreSQL with PostGIS extension for efficient geographic data storage:

#### `user_locations` Table
```sql
- id: UUID primary key
- user_id: UUID (user identifier)
- session_id: UUID (optional session tracking)
- geog: GEOGRAPHY(Point, 4326) (location coordinates)
- accuracy: FLOAT (location accuracy in meters)
- payload: JSONB (additional metadata)
- created_at: TIMESTAMPTZ (creation timestamp)
- updated_at: TIMESTAMPTZ (last update timestamp)
```

#### `privacy_audit_log` Table
```sql
- id: UUID primary key
- operation: TEXT (operation type)
- table_name: TEXT (affected table)
- affected_rows: BIGINT (number of affected records)
- user_id: UUID (optional, for user-specific operations)
- retention_days: INTEGER (for purge operations)
- metadata: JSONB (additional operation details)
- created_at: TIMESTAMPTZ (operation timestamp)
```

### Scheduled Jobs

The system runs automated privacy jobs:

#### Nightly Location Purge
- **Schedule**: Every 24 hours
- **Function**: Removes location data older than retention period
- **Configuration**: `LOCATION_RETENTION_DAYS` environment variable (default: 30)
- **Logging**: Results logged to privacy audit log

### API Endpoints

#### User Location Management
- `POST /user-locations` - Create new location record
- `GET /user-locations` - Retrieve user location data

#### Privacy Operations
- `DELETE /privacy/user-data/:userId` - Complete user data deletion (GDPR)
- `POST /privacy/purge-locations` - Manual location purge (admin)
- `GET /privacy/audit-log` - Privacy operation audit trail
- `POST /privacy/trigger-purge` - Manual trigger of scheduled purge

All privacy endpoints require API key authentication.

## Configuration

### Environment Variables

- `LOCATION_RETENTION_DAYS`: Number of days to retain location data (default: 30)
- `APP_API_KEY`: API key for administrative operations
- `DATABASE_URL`: PostgreSQL connection string with PostGIS support

### Security Considerations

- All privacy operations require authentication
- Location data is stored with geographic indexes for performance
- Audit logs provide complete compliance trail
- Automated purge prevents indefinite data accumulation

## Compliance

This implementation supports compliance with:
- **GDPR** (General Data Protection Regulation)
- **CCPA** (California Consumer Privacy Act)
- **Other regional privacy regulations**

Key compliance features:
- Automated data retention enforcement
- User data deletion capabilities
- Comprehensive audit logging
- Transparent data handling practices

## Contact

For privacy-related questions or data requests, please contact the system administrator or refer to the main application privacy policy.

---

*Last updated: [Current Date]*
*Version: 1.0*