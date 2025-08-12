# GitHub Copilot Instructions for glocalcloudapp

## Project Overview

This is a React Native/Expo mobile app with a consolidated Strapi backend featuring custom plugins for geolocation and push notifications. The architecture follows ADR-0001 (see `docs/adr/ADR-0001-consolidate-cms-api.md`).

## Key Technologies & Patterns

### Backend (Strapi)
- **Framework**: Strapi 5.x with TypeScript
- **Database**: PostgreSQL with PostGIS extension for geospatial operations
- **Architecture**: Plugin-driven with custom geolocation and push notification plugins
- **Location**: `cms/` directory

### Frontend (Mobile App)
- **Framework**: React Native with Expo Router
- **Navigation**: expo-router for file-based routing
- **Maps**: expo-maps with Google Maps integration
- **Location**: Root directory and `app/` subdirectory

### Development Preferences

1. **TypeScript First**: All new code should be TypeScript with proper type definitions
2. **Plugin Architecture**: Business logic should be organized as Strapi plugins when possible
3. **PostGIS Integration**: Use PostGIS functions for spatial queries and geofencing
4. **React Native Best Practices**: Follow Expo and React Native conventions

## Code Generation Guidelines

### Strapi Plugin Development

When creating or modifying Strapi plugins:

```typescript
// Plugin structure example
// cms/src/plugins/[plugin-name]/strapi-server.ts
export default {
  register({ strapi }: { strapi: any }) {
    // Plugin registration logic
  },
  bootstrap({ strapi }: { strapi: any }) {
    // Plugin initialization logic
  },
};
```

**Prefer:**
- TypeScript interfaces for all data models
- Strapi's content-type schema for data definitions
- Custom services for business logic
- Controller methods that follow REST conventions
- Proper error handling with Strapi's error utilities

### Geolocation Plugin Patterns

For geolocation-related code:

```typescript
// Example PostGIS query in plugin service
const nearbyLocations = await strapi.db.connection.raw(`
  SELECT *, ST_Distance(
    ST_GeomFromText('POINT(${longitude} ${latitude})', 4326),
    location_point
  ) as distance
  FROM locations
  WHERE ST_DWithin(
    ST_GeomFromText('POINT(${longitude} ${latitude})', 4326),
    location_point,
    ${radiusInMeters}
  )
  ORDER BY distance;
`);
```

**Key Concepts:**
- Use `ST_GeomFromText` for point creation
- Use `ST_DWithin` for radius-based queries
- Use `ST_Distance` for distance calculations
- Always specify SRID (4326 for GPS coordinates)

### Push Notification Plugin Patterns

For push notification functionality:

```typescript
// Example notification service method
async sendLocationBasedNotification(userId: number, location: GeoPoint) {
  const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
  const notification = {
    title: 'Location Alert',
    body: `You're near ${location.name}`,
    data: { locationId: location.id }
  };
  // Send notification logic
}
```

### React Native/Expo Patterns

For mobile app development:

```typescript
// Example location hook
const useLocation = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      }
    })();
  }, []);
  
  return location;
};
```

**Prefer:**
- Custom hooks for location and API logic
- TypeScript interfaces for API responses
- Proper error boundaries and loading states
- Expo's built-in components when available

## File Organization

### Plugin Structure
```
cms/src/plugins/[plugin-name]/
├── admin/                    # Admin UI components
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Admin pages
│   │   └── index.ts         # Admin entry point
├── server/                  # Backend logic
│   ├── controllers/         # Request handlers
│   ├── services/           # Business logic
│   ├── routes/             # API routes
│   ├── content-types/      # Data models
│   └── index.ts            # Server entry point
└── strapi-server.ts        # Plugin entry point
```

### Mobile App Structure
```
app/                         # Expo Router pages
├── (tabs)/                 # Tab navigation
├── +not-found.tsx          # 404 page
└── _layout.tsx             # Root layout

components/                  # Reusable components
hooks/                      # Custom React hooks
services/                   # API and utility services
types/                      # TypeScript type definitions
```

## API Conventions

### Strapi API Endpoints
- Use RESTful conventions: GET, POST, PUT, DELETE
- Custom endpoints: `/api/[plugin-name]/[action]`
- Authentication: Include JWT token in Authorization header

### Error Handling
```typescript
// Strapi controller error handling
try {
  const result = await strapi.service('plugin::geolocation.location').findNearby(params);
  return ctx.send(result);
} catch (error) {
  strapi.log.error('Location search failed:', error);
  return ctx.badRequest('Failed to search locations', { error: error.message });
}
```

## Testing Patterns

- **Unit Tests**: Focus on services and utilities
- **Integration Tests**: Test plugin APIs and database operations
- **E2E Tests**: Mobile app user flows with real backend

## Environment Variables

Key environment variables to be aware of:
- `DATABASE_URL`: PostgreSQL connection string
- `STRAPI_ADMIN_JWT_SECRET`: Admin authentication
- `EXPO_PUBLIC_API_BASE`: Mobile app API endpoint
- `GOOGLE_MAPS_API_KEY`: Maps integration

## Common Tasks

1. **Adding new geolocation feature**: Extend geolocation plugin with new service method
2. **Creating push notification template**: Add content-type in push-notifications plugin
3. **Adding mobile screen**: Create new file in `app/` directory following Expo Router conventions
4. **Database migration**: Use Strapi's migration system or direct PostgreSQL for PostGIS functions

## References

- **ADR-0001**: Architecture decisions (`docs/adr/ADR-0001-consolidate-cms-api.md`)
- **Strapi Docs**: https://docs.strapi.io/dev-docs/plugins-development
- **Expo Docs**: https://docs.expo.dev/
- **PostGIS Reference**: https://postgis.net/docs/