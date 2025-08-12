import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BACKGROUND_LOCATION_TASK = 'background-location-task';
const LOCATION_UPDATE_TASK = 'location-update-task';

export interface LocationUpdateResponse {
  nextSuggestedUpdateSec?: number;
  success: boolean;
  message?: string;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  deviceId: string;
}

class BackgroundLocationServiceClass {
  private isBackgroundLocationStarted = false;
  private isLocationUpdateTaskRegistered = false;
  private nextUpdateInterval = 300; // Default 5 minutes

  async initialize(): Promise<void> {
    // Define the background location task
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.error('Background location task error:', error);
        return;
      }
      if (data) {
        const { locations } = data as any;
        await this.handleBackgroundLocationUpdate(locations);
      }
    });

    // Define the background fetch task for periodic updates
    TaskManager.defineTask(LOCATION_UPDATE_TASK, async () => {
      try {
        await this.sendLocationUpdateToServer();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Background fetch error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Register background fetch
    await this.registerBackgroundFetch();
  }

  async startBackgroundLocationTracking(): Promise<boolean> {
    try {
      // Check permissions
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission not granted');
        return false;
      }

      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.log('Background location permission not granted');
        return false;
      }

      // Start background location
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (!isRegistered) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.LocationAccuracy.Balanced,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 10, // 10 meters
          foregroundService: {
            notificationTitle: 'Location tracking active',
            notificationBody: 'App is tracking location for notifications',
            notificationColor: '#3B82F6',
          },
        });
      }

      this.isBackgroundLocationStarted = true;
      console.log('Background location tracking started');
      return true;
    } catch (error) {
      console.error('Error starting background location tracking:', error);
      return false;
    }
  }

  async stopBackgroundLocationTracking(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
      this.isBackgroundLocationStarted = false;
      console.log('Background location tracking stopped');
    } catch (error) {
      console.error('Error stopping background location tracking:', error);
    }
  }

  async registerBackgroundFetch(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_UPDATE_TASK);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(LOCATION_UPDATE_TASK, {
          minimumInterval: this.nextUpdateInterval * 1000, // Convert to milliseconds
          stopOnTerminate: false,
          startOnBoot: true,
        });
        this.isLocationUpdateTaskRegistered = true;
        console.log('Background fetch task registered');
      }
    } catch (error) {
      console.error('Error registering background fetch:', error);
    }
  }

  async unregisterBackgroundFetch(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(LOCATION_UPDATE_TASK);
      this.isLocationUpdateTaskRegistered = false;
      console.log('Background fetch task unregistered');
    } catch (error) {
      console.error('Error unregistering background fetch:', error);
    }
  }

  private async handleBackgroundLocationUpdate(locations: Location.LocationObject[]): Promise<void> {
    if (!locations || locations.length === 0) return;

    console.log('Background location update received:', locations.length, 'locations');
    
    // Store latest location locally
    const latestLocation = locations[locations.length - 1];
    await AsyncStorage.setItem('latest_background_location', JSON.stringify({
      ...latestLocation,
      timestamp: new Date().toISOString(),
    }));

    // Optionally send to server immediately for high-priority updates
    // await this.sendLocationUpdateToServer(latestLocation);
  }

  async sendLocationUpdateToServer(location?: Location.LocationObject): Promise<LocationUpdateResponse> {
    try {
      let locationToSend = location;
      
      if (!locationToSend) {
        // Get current location
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Location permission not granted');
        }
        
        locationToSend = await Location.getCurrentPositionAsync({
          accuracy: Location.LocationAccuracy.Balanced,
        });
      }

      const deviceInfo = await this.getDeviceInfo();
      const locationUpdate: LocationUpdate = {
        latitude: locationToSend.coords.latitude,
        longitude: locationToSend.coords.longitude,
        accuracy: locationToSend.coords.accuracy || 0,
        timestamp: new Date(),
        deviceId: deviceInfo.deviceId,
      };

      const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4000';
      const APP_KEY = process.env.EXPO_PUBLIC_APP_API_KEY || '';

      const response = await fetch(`${API_BASE}/location-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(APP_KEY ? { 'x-app-key': APP_KEY } : {}),
        },
        body: JSON.stringify(locationUpdate),
      });

      if (response.ok) {
        const result: LocationUpdateResponse = await response.json();
        console.log('Location update sent successfully:', result);
        
        // Handle nextSuggestedUpdateSec
        if (result.nextSuggestedUpdateSec && result.nextSuggestedUpdateSec !== this.nextUpdateInterval) {
          this.nextUpdateInterval = result.nextSuggestedUpdateSec;
          await this.updateBackgroundFetchInterval();
          console.log('Updated background fetch interval to:', this.nextUpdateInterval, 'seconds');
        }
        
        return result;
      } else {
        const errorText = await response.text();
        console.error('Failed to send location update:', response.status, errorText);
        return {
          success: false,
          message: `Server error: ${response.status} ${errorText}`,
        };
      }
    } catch (error) {
      console.error('Error sending location update to server:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async updateBackgroundFetchInterval(): Promise<void> {
    try {
      // Unregister and re-register with new interval
      if (this.isLocationUpdateTaskRegistered) {
        await this.unregisterBackgroundFetch();
        await this.registerBackgroundFetch();
      }
    } catch (error) {
      console.error('Error updating background fetch interval:', error);
    }
  }

  private async getDeviceInfo() {
    // Get device info from storage or create default
    try {
      const stored = await AsyncStorage.getItem('device_token_info');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { deviceId: parsed.deviceId };
      }
    } catch (error) {
      console.error('Error getting device info:', error);
    }
    
    // Fallback device ID
    return { deviceId: Platform.OS + '_' + Date.now() };
  }

  async getLastKnownLocation(): Promise<Location.LocationObject | null> {
    try {
      const stored = await AsyncStorage.getItem('latest_background_location');
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('Error getting last known location:', error);
      return null;
    }
  }

  isBackgroundLocationRunning(): boolean {
    return this.isBackgroundLocationStarted;
  }

  getCurrentUpdateInterval(): number {
    return this.nextUpdateInterval;
  }

  async setUpdateInterval(seconds: number): Promise<void> {
    this.nextUpdateInterval = seconds;
    await this.updateBackgroundFetchInterval();
  }

  // Test method to trigger immediate location update
  async triggerImmediateUpdate(): Promise<LocationUpdateResponse> {
    return await this.sendLocationUpdateToServer();
  }
}

export const BackgroundLocationService = new BackgroundLocationServiceClass();