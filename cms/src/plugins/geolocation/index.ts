import cronTasks from './server/cron-tasks';
import server from './server';

export default {
  register({ strapi }) {
    // Plugin registration logic
  },

  bootstrap({ strapi }) {
    // Start cron tasks when Strapi boots up
    cronTasks.start(strapi);
  },

  destroy({ strapi }) {
    // Cleanup when Strapi shuts down
    cronTasks.stop(strapi);
  },

  server,
};