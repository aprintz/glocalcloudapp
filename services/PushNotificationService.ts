import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface DeviceTokenInfo {
  token: string;
  type: 'ios' | 'android';
  deviceId: string;
  lastRegistered: Date;
}

class PushNotificationServiceClass {
  private pushToken: string | null = null;
  private deviceInfo: DeviceTokenInfo | null = null;

  async initialize(): Promise<void> {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    // Get native push token (not Expo push token)
    try {
      const pushTokenData = await Notifications.getDevicePushTokenAsync();
      this.pushToken = pushTokenData.data;
      
      // Create device info
      this.deviceInfo = {
        token: this.pushToken,
        type: Platform.OS === 'ios' ? 'ios' : 'android',
        deviceId: Constants.sessionId || Device.modelId || 'unknown',
        lastRegistered: new Date(),
      };

      // Store locally
      await AsyncStorage.setItem('device_token_info', JSON.stringify(this.deviceInfo));
      
      // Register with server
      await this.registerTokenWithServer();
      
      console.log('Native push token:', this.pushToken);
    } catch (error) {
      console.error('Error getting native push token:', error);
    }
  }

  async registerTokenWithServer(): Promise<void> {
    if (!this.deviceInfo) {
      console.log('No device info available for registration');
      return;
    }

    try {
      const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4000';
      const APP_KEY = process.env.EXPO_PUBLIC_APP_API_KEY || '';
      
      const response = await fetch(`${API_BASE}/device-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(APP_KEY ? { 'x-app-key': APP_KEY } : {}),
        },
        body: JSON.stringify({
          token: this.deviceInfo.token,
          type: this.deviceInfo.type,
          deviceId: this.deviceInfo.deviceId,
          platform: Platform.OS,
          appVersion: Constants.expoConfig?.version || '1.0.0',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Device token registered successfully:', result);
        
        // Update last registered time
        this.deviceInfo.lastRegistered = new Date();
        await AsyncStorage.setItem('device_token_info', JSON.stringify(this.deviceInfo));
      } else {
        console.error('Failed to register device token:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error registering device token with server:', error);
    }
  }

  async getStoredDeviceInfo(): Promise<DeviceTokenInfo | null> {
    try {
      const stored = await AsyncStorage.getItem('device_token_info');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Parse date
        parsed.lastRegistered = new Date(parsed.lastRegistered);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('Error getting stored device info:', error);
      return null;
    }
  }

  async shouldReregisterToken(): Promise<boolean> {
    const stored = await this.getStoredDeviceInfo();
    if (!stored) return true;
    
    // Re-register if more than 24 hours old
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return stored.lastRegistered < dayAgo;
  }

  getPushToken(): string | null {
    return this.pushToken;
  }

  getDeviceInfo(): DeviceTokenInfo | null {
    return this.deviceInfo;
  }

  // Schedule a local notification for testing
  async scheduleTestNotification(title: string, body: string, seconds: number = 5): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'test' },
      },
      trigger: { seconds },
    });
  }

  // Listen for notification responses
  setupNotificationListeners() {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification response (user tapped notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });
  }
}

export const PushNotificationService = new PushNotificationServiceClass();