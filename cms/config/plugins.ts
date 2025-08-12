export default () => ({
  'geolocation': {
    enabled: true,
    resolve: './src/plugins/geolocation'
  },
  push: {
    enabled: true,
    resolve: './src/plugins/push',
  },
  geofences: {
    enabled: true,
    resolve: './src/plugins/geofences'
  }
});
