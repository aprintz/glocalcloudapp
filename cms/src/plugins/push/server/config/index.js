module.exports = {
  default: {
    // Plugin configuration options
    encryptTokens: process.env.PUSH_ENCRYPT_TOKENS === 'true',
    azureNotificationHub: {
      connectionString: process.env.AZURE_NOTIFICATION_HUB_CONNECTION_STRING,
      hubName: process.env.AZURE_NOTIFICATION_HUB_NAME,
    },
    logging: {
      specId: 'F-001',
    },
  },
};