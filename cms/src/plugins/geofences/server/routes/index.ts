export default [
  {
    method: 'GET',
    path: '/geofences',
    handler: 'geofence.find',
    config: {
      policies: ['plugin::geofences.isAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/geofences/:id',
    handler: 'geofence.findOne',
    config: {
      policies: ['plugin::geofences.isAdmin'],
    },
  },
  {
    method: 'POST',
    path: '/geofences',
    handler: 'geofence.create',
    config: {
      policies: ['plugin::geofences.isAdmin'],
    },
  },
  {
    method: 'PUT',
    path: '/geofences/:id',
    handler: 'geofence.update',
    config: {
      policies: ['plugin::geofences.isAdmin'],
    },
  },
  {
    method: 'DELETE',
    path: '/geofences/:id',
    handler: 'geofence.delete',
    config: {
      policies: ['plugin::geofences.isAdmin'],
    },
  },
  {
    method: 'POST',
    path: '/geofences/validate-location',
    handler: 'geofence.validateLocation',
    config: {
      auth: false, // Allow client apps to validate location
    },
  },
  {
    method: 'GET',
    path: '/notification-templates',
    handler: 'notification-template.find',
    config: {
      policies: ['plugin::geofences.isAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/notification-templates/:id',
    handler: 'notification-template.findOne',
    config: {
      policies: ['plugin::geofences.isAdmin'],
    },
  },
  {
    method: 'POST',
    path: '/notification-templates',
    handler: 'notification-template.create',
    config: {
      policies: ['plugin::geofences.isAdmin'],
    },
  },
  {
    method: 'PUT',
    path: '/notification-templates/:id',
    handler: 'notification-template.update',
    config: {
      policies: ['plugin::geofences.isAdmin'],
    },
  },
  {
    method: 'DELETE',
    path: '/notification-templates/:id',
    handler: 'notification-template.delete',
    config: {
      policies: ['plugin::geofences.isAdmin'],
    },
  },
];