import { Strapi } from '@strapi/strapi';
import contentTypes from './content-types';
import controllers from './controllers';
import routes from './routes';
import services from './services';
import policies from './policies';

export default {
  contentTypes,
  controllers,
  routes,
  services,
  policies,
  
  async register({ strapi }: { strapi: Strapi }) {
    // Register the plugin
    console.log('Geofences plugin registered');
  },

  async bootstrap({ strapi }: { strapi: Strapi }) {
    // Bootstrap logic
    console.log('Geofences plugin bootstrapped');
    
    // Set up cron job for geofence evaluation
    if (strapi.cron) {
      strapi.cron.add({
        'geofence-evaluation': {
          task: async () => {
            await strapi.plugin('geofences').service('geofenceEvaluation').evaluateAllGeofences();
          },
          options: {
            rule: '*/30 * * * * *', // Every 30 seconds for testing, should be configurable
          },
        },
      });
    }
  },
};