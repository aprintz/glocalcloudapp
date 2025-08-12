# Native Push Notifications & Background Location Implementation

This document outlines the implementation of native push notifications and background location tracking features as requested in issue #18.

## 🚀 Features Implemented

### 1. Native Push Notification Tokens
- **Switched from Expo Push to Native Tokens**: Using `getDevicePushTokenAsync()` instead of Expo's push service
- **Cross-platform Support**: Works on both iOS (APNs) and Android (FCM)
- **Server Registration**: Automatic token registration with the backend API
- **Token Management**: Local storage with expiration tracking and re-registration

### 2. Background Location Tracking
- **Periodic Updates**: Configurable interval-based location updates to server
- **Background Tasks**: Uses `expo-task-manager` and `expo-background-fetch`
- **Dynamic Intervals**: Server can adjust update frequency via `nextSuggestedUpdateSec`
- **Foreground Service**: Android foreground service for continuous location tracking

### 3. New API Endpoints
- **`POST /device-tokens`**: Register native push tokens with device information
- **`POST /location-updates`**: Submit location data with configurable update intervals
- **Database Tables**: New tables for device tokens and location history

### 4. Enhanced Settings UI
- Native push token status and management
- Background tracking controls
- Test buttons for notifications and location updates
- Token information display

## 📱 Technical Implementation

### Services Architecture

#### PushNotificationService
```typescript
// Features:
- Native token acquisition (FCM/APNs)
- Server registration with device metadata
- Local token caching with expiration
- Test notification scheduling
- Notification event listeners
```

#### BackgroundLocationService
```typescript
// Features:
- Background location tracking with TaskManager
- Periodic server updates with BackgroundFetch
- Dynamic update interval adjustment
- Location history storage
- Permission management
```

### App Configuration Updates
```typescript
// app.config.ts additions:
- iOS UIBackgroundModes: ['location']
- Android background location permissions
- Foreground service permissions
- Native notification configuration
```

### Database Schema
```sql
-- Device tokens table
CREATE TABLE device_tokens (
  device_id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  type TEXT CHECK (type IN ('ios', 'android')),
  platform TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Location updates table  
CREATE TABLE location_updates (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT REFERENCES device_tokens(device_id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  geog GEOGRAPHY(Point, 4326) -- PostGIS geography column
);
```

## 🔧 API Endpoints

### Device Token Registration
```
POST /device-tokens
Content-Type: application/json
x-app-key: <API_KEY>

{
  "token": "native_push_token_here",
  "type": "ios" | "android", 
  "deviceId": "unique_device_id",
  "platform": "ios" | "android",
  "appVersion": "1.0.0"
}

Response:
{
  "success": true,
  "deviceId": "unique_device_id"
}
```

### Location Updates
```
POST /location-updates  
Content-Type: application/json
x-app-key: <API_KEY>

{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracy": 10.0,
  "timestamp": "2024-01-01T12:00:00Z",
  "deviceId": "unique_device_id"
}

Response:
{
  "success": true,
  "id": 123,
  "nextSuggestedUpdateSec": 300
}
```

## 📋 Settings Screen Features

The enhanced Settings screen now includes:

### Native Push Notifications Section
- **Push Token Status**: Visual indicator of registration status
- **Token Information**: Display token details and last registration time
- **Test Notification**: Send immediate test notification
- **Re-register Token**: Force token re-registration with server

### Background Location Section  
- **Background Tracking Toggle**: Enable/disable server location updates
- **Location Update Test**: Trigger immediate location update
- **Permission Management**: Handle location and background permissions

## ⚙️ Configuration

### Environment Variables
```bash
# Required for API communication
EXPO_PUBLIC_API_BASE=http://localhost:4000
EXPO_PUBLIC_APP_API_KEY=your_api_key_here

# For Google Maps (existing)
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Permissions Required

#### iOS (Info.plist)
- `NSLocationAlwaysAndWhenInUseUsageDescription`
- `NSLocationWhenInUseUsageDescription`
- `UIBackgroundModes`: `['location']`

#### Android (app.json)
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION` 
- `ACCESS_BACKGROUND_LOCATION`
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_LOCATION`

## 🧪 Testing

### Service Tests
```typescript
// Import test utilities
import { testServices } from '@/services/index';
import { runAllEndpointTests } from '@/services/testEndpoints';

// Test service initialization
const servicesWork = await testServices();

// Test API endpoints
const endpointsWork = await runAllEndpointTests();
```

### Manual Testing
1. **Push Notifications**: Use "Test Push Notification" button in Settings
2. **Location Updates**: Use "Send Location Update" button in Settings  
3. **Background Tracking**: Enable background tracking and monitor server logs
4. **Token Registration**: Check token info and re-register functionality

## 📝 Notes

### CMS Proxy Logic
The existing CMS proxy endpoints (`/cms/pages*`) were **retained** as they are actively used by the Content tab in the application. The proxy logic provides:
- Strapi CMS integration
- Page content management
- Multi-tenant content support

### Web Compatibility
While the new native features are designed for mobile devices, the app maintains web compatibility for development and testing purposes. Native modules will show errors in web browsers, which is expected behavior.

### Background Tasks
- iOS: Uses background app refresh and location background mode
- Android: Uses foreground services for persistent location tracking
- Update intervals are dynamically adjustable based on server response

## 🔄 Migration Path

For existing installations:
1. Run database migration: `003_device_tokens_and_location_tracking.sql`
2. Update app configuration with new permissions
3. Deploy server with new endpoints
4. Users will need to grant background location permissions
5. Push tokens will be automatically registered on app launch

## 🎯 Future Enhancements

- **Push Notification Campaigns**: Server-side notification scheduling
- **Location Intelligence**: Movement pattern analysis
- **Battery Optimization**: Adaptive update intervals based on device state
- **Geofencing Integration**: Combine with existing notification zones