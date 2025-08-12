// Container App module for Strapi CMS
@description('The location for the Container App')
param location string

@description('The name of the Container App Environment')
param environmentName string

@description('The name of the Container App')
param appName string

@description('The Log Analytics Workspace ID')
param logAnalyticsWorkspaceId string

@description('Database connection string')
@secure()
param databaseConnectionString string

@description('Storage account name')
param storageAccountName string

@description('Key Vault name')
param keyVaultName string

@description('Container image for Strapi')
param containerImage string = 'strapi/strapi:latest'

@description('Container port')
param containerPort int = 1337

@description('Number of CPU cores')
param cpu string = '1.0'

@description('Memory in Gi')
param memory string = '2.0Gi'

@description('Minimum replicas')
param minReplicas int = 1

@description('Maximum replicas')
param maxReplicas int = 3

// Container App Environment
resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: reference(logAnalyticsWorkspaceId, '2023-09-01').customerId
        sharedKey: listKeys(logAnalyticsWorkspaceId, '2023-09-01').primarySharedKey
      }
    }
  }
}

// Container App for Strapi
resource strapiContainerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: containerPort
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      secrets: [
        {
          name: 'database-url'
          value: databaseConnectionString
        }
        {
          name: 'app-keys'
          value: 'defaultKey1,defaultKey2,defaultKey3,defaultKey4'
        }
        {
          name: 'api-token-salt'
          value: 'defaultSalt'
        }
        {
          name: 'admin-jwt-secret'
          value: 'defaultAdminSecret'
        }
        {
          name: 'jwt-secret'
          value: 'defaultJwtSecret'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'strapi'
          image: containerImage
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'DATABASE_CLIENT'
              value: 'postgres'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'DATABASE_SSL'
              value: 'true'
            }
            {
              name: 'DATABASE_SSL_REJECT_UNAUTHORIZED'
              value: 'false'
            }
            {
              name: 'DATABASE_SCHEMA'
              value: 'public'
            }
            {
              name: 'APP_KEYS'
              secretRef: 'app-keys'
            }
            {
              name: 'API_TOKEN_SALT'
              secretRef: 'api-token-salt'
            }
            {
              name: 'ADMIN_JWT_SECRET'
              secretRef: 'admin-jwt-secret'
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'HOST'
              value: '0.0.0.0'
            }
            {
              name: 'PORT'
              value: string(containerPort)
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/_health'
                port: containerPort
              }
              initialDelaySeconds: 60
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/_health'
                port: containerPort
              }
              initialDelaySeconds: 30
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

// Outputs
@description('The FQDN of the Strapi Container App')
output strapiUrl string = 'https://${strapiContainerApp.properties.configuration.ingress.fqdn}'

@description('The resource ID of the Container App')
output containerAppId string = strapiContainerApp.id

@description('The name of the Container App')
output containerAppName string = strapiContainerApp.name

@description('The resource ID of the Container App Environment')
output environmentId string = containerAppEnvironment.id