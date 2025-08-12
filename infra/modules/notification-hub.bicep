// Notification Hub module
@description('The location for the Notification Hub')
param location string

@description('The name of the Notification Hub namespace')
param namespaceName string

@description('The name of the Notification Hub')
param notificationHubName string

@description('The SKU of the Notification Hub namespace')
param skuName string = 'Basic'

// Notification Hub Namespace
resource notificationHubNamespace 'Microsoft.NotificationHubs/namespaces@2023-09-01' = {
  name: namespaceName
  location: location
  sku: {
    name: skuName
  }
  properties: {
    namespaceType: 'NotificationHub'
  }
}

// Notification Hub
resource notificationHub 'Microsoft.NotificationHubs/namespaces/notificationHubs@2023-09-01' = {
  parent: notificationHubNamespace
  name: notificationHubName
  properties: {
    authorizationRules: [
      {
        name: 'DefaultListenSharedAccessSignature'
        properties: {
          rights: [
            'Listen'
          ]
        }
      }
      {
        name: 'DefaultFullSharedAccessSignature'
        properties: {
          rights: [
            'Listen'
            'Manage'
            'Send'
          ]
        }
      }
    ]
  }
}

// Authorization rule for sending notifications
resource sendAuthRule 'Microsoft.NotificationHubs/namespaces/notificationHubs/authorizationRules@2023-09-01' = {
  parent: notificationHub
  name: 'SendRule'
  properties: {
    rights: [
      'Send'
    ]
  }
}

// Authorization rule for full access
resource fullAuthRule 'Microsoft.NotificationHubs/namespaces/notificationHubs/authorizationRules@2023-09-01' = {
  parent: notificationHub
  name: 'FullAccessRule'
  properties: {
    rights: [
      'Listen'
      'Manage'
      'Send'
    ]
  }
}

// Outputs
@description('The resource ID of the Notification Hub')
output notificationHubId string = notificationHub.id

@description('The name of the Notification Hub')
output notificationHubName string = notificationHub.name

@description('The namespace name')
output namespaceName string = notificationHubNamespace.name

@description('The connection string for sending notifications')
output connectionString string = fullAuthRule.listKeys().primaryConnectionString

@description('The endpoint for the Notification Hub')
output endpoint string = 'https://${notificationHubNamespace.properties.serviceBusEndpoint}'