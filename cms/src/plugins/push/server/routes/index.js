module.exports = [
  {
    method: 'POST',
    path: '/devices',
    handler: 'push.registerDevice',
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/devices/:deviceId',
    handler: 'push.getDevice',
    config: {
      auth: false,
    },
  },
];