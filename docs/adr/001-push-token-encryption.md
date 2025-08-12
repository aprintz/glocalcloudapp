# ADR-001: Push Token Encryption for Azure Notification Hub Integration

## Status
Accepted

## Date
2024-01-XX

## Context
The gLocalCloudApp requires push notification functionality to deliver location-based notifications to mobile devices. Push tokens are sensitive credentials that need to be stored securely to prevent unauthorized access and potential security breaches.

### Key Requirements:
- Store push tokens for iOS, Android, and web platforms
- Support Azure Notification Hub integration
- Ensure tokens are encrypted at rest
- Enable token rotation and expiry handling
- Maintain high performance for notification delivery
- Support geographic targeting based on device location

### Security Concerns:
- Push tokens can be used to send notifications to specific devices
- Unauthorized access to tokens could lead to spam or malicious notifications
- Tokens should not be accessible through regular application queries
- Need to support key rotation without service interruption

## Decision
We will implement AES-256-GCM encryption for storing push tokens in the database with the following architecture:

### Encryption Strategy:
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Management**: 256-bit key stored in environment variable with Azure Key Vault support
- **IV Generation**: Random 96-bit (12 bytes) initialization vector per token
- **Authentication**: GCM mode provides built-in authentication with 128-bit tag
- **Additional Authenticated Data (AAD)**: Static string "push_token" for context binding

### Database Schema:
```sql
CREATE TABLE device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  user_id TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  
  -- Encrypted token components
  encrypted_token TEXT NOT NULL,    -- base64 encoded encrypted data
  token_iv TEXT NOT NULL,          -- base64 encoded IV
  token_tag TEXT NOT NULL,         -- base64 encoded auth tag
  
  -- Metadata and expiry
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Geographic and device info
  last_known_location GEOGRAPHY(Point, 4326),
  device_metadata JSONB DEFAULT '{}'
);
```

### Access Control:
1. **Safe View**: `device_registrations_safe` exposes all fields except encrypted token components
2. **Restricted Access**: Only authorized notification services can access encrypted token data
3. **Decryption Service**: Centralized decryption function with error handling and logging
4. **API Endpoints**: Device registration APIs never return raw or encrypted tokens

### Key Management:
- **Development**: Base64-encoded key in `.env` file
- **Production**: Azure Key Vault integration via environment variable
- **Rotation**: New keys can be deployed; migration script to re-encrypt with new key
- **Validation**: Startup encryption test to verify configuration

## Alternatives Considered

### 1. Database-Level Encryption (TDE/Column Encryption)
- **Pros**: Transparent to application, handles key management
- **Cons**: Azure PostgreSQL limitations, performance overhead, less granular control
- **Decision**: Rejected due to limited control over encryption parameters and key rotation

### 2. External Secrets Service (HashiCorp Vault, etc.)
- **Pros**: Centralized secret management, fine-grained access control
- **Cons**: Additional infrastructure complexity, network dependency for each token access
- **Decision**: Rejected for initial implementation; can be added later as enhancement

### 3. Application-Level Encryption with Different Algorithms
- **AES-256-CBC**: Considered but rejected due to lack of built-in authentication
- **ChaCha20-Poly1305**: Considered but AES-GCM is more widely supported and tested
- **RSA**: Rejected due to performance implications and key size requirements

### 4. Token Hashing Instead of Encryption
- **Pros**: One-way operation, simpler key management
- **Cons**: Cannot retrieve original token for push notifications
- **Decision**: Rejected as we need to decrypt tokens to send notifications

## Consequences

### Positive:
- Strong security with authenticated encryption
- Flexible key management supporting Azure Key Vault
- Performance optimized with database indexing
- Supports token rotation and expiry
- Geographic targeting capabilities
- Comprehensive access control and audit trails

### Negative:
- Additional complexity in application code
- Encryption/decryption overhead (minimal with AES-GCM)
- Key management operational burden
- Need for proper backup and recovery procedures

### Risks and Mitigations:
1. **Key Loss**: 
   - Risk: All tokens become inaccessible
   - Mitigation: Secure key backup, Azure Key Vault redundancy
2. **Performance Impact**: 
   - Risk: Encryption overhead affects response times
   - Mitigation: Use efficient AES-GCM, proper indexing, connection pooling
3. **Implementation Bugs**: 
   - Risk: Incorrect encryption/decryption leading to token loss
   - Mitigation: Comprehensive testing, startup validation, gradual rollout

## Implementation Plan

### Phase 1: Core Infrastructure ✓
- [x] Database schema and migration
- [x] Encryption utility functions with AES-256-GCM
- [x] Device registration service layer
- [x] API endpoints for device management

### Phase 2: Security and Operations
- [ ] Azure Key Vault integration
- [ ] Key rotation procedures and tooling
- [ ] Monitoring and alerting for encryption failures
- [ ] Backup and recovery procedures

### Phase 3: Enhanced Features
- [ ] Bulk token operations for large-scale notifications
- [ ] Geographic clustering for performance optimization
- [ ] Token analytics and usage tracking
- [ ] Advanced security features (rate limiting, anomaly detection)

## Monitoring and Maintenance

### Key Metrics:
- Encryption/decryption success rates
- Token registration and update rates
- Geographic distribution of devices
- Token expiry and cleanup effectiveness

### Operational Procedures:
- Daily cleanup of expired tokens
- Weekly backup verification
- Monthly key rotation (if required)
- Quarterly security audit

### Alerting:
- Encryption validation failures on startup
- High rate of decryption failures
- Unusual geographic patterns in registrations
- Token expiry approaching for large numbers of devices

## References
- [NIST SP 800-38D](https://csrc.nist.gov/publications/detail/sp/800-38d/final) - GCM Mode Specification
- [RFC 5116](https://tools.ietf.org/html/rfc5116) - Authenticated Encryption Interface
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [Azure Notification Hubs Documentation](https://docs.microsoft.com/en-us/azure/notification-hubs/)