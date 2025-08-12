import routes from './routes';
import controllers from './controllers';

export default ({ strapi }) => ({
  routes,
  controllers: controllers({ strapi }),
});