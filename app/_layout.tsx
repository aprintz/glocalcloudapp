import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { PushNotificationService } from '@/services/PushNotificationService';
import { BackgroundLocationService } from '@/services/BackgroundLocationService';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize push notification service
        await PushNotificationService.initialize();
        PushNotificationService.setupNotificationListeners();

        // Initialize background location service
        await BackgroundLocationService.initialize();
        
        console.log('Services initialized successfully');
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    };

    initializeServices();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
