import 'dotenv/config';
import type { ExpoConfig } from '@expo/config';

// Dynamically configure the Expo app, injecting secrets from environment variables
// Never commit the real API key; place it in .env (ignored by git) using GOOGLE_MAPS_API_KEY
// See .env.example for the expected variable name.

export default (): ExpoConfig => ({
  name: 'bolt-expo-nativewind',
  slug: 'bolt-expo-nativewind',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'myapp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.aprintz.glocalcloudapp',
  },
  android: {
    package: 'com.aprintz.glocalcloudapp',
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY || ''
      }
    }
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png'
  },
  plugins: ['expo-router', 'expo-font', 'expo-web-browser', 'expo-maps'],
  experiments: {
    typedRoutes: true
  }
});
