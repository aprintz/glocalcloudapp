# Security Migration Guide

This guide helps you migrate from the previous environment variable-based configuration to the new Azure Key Vault-based secure configuration.

## Overview

The application now supports dual configuration modes:
- **Development**: Uses environment variables (existing behavior)
- **Production**: Uses Azure Key Vault with environment variable fallback

## Migration Steps

### 1. Local Development (No Changes Required)

Local development continues to work exactly as before. The application automatically detects that Key Vault is not configured and falls back to environment variables.

```bash
# Still works as before
cp .env.example .env
cp server/.env.example server/.env  
cp cms/.env.example cms/.env

# Fill in your local values
vim .env
vim server/.env
vim cms/.env
```

### 2. Production Migration

#### Step 1: Create Azure Key Vault

```bash
# Create resource group (if not exists)
az group create --name your-rg --location eastus

# Create Key Vault
az keyvault create --name your-keyvault-name --resource-group your-rg --location eastus

# Enable soft delete and purge protection (recommended)
az keyvault update --name your-keyvault-name --enable-purge-protection true
```

#### Step 2: Migrate Existing Secrets

Take your existing environment variables and store them in Key Vault:

```bash
# Server secrets (replace with your actual values)
az keyvault secret set --vault-name your-keyvault-name --name "database-url" --value "$DATABASE_URL"
az keyvault secret set --vault-name your-keyvault-name --name "app-api-key" --value "$APP_API_KEY"
az keyvault secret set --vault-name your-keyvault-name --name "strapi-token" --value "$STRAPI_TOKEN"
az keyvault secret set --vault-name your-keyvault-name --name "strapi-base-url" --value "$STRAPI_BASE_URL"

# CMS secrets (replace with your actual values)
az keyvault secret set --vault-name your-keyvault-name --name "cms-app-keys" --value "$APP_KEYS"
az keyvault secret set --vault-name your-keyvault-name --name "cms-api-token-salt" --value "$API_TOKEN_SALT"
az keyvault secret set --vault-name your-keyvault-name --name "cms-admin-jwt-secret" --value "$ADMIN_JWT_SECRET"
az keyvault secret set --vault-name your-keyvault-name --name "cms-jwt-secret" --value "$JWT_SECRET"
az keyvault secret set --vault-name your-keyvault-name --name "cms-database-url" --value "$CMS_DATABASE_URL"

# Optional: Store Google Maps API key
az keyvault secret set --vault-name your-keyvault-name --name "google-maps-api-key" --value "$GOOGLE_MAPS_API_KEY"
```

#### Step 3: Configure Access Permissions

For App Service with Managed Identity:

```bash
# Enable Managed Identity for your App Service
az webapp identity assign --name your-app --resource-group your-rg

# Get the Managed Identity Object ID
MANAGED_IDENTITY_ID=$(az webapp identity show --name your-app --resource-group your-rg --query principalId -o tsv)

# Grant access to Key Vault
az keyvault set-policy --name your-keyvault-name --object-id $MANAGED_IDENTITY_ID --secret-permissions get list
```

For local development/testing with Azure CLI:

```bash
# Login with Azure CLI
az login

# Grant your user account access (for testing)
YOUR_USER_ID=$(az ad signed-in-user show --query id -o tsv)
az keyvault set-policy --name your-keyvault-name --object-id $YOUR_USER_ID --secret-permissions get list
```

#### Step 4: Update Application Configuration

Set the Key Vault URL in your production environment:

```bash
# For App Service
az webapp config appsettings set --name your-app --resource-group your-rg \
  --settings AZURE_KEY_VAULT_URL=https://your-keyvault-name.vault.azure.net/

# For Container Apps or other services, set the environment variable:
# AZURE_KEY_VAULT_URL=https://your-keyvault-name.vault.azure.net/
```

#### Step 5: Remove Environment Variables (Optional)

Once Key Vault is working, you can remove the sensitive environment variables:

```bash
# Remove sensitive environment variables from App Service
az webapp config appsettings delete --name your-app --resource-group your-rg \
  --setting-names DATABASE_URL APP_API_KEY STRAPI_TOKEN APP_KEYS API_TOKEN_SALT ADMIN_JWT_SECRET JWT_SECRET
```

**Important**: Keep non-sensitive configuration like `DATABASE_SSL`, `PORT`, `NODE_ENV`, etc.

### 3. Database Security Migration

#### Current State Assessment

Check your current database users and permissions:

```sql
-- Check current database users
SELECT usename, usesuper, usecreatedb, usebypassrls 
FROM pg_user 
WHERE usename IN ('strapi', 'api_service', 'strapi_service');

-- Check current permissions
SELECT grantee, table_schema, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE grantee IN ('strapi', 'api_service', 'strapi_service');
```

