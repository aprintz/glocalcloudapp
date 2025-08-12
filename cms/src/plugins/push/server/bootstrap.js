module.exports = ({ strapi }) => {
  console.log('🚀 Push plugin bootstrap called!');
  
  // Manual route registration for push endpoints
  strapi.server.routes([
    {
      method: 'POST',
      path: '/api/push/devices',
      handler: async (ctx) => {
        // Call our controller method
        return strapi.plugin('push').controller('push').registerDevice(ctx);
      },
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/api/push/devices/:deviceId',
      handler: async (ctx) => {
        // Call our controller method
        return strapi.plugin('push').controller('push').getDevice(ctx);
      },
      config: {
        auth: false,
      },
    },
  ]);
  
  console.log('✅ Push plugin routes registered manually');
};