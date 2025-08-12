# Geofences Plugin for Strapi

A comprehensive geofences management plugin that extends location-based functionality to support CRUD operations, polygon geofences, notification templates, and intelligent deduplication.

## Features

### Core Functionality
- **CRUD Operations**: Full create, read, update, delete operations for geofences and notification templates
- **Geometry Support**: 
  - Point + radius geofences (traditional circular boundaries)
  - Polygon geofences (complex shapes with multiple vertices)
- **Admin Access Control**: Plugin endpoints are restricted to admin users only
- **Comprehensive Logging**: All operations logged with spec_id F-003 for traceability

### Advanced Geofence Features
- **Suppression Windows**: Configurable time windows to prevent notification spam
- **Hysteresis Logic**: Buffer zones to prevent rapid enter/exit oscillations
- **Fast Path Evaluation**: Real-time location validation via API endpoints
- **Cron-based Evaluation**: Scheduled batch processing for performance
- **Hit Recording**: Complete audit trail of all geofence events for deduplication

### Content Types

#### Geofences
- **Geometry**: Support for both point+radius and polygon types
- **Notification Integration**: Link to notification templates
- **Tenant Support**: Multi-tenant isolation
- **Active State Management**: Enable/disable geofences dynamically
- **Hysteresis Configuration**: Per-geofence buffer settings
- **Suppression Settings**: Customizable notification windows

#### Notification Templates  
- **Multiple Types**: Push, email, SMS, webhook notifications
- **Priority Levels**: Low, normal, high, urgent
- **Template Customization**: Rich text for emails, custom data for webhooks
- **Active State Management**: Enable/disable templates

#### Geofence Hits
- **Event Tracking**: Complete log of enter/exit events
- **Deduplication Data**: Suppression tracking and reasons
- **Notification Status**: Track which hits triggered notifications
- **Audit Trail**: Full metadata for compliance and debugging

## API Endpoints

### Geofences
```
GET    /api/geofences                 - List all geofences
GET    /api/geofences/:id             - Get specific geofence
POST   /api/geofences                 - Create new geofence
PUT    /api/geofences/:id             - Update geofence
DELETE /api/geofences/:id             - Delete geofence
POST   /api/geofences/validate-location - Real-time location validation
```

### Notification Templates
```
GET    /api/notification-templates     - List all templates
GET    /api/notification-templates/:id - Get specific template
POST   /api/notification-templates     - Create new template
PUT    /api/notification-templates/:id - Update template
DELETE /api/notification-templates/:id - Delete template
```

## Usage Examples

### Creating a Point-Radius Geofence
```json
{
  "name": "Office Building",
  "description": "Main office location",
  "geometry_type": "point_radius",
  "center_latitude": 37.7749,
  "center_longitude": -122.4194,
  "radius_meters": 100,
  "suppression_window_seconds": 300,
  "hysteresis_buffer_meters": 10,
  "is_active": true,
  "notification_template": 1
}
```

### Creating a Polygon Geofence
```json
{
  "name": "Campus Area",
  "description": "University campus boundary",
  "geometry_type": "polygon",
  "polygon_coordinates": [
    [-122.42, 37.77],
    [-122.41, 37.77],
    [-122.41, 37.78],
    [-122.42, 37.78],
    [-122.42, 37.77]
  ],
  "suppression_window_seconds": 600,
  "is_active": true
}
```

### Location Validation
```json
POST /api/geofences/validate-location
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "user_id": "user123",
  "tenant": "public"
}
```

## Installation

1. The plugin is already integrated into your Strapi installation
2. Run `npm run build` to compile the plugin
3. Start your Strapi application
4. Navigate to the admin panel to begin creating geofences

## Configuration

### Cron Job Settings
The plugin automatically sets up a cron job for batch geofence evaluation. The default interval is every 30 seconds, but this can be modified in the plugin configuration.

### Environment Variables
- `EXPO_PUBLIC_CMS_BASE`: Base URL for the CMS API (default: http://localhost:1337)

## Security

- All geofence management endpoints require admin authentication
- Location validation endpoint is public (for client app integration)
- Comprehensive audit logging with spec_id F-003
- Multi-tenant data isolation

## Performance Considerations

- Polygon evaluation uses efficient point-in-polygon algorithms
- Suppression windows prevent notification flooding
- Hysteresis buffers reduce computational overhead
- Cron-based batch processing for high-volume scenarios
- Database indexes on frequently queried fields

## Troubleshooting

### Common Issues
1. **Plugin not appearing in admin**: Ensure `config/plugins.ts` is properly configured
2. **Location validation failing**: Check CMS_BASE environment variable
3. **Notifications not sending**: Verify notification template configuration
4. **Performance issues**: Adjust cron interval or implement custom indexing

### Logging
All operations are logged with the following structure:
```json
{
  "spec_id": "F-003",
  "action": "operation_type",
  "user_id": "user_identifier",
  "geofence_id": 123,
  "metadata": {}
}
```

## Development

### Testing
Run the included test suites:
```bash
node /tmp/test-geofences.js
node /tmp/test-api-validation.js
```

### Extending
The plugin architecture supports easy extension:
- Add new notification types in the evaluation service
- Extend content types with additional fields
- Implement custom policies for fine-grained access control
- Add new geometry types (e.g., corridors, complex shapes)