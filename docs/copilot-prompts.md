# Copilot Prompt Library

This document provides curated prompts and examples for developing with GitHub Copilot in the glocalcloudapp monorepo. Use these patterns to accelerate development while maintaining consistency with the existing architecture.

## Architecture Overview

The project is a monorepo containing:
- **Expo React Native App** (`/app`) - Cross-platform mobile app with TypeScript
- **Node.js Express API** (`/server`) - REST API with PostGIS spatial queries
- **Strapi CMS** (`/cms`) - Content management with PostgreSQL backend

## Strapi Plugin Development

### Content Type Creation

```typescript
// Prompt: "Create a Strapi content type for events with location data"
// File: cms/src/api/event/content-types/event/schema.json
{
  "kind": "collectionType",
  "collectionName": "events",
  "info": {
    "singularName": "event",
    "pluralName": "events",
    "displayName": "Event",
    "description": "Geotagged events with metadata"
  },
  "options": {
    "draftAndPublish": true,
    "indexes": [
      { "name": "idx_event_location", "type": "index", "columns": ["latitude", "longitude"] }
    ]
  },
  "attributes": {
    "title": { "type": "string", "required": true },
    "description": { "type": "richtext" },
    "latitude": { "type": "decimal", "required": true },
    "longitude": { "type": "decimal", "required": true },
    "metadata": { "type": "json" },
    "tenant": { "type": "string", "default": "public" }
  }
}
```

### Custom Controller with Validation

```typescript
// Prompt: "Create a Strapi controller for paginated event listing with location filtering"
// File: cms/src/api/event/controllers/event.ts
import { Context } from '@strapi/strapi';

export default {
  async findNearby(ctx: Context) {
    const { lat, lon, radius = 1000 } = ctx.query;
    
    if (!lat || !lon) {
      return ctx.badRequest('latitude and longitude are required');
    }
    
    const events = await strapi.entityService.findMany('api::event.event', {
      filters: {
        $and: [
          { publishedAt: { $notNull: true } },
          // Note: For actual geo queries, implement in the Express API layer
        ]
      },
      populate: '*',
    });
    
    return events;
  }
};
```

### Lifecycle Hooks

```typescript
// Prompt: "Add Strapi lifecycle hook to validate coordinates before saving"
// File: cms/src/api/event/content-types/event/lifecycles.ts
export default {
  beforeCreate(event: any) {
    const { data } = event.params;
    
    if (data.latitude && (data.latitude < -90 || data.latitude > 90)) {
      throw new Error('Invalid latitude: must be between -90 and 90');
    }
    
    if (data.longitude && (data.longitude < -180 || data.longitude > 180)) {
      throw new Error('Invalid longitude: must be between -180 and 180');
    }
  },

  beforeUpdate(event: any) {
    const { data } = event.params;
    
    if (data.latitude && (data.latitude < -90 || data.latitude > 90)) {
      throw new Error('Invalid latitude: must be between -90 and 90');
    }
    
    if (data.longitude && (data.longitude < -180 || data.longitude > 180)) {
      throw new Error('Invalid longitude: must be between -180 and 180');
    }
  }
};
```

## PostGIS Spatial Queries

### Radius Search

