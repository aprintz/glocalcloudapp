export default {
  routes: [
    {
      method: 'POST',
      path: '/geofence-evaluation/trigger',
      handler: 'geofence-evaluation.trigger',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET', 
      path: '/geofence-evaluation/status',
      handler: 'geofence-evaluation.status',
      config: {
        policies: [],
      },
    },
  ],
};