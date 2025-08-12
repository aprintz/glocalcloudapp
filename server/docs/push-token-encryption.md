# Push Token Encryption Implementation

This document describes the push token encryption implementation for secure storage of device push notification tokens.

## Overview

The implementation provides AES-256-GCM encryption for storing push tokens securely in the database, supporting Azure Notification Hub integration and other push notification services.

## Quick Start

### 1. Environment Setup

```bash
# Generate an encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Set environment variables
export PUSH_TOKEN_ENCRYPTION_KEY="your-generated-key-here"
export APP_API_KEY="your-api-key-here"
export DATABASE_URL="postgres://user:pass@localhost:5432/db"
```

### 2. Database Migration

```bash
npm run migrate
```

This will create the `device_registrations` table with encrypted token storage.

### 3. Start Server

```bash
npm run dev
```

The server will validate encryption setup on startup.

## API Usage

### Register Device

```bash
curl -X POST http://localhost:4000/devices/register \
  -H "Content-Type: application/json" \
  -H "x-app-key: your-api-key" \
  -d '{
    "deviceId": "unique-device-id",
    "platform": "ios",
    "pushToken": "actual-push-token-from-fcm-or-apns",
    "userId": "optional-user-id",
    "appVersion": "1.0.0",
    "latitude": 37.7749,
    "longitude": -122.4194
  }'
```

### Get Device Info

```bash
curl -H "x-app-key: your-api-key" \
  http://localhost:4000/devices/unique-device-id
```

### Update Device

```bash
curl -X PATCH http://localhost:4000/devices/unique-device-id \
  -H "Content-Type: application/json" \
  -H "x-app-key: your-api-key" \
  -d '{
    "pushToken": "new-push-token",
    "appVersion": "1.1.0"
  }'
```

### Get User Devices

```bash
curl -H "x-app-key: your-api-key" \
  http://localhost:4000/users/user-id/devices
```

### Deactivate Device

```bash
curl -X DELETE -H "x-app-key: your-api-key" \
  http://localhost:4000/devices/unique-device-id
```

## Security Features

### Encryption
- **Algorithm**: AES-256-GCM
- **Key Management**: Environment variable with Azure Key Vault support
- **Authentication**: Built-in with GCM mode
- **IV**: Random 96-bit per encryption

### Access Control
- API key required for all endpoints
- Safe database view prevents accidental token exposure
- Encrypted tokens never returned in API responses
- Decryption only available to authorized services

### Database Schema

```sql
-- Encrypted token storage
encrypted_token TEXT NOT NULL,    -- base64 encoded encrypted data
token_iv TEXT NOT NULL,          -- base64 encoded IV  
token_tag TEXT NOT NULL,         -- base64 encoded auth tag

-- Safe view for general access
CREATE VIEW device_registrations_safe AS ...
```

## Testing

### Run Encryption Tests

```bash
npm run test:encryption
```

Tests encryption/decryption, IV uniqueness, authentication, and error handling.

### Run API Tests

```bash
# Start server first
npm run dev

# In another terminal
npm run test:api
```

Tests all API endpoints and security measures.

## Production Deployment

### Azure Key Vault Integration

```bash
# Set environment variable to reference Key Vault
export PUSH_TOKEN_ENCRYPTION_KEY="@Microsoft.KeyVault(SecretUri=https://vault.vault.azure.net/secrets/push-token-key/)"
```

### Monitoring

- Monitor encryption validation success on startup
- Alert on high decryption failure rates
- Track token registration and cleanup metrics

### Maintenance

```bash
# Regular cleanup of expired tokens
curl -X POST -H "x-app-key: your-api-key" \
  http://localhost:4000/devices/cleanup
```

## Integration Examples

### Azure Notification Hub

```typescript
import { getDecryptedPushToken, updateLastUsed } from './deviceRegistrations.js';

async function sendNotification(deviceId: string, message: string) {
  const pushToken = await getDecryptedPushToken(deviceId);
  if (!pushToken) {
    throw new Error('No valid push token for device');
  }
  
  // Send via Azure Notification Hub
  await azureNotificationHub.send(pushToken, message);
  
  // Update usage tracking
  await updateLastUsed(deviceId);
}
```

### Geographic Targeting

```sql
-- Find devices near a location
SELECT device_id FROM device_registrations_safe
WHERE is_active = true 
  AND ST_DWithin(
    last_known_location,
    ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography,
    1000  -- 1km radius
  );
```

## Architecture Decision Record

See `docs/adr/001-push-token-encryption.md` for detailed architecture decisions and rationale.

## Copilot Instructions

See `docs/copilot-push-tokens.md` for development guidelines and patterns.

## Troubleshooting

### Encryption Validation Fails
- Verify `PUSH_TOKEN_ENCRYPTION_KEY` is properly set
- Ensure key is base64 encoded and 32 bytes
- Check server logs for specific error details

### API Returns 401
- Verify `APP_API_KEY` is set in environment
- Include `x-app-key` header in requests
- Alternatively use `Authorization: Bearer token` header

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` is correct
- Check PostGIS extension is installed
- Run migrations with `npm run migrate`

### Performance Issues
- Monitor encryption/decryption overhead
- Use connection pooling
- Consider caching decrypted tokens (with TTL)
- Index geographic queries appropriately