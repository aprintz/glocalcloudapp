// Log Analytics Workspace module
@description('The location for the Log Analytics Workspace')
param location string

@description('The name of the Log Analytics Workspace')
param name string

@description('The SKU of the Log Analytics Workspace')
param sku string = 'PerGB2018'

@description('The retention period in days')
param retentionInDays int = 30

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: name
  location: location
  properties: {
    sku: {
      name: sku
    }
    retentionInDays: retentionInDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// Outputs
@description('The resource ID of the Log Analytics Workspace')
output workspaceId string = logAnalyticsWorkspace.id

@description('The customer ID of the Log Analytics Workspace')
output customerId string = logAnalyticsWorkspace.properties.customerId

@description('The name of the Log Analytics Workspace')
output workspaceName string = logAnalyticsWorkspace.name