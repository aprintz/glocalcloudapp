// Main Bicep template for Glocal Cloud App infrastructure
@description('The location for all resources')
param location string = resourceGroup().location

@description('Environment suffix (dev, staging, prod)')
param environmentSuffix string = 'dev'

@description('Base name for all resources')
param baseName string = 'glocalcloud'

@description('Admin username for PostgreSQL')
@secure()
param postgresAdminUsername string

@description('Admin password for PostgreSQL')
@secure()
param postgresAdminPassword string

@description('Notification Hub namespace')
param notificationHubNamespace string = '${baseName}-nh-${environmentSuffix}'

@description('Container App environment name')
param containerAppEnvironment string = '${baseName}-cae-${environmentSuffix}'

// Variables
var resourceSuffix = '${baseName}-${environmentSuffix}'

// Log Analytics Workspace (required for Container Apps)
module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'log-analytics-deployment'
  params: {
    location: location
    name: '${resourceSuffix}-law'
  }
}

// Key Vault for secrets
module keyVault 'modules/key-vault.bicep' = {
  name: 'key-vault-deployment'
  params: {
    location: location
    name: '${resourceSuffix}-kv'
    objectId: '' // Will be populated with deployment identity
  }
}

// Storage Account for media files
module storage 'modules/storage-account.bicep' = {
  name: 'storage-deployment'
  params: {
    location: location
    name: '${replace(resourceSuffix, '-', '')}st'
  }
}

// PostgreSQL Database with PostGIS
module database 'modules/postgresql.bicep' = {
  name: 'postgresql-deployment'
  params: {
    location: location
    serverName: '${resourceSuffix}-psql'
    administratorLogin: postgresAdminUsername
    administratorPassword: postgresAdminPassword
  }
}

// Notification Hub
module notificationHub 'modules/notification-hub.bicep' = {
  name: 'notification-hub-deployment'
  params: {
    location: location
    namespaceName: notificationHubNamespace
    notificationHubName: '${baseName}-hub-${environmentSuffix}'
  }
}

// Container App Environment and Strapi Container App
module containerApp 'modules/container-app.bicep' = {
  name: 'container-app-deployment'
  params: {
    location: location
    environmentName: containerAppEnvironment
    appName: '${resourceSuffix}-strapi'
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    databaseConnectionString: database.outputs.connectionString
    storageAccountName: storage.outputs.storageAccountName
    keyVaultName: keyVault.outputs.keyVaultName
  }
}

// Outputs
@description('PostgreSQL server FQDN')
output postgresServerFqdn string = database.outputs.serverFqdn

@description('PostgreSQL connection string')
output postgresConnectionString string = database.outputs.connectionString

@description('Container App URL')
output strapiUrl string = containerApp.outputs.strapiUrl

@description('Storage account name')
output storageAccountName string = storage.outputs.storageAccountName

@description('Storage account primary endpoint')
output storageAccountPrimaryEndpoint string = storage.outputs.primaryEndpoint

@description('Key Vault name')
output keyVaultName string = keyVault.outputs.keyVaultName

@description('Key Vault URI')
output keyVaultUri string = keyVault.outputs.keyVaultUri

@description('Notification Hub connection string')
output notificationHubConnectionString string = notificationHub.outputs.connectionString

@description('Log Analytics Workspace ID')
output logAnalyticsWorkspaceId string = logAnalytics.outputs.workspaceId