#### Create Restricted Users

Replace overprivileged users with restricted ones:

```sql
-- 1. Create restricted Strapi user
CREATE USER strapi_service WITH PASSWORD 'secure-random-password';
CREATE SCHEMA IF NOT EXISTS cms;
GRANT USAGE ON SCHEMA cms TO strapi_service;
GRANT CREATE ON SCHEMA cms TO strapi_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cms TO strapi_service;
GRANT SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA cms TO strapi_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA cms GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO strapi_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA cms GRANT SELECT, UPDATE ON SEQUENCES TO strapi_service;

-- 2. Create restricted API user  
CREATE USER api_service WITH PASSWORD 'another-secure-random-password';
GRANT USAGE ON SCHEMA public TO api_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO api_service;
GRANT SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO api_service;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO api_service; -- For PostGIS

-- 3. Update connection strings in Key Vault
az keyvault secret set --vault-name your-keyvault-name --name "database-url" \
  --value "postgres://api_service:new-password@your-server:5432/your-db"
az keyvault secret set --vault-name your-keyvault-name --name "cms-database-url" \
  --value "postgres://strapi_service:new-password@your-server:5432/your-db"
```

### 4. Testing the Migration

#### Test Key Vault Access

```bash
# Test Key Vault access locally (requires Azure CLI login)
az keyvault secret show --vault-name your-keyvault-name --name "app-api-key" --query value -o tsv
```

#### Test Application Startup

1. **Local Development**: Should work as before using environment variables
2. **Production**: Should automatically detect and use Key Vault

Check the application logs for these messages:
- `Azure Key Vault client initialized` (production)
- `Using environment variables for secrets (local development)` (local)

#### Validate Secret Retrieval

The application logs should show successful secret retrieval:
- No errors about missing secrets
- Successful database connections
- Successful authentication

### 5. Rollback Plan

If issues occur, you can quickly rollback:

#### Option 1: Disable Key Vault (Keep both)

```bash
# Remove Key Vault URL to fallback to environment variables
az webapp config appsettings delete --name your-app --resource-group your-rg --setting-names AZURE_KEY_VAULT_URL
```

#### Option 2: Full Rollback

```bash
# Restore all environment variables
az webapp config appsettings set --name your-app --resource-group your-rg \
  --settings \
  DATABASE_URL="$OLD_DATABASE_URL" \
  APP_API_KEY="$OLD_APP_API_KEY" \
  STRAPI_TOKEN="$OLD_STRAPI_TOKEN" \
  APP_KEYS="$OLD_APP_KEYS" \
  API_TOKEN_SALT="$OLD_API_TOKEN_SALT" \
  ADMIN_JWT_SECRET="$OLD_ADMIN_JWT_SECRET" \
  JWT_SECRET="$OLD_JWT_SECRET"
```

## Monitoring and Maintenance

### 1. Key Vault Monitoring

Enable logging for Key Vault access:

```bash
# Enable diagnostic settings
az monitor diagnostic-settings create --name "KeyVaultLogs" \
  --resource $(az keyvault show --name your-keyvault-name --query id -o tsv) \
  --logs '[{"category":"AuditEvent","enabled":true}]' \
  --workspace $(az monitor log-analytics workspace show --name your-workspace --resource-group your-rg --query id -o tsv)
```

### 2. Secret Rotation

Set up regular secret rotation:

```bash
# Rotate API key (example)
NEW_API_KEY=$(openssl rand -hex 32)
az keyvault secret set --vault-name your-keyvault-name --name "app-api-key" --value "$NEW_API_KEY"

# Application will pick up new secret within 5 minutes (cache TTL)
```

### 3. Health Checks

Monitor these metrics:
- Key Vault access success/failure rates
- Application startup times
- Database connection success rates
- Authentication failure rates

## Troubleshooting

### Common Issues

1. **"Secret not found" errors**
   - Check secret names match exactly (case-sensitive)
   - Verify Key Vault permissions
   - Check AZURE_KEY_VAULT_URL is set correctly

2. **Authentication failures**
   - Verify Managed Identity is enabled
   - Check Key Vault access policies
   - Ensure Azure CLI is logged in (for local testing)

3. **Slow startup times**
   - Normal for first startup (Key Vault initialization)
   - Subsequent starts should be faster due to caching

4. **Cache issues**
   - Secrets cached for 5 minutes
   - Restart application to force immediate refresh
   - Check logs for cache hit/miss information

### Getting Help

1. Check application logs for detailed error messages
2. Review Azure Key Vault access logs
3. Refer to [SECURITY.md](SECURITY.md) for detailed policies
4. Test locally with Azure CLI to isolate issues

---

This migration can be performed gradually - the application supports both modes simultaneously, allowing for safe testing and rollback if needed.