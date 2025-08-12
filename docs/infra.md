# Infrastructure Documentation

This document describes the Azure infrastructure setup for the Glocal Cloud App using Bicep templates.

## Overview

The infrastructure consists of the following Azure resources:

- **Azure Container App** - Hosts the Strapi CMS
- **Azure Database for PostgreSQL** - Database with PostGIS extension for spatial data
- **Azure Notification Hub** - Push notifications for mobile app
- **Azure Key Vault** - Secure storage for secrets and keys
- **Azure Storage Account** - Media file storage for uploads
- **Log Analytics Workspace** - Logging and monitoring

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Node.js API   │    │   Strapi CMS    │
│    (Expo)       │◄──►│    (Server)     │◄──►│ (Container App) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │    │  Storage Account│
                       │   (PostGIS)     │    │    (Media)      │
                       └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Key Vault     │    │Notification Hub │
                       │   (Secrets)     │    │ (Push Notifs)   │
                       └─────────────────┘    └─────────────────┘
```

## Prerequisites

1. **Azure CLI** - Install from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
2. **Azure subscription** with Owner or Contributor permissions
3. **Resource Group** where resources will be deployed

## Deployment Steps

### 1. Login to Azure

```bash
az login
```

### 2. Set Subscription (if needed)

```bash
az account set --subscription "your-subscription-id"
```

### 3. Create Resource Group

```bash
az group create --name "rg-glocalcloud-dev" --location "East US"
```

### 4. Deploy Infrastructure

#### Option A: Deploy with default parameters

```bash
az deployment group create \
  --resource-group "rg-glocalcloud-dev" \
  --template-file infra/main.bicep \
  --parameters @infra/main.parameters.json
```

#### Option B: Deploy with custom parameters

```bash
az deployment group create \
  --resource-group "rg-glocalcloud-dev" \
  --template-file infra/main.bicep \
  --parameters location="East US" \
               environmentSuffix="dev" \
               baseName="glocalcloud" \
               postgresAdminUsername="glocaladmin" \
               postgresAdminPassword="YourSecurePassword123!"
```

### 5. Retrieve Deployment Outputs

```bash
az deployment group show \
  --resource-group "rg-glocalcloud-dev" \
  --name "main" \
  --query properties.outputs
```

## Configuration

### Environment Variables for Strapi

After deployment, configure these environment variables in your Strapi application:

```env
NODE_ENV=production
DATABASE_CLIENT=postgres
DATABASE_URL=<postgresConnectionString from outputs>
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
DATABASE_SCHEMA=public
APP_KEYS=<generate-4-comma-separated-keys>
API_TOKEN_SALT=<generate-random-string>
ADMIN_JWT_SECRET=<generate-random-string>
JWT_SECRET=<generate-random-string>
HOST=0.0.0.0
PORT=1337
```

### Environment Variables for Node.js Server

```env
DATABASE_URL=<postgresConnectionString from outputs>
DATABASE_SSL=require
STRAPI_BASE_URL=<strapiUrl from outputs>
APP_API_KEY=<store-in-key-vault>
```

### Environment Variables for Mobile App

```env
EXPO_PUBLIC_API_BASE=<your-node-server-url>
EXPO_PUBLIC_APP_API_KEY=<same-as-server-app-api-key>
```

## PostGIS Setup

After deployment, you need to enable PostGIS extensions on the PostgreSQL database:

```sql
-- Connect to the 'glocal' database
\c glocal

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify installation
SELECT PostGIS_Version();
```

## Security Considerations

1. **Database Access**: Firewall rules are configured to allow all IPs for development. Restrict this in production.
2. **Key Vault**: Store all sensitive configuration in Key Vault and reference from applications.
3. **Container App**: Uses HTTPS by default with managed certificates.
4. **Storage Account**: Configured with CORS for web access. Review and restrict as needed.

## Monitoring and Logging

- **Log Analytics Workspace** collects logs from Container Apps
- **Application Insights** can be added for detailed application monitoring
- **Azure Monitor** provides infrastructure monitoring

## Scaling

### Container App Scaling
- Configured to scale between 1-3 instances based on HTTP load
- CPU: 1.0 cores, Memory: 2.0Gi per instance
- Modify `minReplicas`, `maxReplicas`, `cpu`, and `memory` in the Bicep template as needed

### Database Scaling
- Uses Burstable tier (Standard_B1ms) for development
- Upgrade to General Purpose or Memory Optimized for production
- Storage auto-grows when needed

## Cost Optimization

1. **Development Environment**:
   - Use Burstable PostgreSQL tier
   - Single Container App instance
   - Standard storage account

2. **Production Environment**:
   - Consider reserved instances for PostgreSQL
   - Enable auto-scaling for Container Apps
   - Use Premium storage for better performance

## Troubleshooting

### Common Issues

1. **Container App fails to start**:
   - Check logs in Azure Portal > Container Apps > Log stream
   - Verify environment variables are set correctly
   - Ensure database is accessible

2. **Database connection issues**:
   - Verify firewall rules allow your IP
   - Check connection string format
   - Ensure SSL configuration matches database settings

3. **Storage access issues**:
   - Verify CORS settings
   - Check storage account access keys
   - Ensure container permissions are correct

### Useful Commands

```bash
# Check deployment status
az deployment group show --resource-group "rg-glocalcloud-dev" --name "main"

# View Container App logs
az containerapp logs show --name "glocalcloud-dev-strapi" --resource-group "rg-glocalcloud-dev"

# Test database connectivity
az postgres flexible-server connect --name "glocalcloud-dev-psql" --admin-user "glocaladmin"

# List storage account keys
az storage account keys list --account-name "glocalclouddevst" --resource-group "rg-glocalcloud-dev"
```

## Clean Up

To remove all resources:

```bash
az group delete --name "rg-glocalcloud-dev" --yes --no-wait
```

## Next Steps

1. Configure CI/CD pipelines for automated deployments
2. Set up monitoring and alerting
3. Implement backup strategies
4. Configure custom domains and SSL certificates
5. Set up staging and production environments