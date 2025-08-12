# Push Token Handling Guidelines for GitHub Copilot

## Overview
This project implements secure push token storage using AES-256-GCM encryption for Azure Notification Hub integration. Follow these guidelines when working with push notification functionality.

## Security Requirements

### ✅ DO
- **Always encrypt push tokens** before storing in the database using the provided encryption utilities
- **Use the `device_registrations_safe` view** for general queries that don't need token access
- **Validate encryption setup** on application startup using `validateEncryptionSetup()`
- **Use the device registration service layer** (`deviceRegistrations.ts`) for all token operations
- **Require API key authentication** for all device registration endpoints
- **Log encryption/decryption failures** without exposing sensitive data
- **Use proper TypeScript types** defined in the service modules
- **Handle token expiry** and cleanup expired registrations regularly

### ❌ DON'T
- **Never store raw push tokens** in the database or logs
- **Never expose encrypted token components** in API responses
- **Never access `device_registrations` table directly** - use the service layer
- **Never hardcode encryption keys** - always use environment variables
- **Never return push tokens** in API responses, even to authorized clients
- **Never log decrypted tokens** or encryption components
- **Never skip encryption validation** during application startup

## Code Patterns

### Device Registration
```typescript
// ✅ Correct: Use the service layer
import { registerDevice, DeviceRegistration } from './deviceRegistrations.js';

const registration: DeviceRegistration = {
  deviceId: 'unique-device-id',
  platform: 'ios',
  pushToken: 'raw-fcm-or-apns-token',
  userId: 'user-123',
  // ... other fields
};

const result = await registerDevice(registration);
// result will NOT contain the actual push token
```

### Getting Device Info
```typescript
// ✅ Correct: Use safe view through service layer
const device = await getDeviceRegistration(deviceId);
// device.hasPushToken indicates if token is present without exposing it

// ❌ Wrong: Direct database access
const result = await query('SELECT * FROM device_registrations WHERE device_id = $1', [deviceId]);
```

### Sending Notifications (Future Implementation)
```typescript
// ✅ Correct: Only authorized notification service should decrypt
const pushToken = await getDecryptedPushToken(deviceId);
if (pushToken) {
  // Send notification using Azure Notification Hub
  await sendNotification(pushToken, notificationData);
  await updateLastUsed(deviceId); // Track usage
}
```

## API Endpoint Guidelines

### Authentication Required
All device registration endpoints require the `x-app-key` header or Bearer token authentication.

### Standard Response Format
```typescript
// ✅ Device registration response (safe)
{
  "id": "uuid",
  "deviceId": "unique-device-id", 
  "platform": "ios",
  "userId": "user-123",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
  // Note: NO push token or encrypted components
}
```

## Environment Setup

### Required Environment Variables
```bash
# Encryption key (32 bytes, base64 encoded)
PUSH_TOKEN_ENCRYPTION_KEY=your-base64-encoded-256-bit-key

# Generate new key with:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Production Considerations
- Store encryption key in Azure Key Vault
- Implement key rotation procedures
- Monitor encryption/decryption success rates
- Set up alerts for validation failures

## Database Guidelines

### Safe Queries
```sql
-- ✅ Use the safe view for general queries
SELECT * FROM device_registrations_safe WHERE user_id = $1;

-- ✅ Check if device has token without exposing it
SELECT has_push_token FROM device_registrations_safe WHERE device_id = $1;
```

### Restricted Queries (Service Layer Only)
```sql
-- ❌ Only the service layer should access these fields
SELECT encrypted_token, token_iv, token_tag FROM device_registrations WHERE device_id = $1;
```

## Error Handling

### Encryption Failures
```typescript
// ✅ Proper error handling without exposing sensitive data
try {
  const encrypted = encryptPushToken(rawToken);
  // ... store encrypted token
} catch (error) {
  console.error('Token encryption failed:', error.message);
  // Don't log the raw token or detailed error
  throw new Error('Failed to process device registration');
}
```

### Startup Validation
```typescript
// ✅ Always validate encryption setup on startup
try {
  validateEncryptionSetup();
  console.log('✓ Push token encryption validated');
} catch (error) {
  console.error('✗ Encryption setup invalid:', error.message);
  process.exit(1); // Fail fast if encryption is broken
}
```

## Testing Guidelines

### Unit Tests
```typescript
// ✅ Test encryption/decryption roundtrip
const originalToken = 'test-push-token';
const encrypted = encryptPushToken(originalToken);
const decrypted = decryptPushToken(encrypted);
expect(decrypted).toBe(originalToken);

// ✅ Test that encrypted components are different each time
const encrypted1 = encryptPushToken(originalToken);
const encrypted2 = encryptPushToken(originalToken);
expect(encrypted1.iv).not.toBe(encrypted2.iv);
expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
```

### Integration Tests
```typescript
// ✅ Test device registration without exposing tokens
const response = await request(app)
  .post('/devices/register')
  .set('x-app-key', 'test-key')
  .send(registrationData);

expect(response.body).not.toHaveProperty('pushToken');
expect(response.body).not.toHaveProperty('encryptedToken');
```

## Migration and Maintenance

### Database Migrations
- Use the migration script to apply schema changes
- Always backup before running migrations
- Test migrations on staging environment first

### Token Cleanup
```typescript
// ✅ Regular cleanup of expired tokens
const cleanedCount = await cleanupExpiredRegistrations();
console.log(`Cleaned up ${cleanedCount} expired registrations`);
```

### Key Rotation (Future)
- Implement gradual re-encryption with new keys
- Maintain backward compatibility during transition
- Validate all tokens can be decrypted after rotation

## Common Mistakes to Avoid

1. **Logging Sensitive Data**: Never log raw tokens, encrypted components, or detailed encryption errors
2. **Direct Database Access**: Always use the service layer abstraction
3. **Missing Authentication**: All device endpoints must require API key
4. **Skipping Validation**: Always validate encryption setup on startup
5. **Exposing Internal Structure**: API responses should never show database internal fields
6. **Hardcoded Values**: Use environment variables for all configuration
7. **Missing Error Handling**: Always handle encryption/decryption failures gracefully

## Questions or Issues?
- Check the ADR document: `docs/adr/001-push-token-encryption.md`
- Review the service layer: `server/src/deviceRegistrations.ts`
- Examine encryption utilities: `server/src/encryption.ts`
- Test with the provided API endpoints and validation functions