# Geolocation Plugin Migration

## Overview

This document outlines the migration of Express server geospatial endpoints to the new Strapi geolocation plugin.

## Migrated Endpoints

### Old Express Endpoints (DEPRECATED)
- `GET /events/radius` - Find events within radius
- `GET /events/nearest` - Find nearest events
- `POST /events/polygon` - Find events within polygon
- `GET /events/bbox` - Find events within bounding box
- `GET /events` - List all events
- `GET /events/:id` - Get event by ID
- `POST /events` - Create new event
- `POST /events/bulk` - Bulk create events
- `PATCH /events/:id` - Update event
- `DELETE /events/:id` - Delete event

### New Strapi Plugin Endpoints
- `GET /api/geolocation/events/radius` - Find events within radius
- `GET /api/geolocation/events/nearest` - Find nearest events  
- `POST /api/geolocation/events/polygon` - Find events within polygon
- `GET /api/geolocation/events/bbox` - Find events within bounding box
- `GET /api/geolocation/events` - List all events
- `GET /api/geolocation/events/:id` - Get event by ID
- `POST /api/geolocation/events` - Create new event
- `POST /api/geolocation/events/bulk` - Bulk create events
- `PATCH /api/geolocation/events/:id` - Update event
- `DELETE /api/geolocation/events/:id` - Delete event

## Migration Guide

### 1. Update API Calls

Replace old Express endpoints with new Strapi endpoints:

**Before:**
```javascript
// Radius search
const response = await fetch('/events/radius?lat=37.7749&lon=-122.4194&meters=5000');

// Nearest search  
const response = await fetch('/events/nearest?lat=37.7749&lon=-122.4194&limit=10');
```

**After:**
```javascript
// Radius search
const response = await fetch('/api/geolocation/events/radius?lat=37.7749&lon=-122.4194&meters=5000');

// Nearest search
const response = await fetch('/api/geolocation/events/nearest?lat=37.7749&lon=-122.4194&limit=10');
```

### 2. Response Format

The response format remains the same for compatibility:

```json
{
  "id": "uuid",
  "title": "Event Title",
  "payload": {},
  "created_at": "2024-01-01T00:00:00Z",
  "meters": 1500.5
}
```

### 3. Query Parameters

All query parameters remain the same:

- **Radius**: `lat`, `lon`, `meters`, `payload` (optional)
- **Nearest**: `lat`, `lon`, `limit` (optional), `payload` (optional)
- **Bbox**: `w`, `s`, `e`, `n`, `payload` (optional)
- **Polygon**: POST body with `polygon` and optional `payload`

### 4. Database Schema

The plugin uses the existing `events` table, so no database migration is required.

## Implementation Details

### PostGIS Queries

The plugin maintains the same PostGIS queries for performance:

- **ST_DWithin**: For radius searches
- **ST_Distance**: For distance calculations
- **ST_Intersects**: For polygon and bbox searches
- **Spatial indexes**: GIST index on geography column

### Performance

Performance should be identical as the same PostGIS queries are used. Knex provides the same query building capabilities as the raw PostgreSQL queries.

## Testing

Integration tests are provided in `/cms/src/plugins/geolocation/tests/` to validate:

- Radius search functionality
- Nearest neighbor searches
- Bounding box queries
- CRUD operations
- Error handling

## Deprecation Timeline

1. **Phase 1** (Current): Both endpoints available with deprecation warnings
2. **Phase 2** (Future): Remove Express endpoints, use Strapi only

### Deprecation Warnings

The old Express endpoints now log deprecation warnings:

```
[DEPRECATED] /events/radius endpoint is deprecated. Please use /api/geolocation/events/radius instead.
```

## Configuration

Enable the plugin in `/cms/config/plugins.ts`:

```typescript
export default () => ({
  geolocation: {
    enabled: true,
    resolve: './src/plugins/geolocation'
  },
});
```

## Benefits of Migration

1. **Unified API**: All endpoints through Strapi
2. **Authentication**: Leverage Strapi's auth system
3. **Admin Panel**: Potential for admin interface
4. **Extensibility**: Easy to add new geospatial features
5. **Consistency**: Same patterns as other Strapi APIs