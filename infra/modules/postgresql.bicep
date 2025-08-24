// PostgreSQL Database module with PostGIS extension
@description('The location for the PostgreSQL server')
param location string

@description('The name of the PostgreSQL server')
param serverName string

@description('Administrator login for PostgreSQL')
param administratorLogin string

@description('Administrator password for PostgreSQL')
@secure()
param administratorPassword string

@description('PostgreSQL version')
param postgresqlVersion string = '16'

@description('SKU name for the PostgreSQL server')
param skuName string = 'Standard_B1ms'

@description('Storage size in MB')
param storageSizeGB int = 32

@description('Backup retention days')
param backupRetentionDays int = 7

@description('Enable high availability')
param highAvailability bool = false

// PostgreSQL Flexible Server
resource postgresqlServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: serverName
  location: location
  sku: {
    name: skuName
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    version: postgresqlVersion
    storage: {
      storageSizeGB: storageSizeGB
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: highAvailability ? 'ZoneRedundant' : 'Disabled'
    }
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
}

// Firewall rule to allow Azure services
resource firewallRuleAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgresqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Firewall rule to allow all IPs (for development - should be restricted in production)
resource firewallRuleAll 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgresqlServer
  name: 'AllowAllIPs'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '255.255.255.255'
  }
}

// Main database for the server
resource serverDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresqlServer
  name: 'glocal'
  properties: {
    charset: 'utf8'
    collation: 'en_US.utf8'
  }
}

// Strapi CMS database
resource strapiDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresqlServer
  name: 'strapi'
  properties: {
    charset: 'utf8'
    collation: 'en_US.utf8'
  }
}

// PostGIS extension configuration
resource postgisConfiguration 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01-preview' = {
  parent: postgresqlServer
  name: 'shared_preload_libraries'
  properties: {
    value: 'postgis'
    source: 'user-override'
  }
}

// Enable the PostGIS extension on the main database
// Note: This would typically be done via SQL commands after deployment
// CREATE EXTENSION IF NOT EXISTS postgis;
// CREATE EXTENSION IF NOT EXISTS postgis_topology;

// Outputs
@description('The FQDN of the PostgreSQL server')
output serverFqdn string = postgresqlServer.properties.fullyQualifiedDomainName

@description('The connection string for the main database (without password for security)')
output connectionString string = 'postgresql://${administratorLogin}@${postgresqlServer.properties.fullyQualifiedDomainName}:5432/glocal?sslmode=require'

@description('The connection string for Strapi database (without password for security)')
output strapiConnectionString string = 'postgresql://${administratorLogin}@${postgresqlServer.properties.fullyQualifiedDomainName}:5432/strapi?sslmode=require'

@description('The resource ID of the PostgreSQL server')
output serverId string = postgresqlServer.id

@description('The name of the PostgreSQL server')
output serverName string = postgresqlServer.name