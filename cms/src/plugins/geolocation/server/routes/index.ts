export default [
  {
    method: 'GET',
    path: '/events',
    handler: 'geolocation.findMany',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/events/radius',
    handler: 'geolocation.findByRadius',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/events/nearest',
    handler: 'geolocation.findNearest',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/events/polygon',
    handler: 'geolocation.findByPolygon',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/events/bbox',
    handler: 'geolocation.findByBbox',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/events/:id',
    handler: 'geolocation.findOne',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/events',
    handler: 'geolocation.create',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/events/bulk',
    handler: 'geolocation.createBulk',
    config: {
      policies: [],
    },
  },
  {
    method: 'PATCH',
    path: '/events/:id',
    handler: 'geolocation.update',
    config: {
      policies: [],
    },
  },
  {
    method: 'DELETE',
    path: '/events/:id',
    handler: 'geolocation.delete',
    config: {
      policies: [],
    },
  },
];