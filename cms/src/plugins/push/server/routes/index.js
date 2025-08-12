module.exports = [
  {
    method: 'POST',
    path: '/devices',
    handler: 'push.registerDevice',
    config: {
      policies: [],
      middlewares: [],
      auth: false, // Allow unauthenticated requests for device registration
    },
  },
  {
    method: 'GET',
    path: '/devices/:deviceId',
    handler: 'push.getDevice',
    config: {
      policies: [],
      middlewares: [],
      auth: false, // Allow unauthenticated requests for device info retrieval
    },
  },
];