import geofenceEvaluation from './geofence-evaluation';

export default ({ strapi }) => ({
  'geofence-evaluation': geofenceEvaluation({ strapi }),
});