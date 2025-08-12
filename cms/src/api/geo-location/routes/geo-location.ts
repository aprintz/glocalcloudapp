export default {
  routes: [
    {
      method: 'POST',
      path: '/geo/locations',
      handler: 'geo-location.create',
      config: { 
        policies: [],
        auth: false 
      }
    },
    {
      method: 'GET',
      path: '/geo/locations',
      handler: 'geo-location.find',
      config: { 
        policies: [],
        auth: false 
      }
    }
  ]
};