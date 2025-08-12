import * as Location from 'expo-location';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationZone, UserLocation, NotificationHistory } from '@/types/notification';
import { validateLocation } from './api';

// Web-compatible notification fallback
const showWebNotification = (title: string, body: string) => {
  if (Platform.OS === 'web' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
  } else {
    // Fallback for non-web platforms or when notifications aren't available
    console.log(`Notification: ${title} - ${body}`);
  }
};

class LocationServiceClass {
  private watchId: Location.LocationSubscription | null = null;
  private currentLocation: Location.LocationObject | null = null;
  private isTracking = false;
  private userId: string = 'default-user'; // Should be set from auth system

  setUserId(userId: string) {
    this.userId = userId;
  }

  async startLocationTracking() {
    if (this.isTracking) return;

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Configure notifications for web
      if (Platform.OS === 'web' && 'Notification' in window) {
        await Notification.requestPermission();
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.LocationAccuracy.Balanced,
          timeInterval: 10000, // 10 seconds
          distanceInterval: 10, // 10 meters
        },
        (location) => {
          this.currentLocation = location;
          this.checkGeofencesBackend(location);
          this.updateUserLocation(location);
        }
      );

      this.isTracking = true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  }

  stopLocationTracking() {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
    this.isTracking = false;
  }

  private async checkGeofencesBackend(location: Location.LocationObject) {
    try {
      // Use the new backend API for geofence validation
      const result = await validateLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        user_id: this.userId,
        tenant: 'public' // Could be dynamic based on user context
      });

      // Handle geofence hits returned from backend
      if (result.data && result.data.length > 0) {
        for (const hit of result.data) {
          console.log(`Geofence ${hit.event_type}: ${hit.geofence}`, {
            suppressed: hit.suppressed,
            hit_id: hit.hit_id
          });
          
          // Show client-side notification for immediate feedback
          if (!hit.suppressed) {
            showWebNotification(
              `Geofence ${hit.event_type}`,
              `You have ${hit.event_type}ed ${hit.geofence}`
            );
          }
        }
      }
    } catch (error) {
      console.error('Error validating location with backend:', error);
      // Fallback to local validation if backend is unavailable
      await this.checkNotificationZones(location);
    }
  }

  private async checkNotificationZones(location: Location.LocationObject) {
    const zones = this.getNotificationZones();
    
    for (const zone of zones) {
      if (!zone.isActive) continue;

      const distance = this.calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        zone.latitude,
        zone.longitude
      );

      if (distance <= zone.radius) {
        await this.triggerNotification(zone, distance);
      }
    }
  }

  private async triggerNotification(zone: NotificationZone, distance: number) {
    try {
      showWebNotification(zone.name, zone.message);

      // Save to history
      const historyItem: NotificationHistory = {
        id: Date.now().toString(),
        zoneName: zone.name,
        message: zone.message,
        timestamp: new Date(),
        distance: Math.round(distance),
      };

      this.addNotificationHistory(historyItem);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private async updateUserLocation(location: Location.LocationObject) {
    const currentUser: UserLocation = {
      id: 'current-user',
      name: 'You',
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      lastSeen: new Date(),
      isOnline: true,
      distanceFromZone: this.getDistanceToNearestZone(location),
    };

    const users = this.getActiveUsers().filter(u => u.id !== 'current-user');
    users.push(currentUser);
    
    await AsyncStorage.setItem('active_users', JSON.stringify(users));
  }

  private getDistanceToNearestZone(location: Location.LocationObject): number | undefined {
    const zones = this.getNotificationZones().filter(z => z.isActive);
    if (zones.length === 0) return undefined;

    let minDistance = Infinity;
    for (const zone of zones) {
      const distance = this.calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        zone.latitude,
        zone.longitude
      );
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance === Infinity ? undefined : minDistance;
  }

  // Zone Management
  getNotificationZones(): NotificationZone[] {
    try {
      const zones = AsyncStorage.getItem('notification_zones');
      return zones ? JSON.parse(zones as any) : [];
    } catch (error) {
      console.error('Failed to load zones:', error);
      return [];
    }
  }

  async addNotificationZone(zone: NotificationZone) {
    try {
      const zones = this.getNotificationZones();
      zones.push(zone);
      await AsyncStorage.setItem('notification_zones', JSON.stringify(zones));
    } catch (error) {
      console.error('Failed to save zone:', error);
    }
  }

  async removeNotificationZone(zoneId: string) {
    try {
      const zones = this.getNotificationZones().filter(z => z.id !== zoneId);
      await AsyncStorage.setItem('notification_zones', JSON.stringify(zones));
    } catch (error) {
      console.error('Failed to remove zone:', error);
    }
  }

  async toggleNotificationZone(zoneId: string) {
    try {
      const zones = this.getNotificationZones();
      const zone = zones.find(z => z.id === zoneId);
      if (zone) {
        zone.isActive = !zone.isActive;
        await AsyncStorage.setItem('notification_zones', JSON.stringify(zones));
      }
    } catch (error) {
      console.error('Failed to toggle zone:', error);
    }
  }

  // User Management
  getActiveUsers(): UserLocation[] {
    try {
      const users = AsyncStorage.getItem('active_users');
      const parsedUsers = users ? JSON.parse(users as any) : [];
      
      // Add some mock users for demo purposes
      if (parsedUsers.length === 0) {
        const mockUsers: UserLocation[] = [
          {
            id: 'user-1',
            name: 'Alice Johnson',
            latitude: 37.7749 + Math.random() * 0.01,
            longitude: -122.4194 + Math.random() * 0.01,
            lastSeen: new Date(Date.now() - Math.random() * 300000),
            isOnline: Math.random() > 0.3,
            distanceFromZone: Math.random() * 1000,
          },
          {
            id: 'user-2',
            name: 'Bob Smith',
            latitude: 37.7749 + Math.random() * 0.01,
            longitude: -122.4194 + Math.random() * 0.01,
            lastSeen: new Date(Date.now() - Math.random() * 600000),
            isOnline: Math.random() > 0.3,
            distanceFromZone: Math.random() * 1000,
          },
          {
            id: 'user-3',
            name: 'Carol Davis',
            latitude: 37.7749 + Math.random() * 0.01,
            longitude: -122.4194 + Math.random() * 0.01,
            lastSeen: new Date(Date.now() - Math.random() * 900000),
            isOnline: Math.random() > 0.3,
            distanceFromZone: Math.random() * 1000,
          },
        ];
        return mockUsers;
      }
      
      return parsedUsers;
    } catch (error) {
      console.error('Failed to load users:', error);
      return [];
    }
  }

  async sendNotificationToUser(userId: string, message: string) {
    // In a real app, this would send a push notification to a specific user
    console.log(`Sending notification to ${userId}: ${message}`);
    
    // For demo purposes, show a notification
    showWebNotification('Direct Message', message);
  }

  async sendTestNotification(zone: NotificationZone) {
    showWebNotification(`Test: ${zone.name}`, zone.message);

    // Add to history
    const historyItem: NotificationHistory = {
      id: Date.now().toString(),
      zoneName: `Test: ${zone.name}`,
      message: zone.message,
      timestamp: new Date(),
      distance: 0,
    };

    this.addNotificationHistory(historyItem);
  }

  // History Management
  getNotificationHistory(): NotificationHistory[] {
    try {
      const history = AsyncStorage.getItem('notification_history');
      return history ? JSON.parse(history as any) : [];
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  async addNotificationHistory(item: NotificationHistory) {
    try {
      const history = this.getNotificationHistory();
      history.unshift(item); // Add to beginning
      
      // Keep only last 100 notifications
      const trimmedHistory = history.slice(0, 100);
      
      await AsyncStorage.setItem('notification_history', JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  async clearAllData() {
    try {
      await AsyncStorage.multiRemove([
        'notification_zones',
        'notification_history',
        'active_users'
      ]);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }

  getCurrentLocation(): Location.LocationObject | null {
    return this.currentLocation;
  }

  isLocationTracking(): boolean {
    return this.isTracking;
  }
}

export const LocationService = new LocationServiceClass();