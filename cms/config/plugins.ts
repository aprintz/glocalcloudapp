export default () => ({
  push: {
    enabled: true,
    resolve: './src/plugins/push',
  },
  geofences: {
    enabled: true,
    resolve: './src/plugins/geofences'
  }
});
