# Archived Express Server Documentation

**Date Archived:** January 2025  
**Reason:** Removed as part of cleanup and deprecation after verifying parity with alternative solutions.

## Overview

The Express server provided a Node.js/TypeScript API with PostgreSQL + PostGIS backend for geospatial event management and CMS integration.

## Key Features

### 1. Geospatial Event Management
- **Database:** PostgreSQL with PostGIS extension
- **Core Entity:** Events with spatial coordinates, metadata, and timestamps
- **Spatial Queries:**
  - Radius search (events within X meters of a point)
  - Nearest neighbor search (closest N events to a point)
  - Polygon intersection (events within a GeoJSON polygon)
  - Bounding box queries (events within lat/lon rectangle)

### 2. API Endpoints

#### Event CRUD Operations
- `GET /events` - List recent events with optional time/payload filters
- `POST /events` - Create single event
- `POST /events/bulk` - Bulk insert events
- `GET /events/:id` - Get event by UUID
- `PATCH /events/:id` - Update event (partial)
- `DELETE /events/:id` - Delete event

#### Spatial Queries
- `GET /events/radius?lat=X&lon=Y&meters=Z` - Radius search
- `GET /events/nearest?lat=X&lon=Y&limit=N` - Nearest events
- `POST /events/polygon` - Polygon intersection search
- `GET /events/bbox?w=X&s=Y&e=Z&n=W` - Bounding box search

#### CMS Integration
- `GET /cms/pages` - List published pages from Strapi CMS
- `GET /cms/pages/:slug` - Get page by slug
- `GET /cms/pages/:tenant/:slug` - Get page by tenant and slug

### 3. Database Schema

```sql
-- Core events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  geog GEOGRAPHY(Point, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index for fast queries
CREATE INDEX idx_events_geog_gist ON events USING GIST (geog);
CREATE INDEX idx_events_payload_gin ON events USING GIN (payload);
CREATE INDEX idx_events_created_at ON events (created_at DESC);
```

### 4. Authentication & Security
- Pre-shared API key authentication (`APP_API_KEY`)
- Header-based auth: `x-app-key` or `Authorization: Bearer <key>`
- CMS proxy with optional Strapi token integration

### 5. Caching
- TTL-based in-memory cache for CMS responses
- Configurable cache duration (`CMS_CACHE_TTL_MS`)

## Technical Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js with TypeScript
- **Database:** PostgreSQL with PostGIS extension
- **Validation:** Zod for request/response validation
- **Dependencies:**
  - `express` - Web framework
  - `pg` - PostgreSQL client
  - `cors` - CORS middleware
  - `dotenv` - Environment configuration
  - `zod` - Schema validation

## Environment Configuration

```env
# Database
DATABASE_URL=postgres://user:password@host:port/database
DATABASE_SSL=require  # For production

# Server
PORT=4000
APP_API_KEY=your-shared-secret-key

# CMS Integration (Strapi)
STRAPI_BASE_URL=http://localhost:1337
STRAPI_TOKEN=optional-readonly-api-token
CMS_CACHE_TTL_MS=15000
STRAPI_DEBUG=1  # For debugging
```

## Docker Configuration

The server used Docker Compose for local development:

```yaml
# docker-compose.yml
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: glocal
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - ./sql:/docker-entrypoint-initdb.d/
```

## Key Code Components

### 1. Database Connection (`db.ts`)
- Connection pooling with `pg.Pool`
- SSL configuration for production
- PostGIS extension validation
- Query helper functions

### 2. CMS Integration (`cms.ts`)
- Strapi API client with authentication
- URL building with query parameters
- Error handling and debugging

### 3. Caching (`cache.ts`)
- TTL-based cache implementation
- Automatic expiration handling
- Generic type support

### 4. Main Server (`server.ts`)
- Express app configuration
- Route definitions for all endpoints
- Input validation with Zod schemas
- Spatial query implementations

## Migration Scripts

### Database Initialization
- `001_init.sql` - Creates events table with spatial indexes
- `002_create_cms_schema.sql` - Creates CMS schema for Strapi

### Data Management
- `migrate.ts` - Database migration runner
- `seed.ts` - Sample data seeding

## Unique Value Propositions

1. **Geospatial Expertise:** Complete implementation of spatial queries with PostGIS
2. **Performance Optimizations:** Proper spatial indexing and query optimization
3. **CMS Integration:** Seamless Strapi integration with caching and authentication
4. **Production Ready:** SSL support, proper error handling, graceful shutdown
5. **Type Safety:** Full TypeScript implementation with Zod validation

## Integration Points Removed

### Frontend Integration
- `services/api.ts` - API client functions for CMS and event management
- Environment variables: `EXPO_PUBLIC_API_BASE`, `EXPO_PUBLIC_APP_API_KEY`
- CMS content fetching in the Expo app

### Development Workflow
- Server setup in README.md
- npm scripts for server management
- Docker development environment

## Recommended Alternatives

If similar functionality is needed in the future, consider:
1. **Supabase** - PostgreSQL with PostGIS, REST APIs, and real-time features
2. **Hasura** - GraphQL API over PostgreSQL with spatial support
3. **AWS AppSync + Aurora** - Managed GraphQL with PostgreSQL
4. **Firebase + BigQuery** - For non-PostgreSQL geospatial needs
5. **Custom serverless functions** - For specific geospatial operations

## Notes

- All spatial calculations used the WGS84 coordinate system (SRID 4326)
- Geography type was used for meter-accurate distance calculations
- The server supported both public and authenticated CMS access patterns
- Bulk operations were optimized for performance with parameterized queries
- Error handling included proper HTTP status codes and detailed error messages