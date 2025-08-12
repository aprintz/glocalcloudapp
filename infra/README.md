# Infrastructure

This directory contains Bicep templates for deploying the Glocal Cloud App infrastructure to Azure.

## Files

- `main.bicep` - Main deployment template that orchestrates all modules
- `main.parameters.json` - Parameter file with default values
- `deploy.sh` - Deployment script for easy setup
- `modules/` - Individual Bicep modules for each Azure service

## Modules

- `log-analytics.bicep` - Log Analytics Workspace for monitoring
- `key-vault.bicep` - Azure Key Vault for secrets management
- `storage-account.bicep` - Storage Account for media files
- `postgresql.bicep` - PostgreSQL database with PostGIS extension
- `notification-hub.bicep` - Azure Notification Hub for push notifications
- `container-app.bicep` - Azure Container Apps for Strapi CMS

## Quick Start

1. Install Azure CLI
2. Login to Azure: `az login`
3. Run deployment: `./deploy.sh dev`

For detailed instructions, see [../docs/infra.md](../docs/infra.md).

## Architecture

The infrastructure creates a complete environment for:
- Strapi CMS running in Azure Container Apps
- PostgreSQL database with PostGIS for spatial data
- Storage for media uploads
- Push notifications via Notification Hub
- Secure secret management with Key Vault
- Monitoring and logging

## Environments

- **dev** - Development environment with minimal resources
- **staging** - Staging environment for testing
- **prod** - Production environment with high availability

Customize the `environmentSuffix` parameter to deploy to different environments.