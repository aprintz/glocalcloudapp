# Security Policy

## Overview

This document outlines the security practices and policies for the GlocalCloudApp project, including secret management, database security, and environment configuration guidelines.

## Secret Management

### Azure Key Vault Integration

The application uses Azure Key Vault for storing and retrieving sensitive configuration values in production environments.

#### Key Vault Configuration

1. **Environment Variable**: Set `AZURE_KEY_VAULT_URL` to your Key Vault URL (e.g., `https://your-keyvault-name.vault.azure.net/`)
2. **Authentication**: Uses Azure's `ChainedTokenCredential` which tries:
   - Managed Identity (for Azure-hosted services)
   - Azure CLI credentials (for local development)

#### Secret Names in Key Vault

| Secret Name | Environment Variable Fallback | Description |
|-------------|------------------------------|-------------|
| `database-url` | `DATABASE_URL` | PostgreSQL connection string |
| `app-api-key` | `APP_API_KEY` | Shared secret for API authentication |
| `strapi-token` | `STRAPI_TOKEN` | Optional readonly token for Strapi CMS |
| `strapi-base-url` | `STRAPI_BASE_URL` | Base URL for Strapi CMS instance |

#### How It Works

- **Production**: Secrets are fetched from Azure Key Vault at runtime
- **Development**: Falls back to environment variables when Key Vault is not configured
- **Caching**: Secrets are cached for 5 minutes to reduce Key Vault API calls
- **Error Handling**: Graceful fallback to environment variables if Key Vault access fails

### Environment Variables

Environment variables should only be used for:
- Local development configurations
- Non-sensitive configuration values
- Fallback values when Key Vault is unavailable

**Never commit sensitive values to version control.**

### Best Practices

1. **Rotate secrets regularly** - Especially API keys and database passwords
2. **Use least privilege access** - Grant only necessary permissions to service principals
3. **Monitor secret access** - Enable logging for Key Vault access patterns
4. **Secure local environments** - Use `.env` files (git-ignored) for local development

## Database Security

### Database User Permissions

Create dedicated database users with restricted permissions for different services:

#### Strapi CMS Database User

For the Strapi CMS service, create a dedicated database user with limited permissions:

```sql
-- Create dedicated user for Strapi
CREATE USER strapi_service WITH PASSWORD 'secure-random-password';

-- Create dedicated schema for CMS
CREATE SCHEMA IF NOT EXISTS cms;

-- Grant schema usage and creation permissions
GRANT USAGE ON SCHEMA cms TO strapi_service;
GRANT CREATE ON SCHEMA cms TO strapi_service;

-- Grant table permissions (for tables created by Strapi)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cms TO strapi_service;
GRANT SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA cms TO strapi_service;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA cms 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO strapi_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA cms 
  GRANT SELECT, UPDATE ON SEQUENCES TO strapi_service;

-- Revoke unnecessary permissions
REVOKE CREATE ON SCHEMA public FROM strapi_service;
REVOKE ALL ON DATABASE your_database FROM strapi_service;
```

#### API Server Database User

For the main API server, create a user with permissions only for the specific tables it needs:

```sql
-- Create dedicated user for API server
CREATE USER api_service WITH PASSWORD 'another-secure-random-password';

-- Grant usage on public schema (for PostGIS and events table)
GRANT USAGE ON SCHEMA public TO api_service;

-- Grant table-specific permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO api_service;
GRANT SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO api_service;

-- Grant PostGIS usage (for spatial queries)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO api_service;
```

### Connection Security

1. **Use SSL/TLS** - Set `DATABASE_SSL=require` for production
2. **Connection pooling** - Limit concurrent connections appropriately
3. **Network isolation** - Use private endpoints and VNets in Azure
4. **Regular updates** - Keep PostgreSQL and PostGIS versions updated

## API Security

### Authentication

The API uses a shared secret (`APP_API_KEY`) for authentication:

1. **Header-based**: Send as `x-app-key` header
2. **Bearer token**: Send as `Authorization: Bearer <token>` header
3. **Secure generation**: Use cryptographically strong random values (minimum 32 characters)

### Rate Limiting

Consider implementing rate limiting for production deployments:
- Per-IP rate limits
- Per-API-key rate limits
- Burst protection

## Environment Configuration

### Development Environment

```bash
# Copy example files
cp .env.example .env
cp server/.env.example server/.env
cp cms/.env.example cms/.env

# Generate secure values
# APP_API_KEY: Use a password manager or: openssl rand -hex 32
# Database passwords: Use strong, unique passwords
# JWT secrets: Use strong, unique secrets
```

### Production Environment

1. **Use Azure Key Vault** for all sensitive values
2. **Set AZURE_KEY_VAULT_URL** environment variable
3. **Configure Managed Identity** for Key Vault access
4. **Use Azure Database for PostgreSQL** with SSL enforcement
5. **Enable logging and monitoring**

## Incident Response

### Security Incident Checklist

1. **Immediate Actions**:
   - Rotate compromised secrets immediately
   - Review access logs for unauthorized access
   - Document the incident timeline

2. **Investigation**:
   - Identify scope of compromise
   - Check for data exfiltration
   - Review system logs

3. **Recovery**:
   - Update all affected secrets
   - Apply security patches if applicable
   - Update access policies

4. **Prevention**:
   - Review and update security practices
   - Conduct security training
   - Implement additional monitoring

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **DO NOT** open a public issue
2. Email security concerns to the maintainers
3. Include detailed steps to reproduce
4. Allow reasonable time for response before disclosure

## Compliance and Auditing

### Regular Security Reviews

- Monthly review of Key Vault access logs
- Quarterly review of database user permissions
- Annual security assessment of the entire system

### Logging and Monitoring

Enable the following logs:
- Azure Key Vault access logs
- Database connection and query logs
- API access logs with authentication attempts
- Failed authentication alerts

---

**Last Updated**: December 2024
**Next Review**: March 2025