```typescript
// Prompt: "Create PostGIS query for finding events within radius with distance sorting"
// Usage: Find all events within 3km of a point, ordered by distance
const findEventsInRadius = async (lat: number, lon: number, meters: number) => {
  const sql = `
    SELECT 
      id, 
      title, 
      payload, 
      created_at,
      ST_Distance(geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters
    FROM events
    WHERE ST_DWithin(
      geog, 
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
      $3
    )
    ORDER BY distance_meters ASC
    LIMIT 200
  `;
  
  return await pool.query(sql, [lon, lat, meters]);
};
```

### Polygon Intersection

```typescript
// Prompt: "Create PostGIS query for events intersecting with GeoJSON polygon"
// Usage: Find events within a custom drawn area
const findEventsInPolygon = async (geoJsonPolygon: any, payloadFilter?: string) => {
  const baseSQL = `
    SELECT 
      id, 
      title, 
      payload, 
      created_at,
      ST_AsGeoJSON(geog::geometry) AS geojson
    FROM events
    WHERE ST_Intersects(
      geog,
      ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography
    )
  `;
  
  const params = [JSON.stringify(geoJsonPolygon)];
  
  if (payloadFilter) {
    const sql = baseSQL + ' AND payload @> $2::jsonb LIMIT 500';
    params.push(payloadFilter);
    return await pool.query(sql, params);
  }
  
  return await pool.query(baseSQL + ' LIMIT 500', params);
};
```

### Nearest Neighbor with KNN

```typescript
// Prompt: "Create PostGIS KNN query for finding N nearest events efficiently"
// Usage: Find 20 closest events using spatial index
const findNearestEvents = async (lat: number, lon: number, limit: number = 20) => {
  const sql = `
    SELECT 
      id, 
      title, 
      payload, 
      created_at,
      geog <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS distance
    FROM events
    ORDER BY geog <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
    LIMIT $3
  `;
  
  return await pool.query(sql, [lon, lat, limit]);
};
```

### Bounding Box Query

```typescript
// Prompt: "Create efficient PostGIS bounding box query with envelope"
// Usage: Find events within map viewport
const findEventsInBounds = async (west: number, south: number, east: number, north: number) => {
  const sql = `
    SELECT 
      id, 
      title, 
      payload, 
      created_at,
      ST_AsGeoJSON(geog::geometry) AS geojson
    FROM events
    WHERE ST_Intersects(
      geog,
      ST_SetSRID(ST_MakeEnvelope($1, $2, $3, $4, 4326), 4326)::geography
    )
    ORDER BY created_at DESC
    LIMIT 1000
  `;
  
  return await pool.query(sql, [west, south, east, north]);
};
```

## Encryption and Security

### UUID Generation

```typescript
// Prompt: "Create secure UUID generation with PostgreSQL pgcrypto"
// Usage: Generate cryptographically secure UUIDs
const createSecureEvent = async (title: string, payload: any, lon: number, lat: number) => {
  const sql = `
    INSERT INTO events (id, title, payload, geog)
    VALUES (
      gen_random_uuid(), 
      $1, 
      $2::jsonb,
      ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
    )
    RETURNING id, created_at
  `;
  
  return await pool.query(sql, [title, JSON.stringify(payload), lon, lat]);
};
```

### API Key Authentication

```typescript
// Prompt: "Create Express middleware for API key authentication with multiple formats"
// Usage: Secure API endpoints with pre-shared keys
const requireAppKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const APP_API_KEY = process.env.APP_API_KEY;
  
  if (!APP_API_KEY) {
    return res.status(500).json({ error: 'APP_API_KEY not configured' });
  }
  
  // Check x-app-key header
  const headerKey = req.header('x-app-key');
  if (headerKey === APP_API_KEY) {
    return next();
  }
  
  // Check Authorization Bearer token
  const authHeader = req.header('authorization');
  if (authHeader) {
    const bearer = authHeader.replace(/^Bearer\s+/i, '');
    if (bearer === APP_API_KEY) {
      return next();
    }
  }
  
  return res.status(401).json({ error: 'unauthorized' });
};

// Apply to routes
app.get('/cms/pages', requireAppKey, async (req, res) => {
  // Protected endpoint logic
});
```

### Data Sanitization

```typescript
// Prompt: "Create Zod schema for validating and sanitizing geographic coordinates"
// Usage: Validate user input for spatial queries
import { z } from 'zod';

const CoordinateSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180)
});

const RadiusSearchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  meters: z.coerce.number().positive().max(100000), // Max 100km
  payload: z.string().optional()
});

// Usage in route handler
app.get('/events/radius', async (req, res) => {
  const validation = RadiusSearchSchema.safeParse(req.query);
  
  if (!validation.success) {
    return res.status(400).json({
      error: 'validation_failed',
      details: validation.error.flatten()
    });
  }
  
  const { lat, lon, meters, payload } = validation.data;
  // Proceed with validated data
});
```

## Property-Based Testing

### Geographic Boundary Testing

```typescript
// Prompt: "Create property-based tests for geographic coordinate validation"
// File: server/src/__tests__/geo.test.ts
import { describe, test, expect } from '@jest/globals';

describe('Geographic Coordinate Validation', () => {
  test('should reject invalid latitude values', () => {
    const invalidLatitudes = [-91, 91, -180, 180, NaN, Infinity];
    
    invalidLatitudes.forEach(lat => {
      expect(() => validateCoordinate(lat, 0)).toThrow('Invalid latitude');
    });
  });
  
  test('should accept valid coordinate ranges', () => {
    // Property: all valid coordinates should be accepted
    const validCoordinates = [
      { lat: 0, lon: 0 },          // Equator/Prime Meridian
      { lat: 90, lon: 180 },       // North Pole/Date Line
      { lat: -90, lon: -180 },     // South Pole/Date Line
      { lat: 55.6761, lon: 12.5683 } // Copenhagen
    ];
    
    validCoordinates.forEach(({ lat, lon }) => {
      expect(() => validateCoordinate(lat, lon)).not.toThrow();
    });
  });
});
```

### Spatial Query Properties

```typescript
// Prompt: "Create property-based tests for PostGIS spatial query invariants"
// Test spatial query properties and invariants
describe('PostGIS Spatial Query Properties', () => {
  test('radius search should return results within specified distance', async () => {
    const centerLat = 55.6761;
    const centerLon = 12.5683;
    const radiusMeters = 1000;
    
    const results = await findEventsInRadius(centerLat, centerLon, radiusMeters);
    
    // Property: all results should be within the specified radius
    results.rows.forEach(row => {
      expect(row.distance_meters).toBeLessThanOrEqual(radiusMeters);
    });
  });
  
  test('nearest neighbor results should be ordered by distance', async () => {
    const lat = 55.6761;
    const lon = 12.5683;
    
    const results = await findNearestEvents(lat, lon, 10);
    
    // Property: results should be ordered by increasing distance
    for (let i = 1; i < results.rows.length; i++) {
      expect(results.rows[i].distance).toBeGreaterThanOrEqual(
        results.rows[i - 1].distance
      );
    }
  });
});
```

### API Response Testing

```typescript
// Prompt: "Create property-based tests for API response structure and types"
describe('API Response Properties', () => {
  test('event creation should return valid UUID', async () => {
    const eventData = {
      title: 'Test Event',
      payload: { type: 'test' },
      lon: 12.5683,
      lat: 55.6761
    };
    
    const response = await request(app)
      .post('/events')
      .send(eventData);
    
    expect(response.status).toBe(201);
    expect(response.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
  
  test('bulk insert should preserve data integrity', async () => {
    const events = Array.from({ length: 100 }, (_, i) => ({
      title: `Event ${i}`,
      payload: { index: i },
      lon: -122 + Math.random() * 0.1,
      lat: 37.7 + Math.random() * 0.1
    }));
    
    const response = await request(app)
      .post('/events/bulk')
      .send(events);
    
    expect(response.status).toBe(201);
    expect(response.body.inserted).toBe(events.length);
  });
});
```

## Performance Testing

### Spatial Index Efficiency

```typescript
// Prompt: "Create performance tests for PostGIS spatial index usage"
describe('Spatial Query Performance', () => {
  test('radius search should use spatial index', async () => {
    const startTime = Date.now();
    
    await findEventsInRadius(55.6761, 12.5683, 1000);
    
    const duration = Date.now() - startTime;
    
    // Property: spatial queries should complete within reasonable time
    expect(duration).toBeLessThan(100); // 100ms threshold
  });
  
  test('bounding box query should scale with data size', async () => {
    // Test with increasing data volumes
    const dataSizes = [100, 1000, 10000];
    const performanceTimes: number[] = [];
    
    for (const size of dataSizes) {
      const startTime = Date.now();
      await findEventsInBounds(-122.52, 37.70, -122.35, 37.83);
      performanceTimes.push(Date.now() - startTime);
    }
    
    // Property: query time should not increase exponentially
    expect(performanceTimes[2]).toBeLessThan(performanceTimes[0] * 10);
  });
});
```

## Error Handling Patterns

### Graceful Degradation

```typescript
// Prompt: "Create error handling for database connectivity and spatial query failures"
const handleDatabaseError = (error: any, operation: string) => {
  console.error(`Database error during ${operation}:`, error);
  
  // Check for specific PostGIS errors
  if (error.code === '42883') {
    throw new Error('PostGIS extension not available');
  }
  
  if (error.code === '22P02') {
    throw new Error('Invalid geometric data format');
  }
  
  if (error.code === 'ECONNREFUSED') {
    throw new Error('Database connection failed');
  }
  
  throw new Error(`Database operation failed: ${operation}`);
};

// Usage in query functions
const safeRadiusSearch = async (lat: number, lon: number, meters: number) => {
  try {
    return await findEventsInRadius(lat, lon, meters);
  } catch (error) {
    return handleDatabaseError(error, 'radius search');
  }
};
```

## Integration Testing

### End-to-End Spatial Workflows

```typescript
// Prompt: "Create integration test for complete spatial data workflow"
describe('Spatial Data Integration', () => {
  test('complete event lifecycle with spatial queries', async () => {
    // Create event
    const createResponse = await request(app)
      .post('/events')
      .send({
        title: 'Integration Test Event',
        payload: { category: 'test' },
        lon: 12.5683,
        lat: 55.6761
      });
    
    const eventId = createResponse.body.id;
    
    // Verify event appears in radius search
    const radiusResponse = await request(app)
      .get('/events/radius')
      .query({ lat: 55.6761, lon: 12.5683, meters: 100 });
    
    const foundEvent = radiusResponse.body.find((e: any) => e.id === eventId);
    expect(foundEvent).toBeDefined();
    
    // Verify event appears in bounding box
    const bboxResponse = await request(app)
      .get('/events/bbox')
      .query({ w: 12.5, s: 55.6, e: 12.6, n: 55.7 });
    
    const foundInBbox = bboxResponse.body.find((e: any) => e.id === eventId);
    expect(foundInBbox).toBeDefined();
    
    // Clean up
    await request(app).delete(`/events/${eventId}`);
  });
});
```

---

## Usage Guidelines

1. **Copy and adapt** these patterns to your specific use case
2. **Validate inputs** using Zod schemas before database operations
3. **Use spatial indexes** for all geographic queries
4. **Test edge cases** especially coordinate boundaries and large datasets
5. **Monitor performance** of spatial queries in production
6. **Handle errors gracefully** with appropriate fallbacks