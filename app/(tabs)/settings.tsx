import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { MapPin, Bell, Trash2, Info, Smartphone, Wifi } from 'lucide-react-native';
import { LocationService } from '@/services/LocationService';
import { PushNotificationService } from '@/services/PushNotificationService';
import { BackgroundLocationService } from '@/services/BackgroundLocationService';

export default function SettingsScreen() {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [backgroundLocationEnabled, setBackgroundLocationEnabled] = useState(false);
  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] = useState(false);
  const [pushTokenRegistered, setPushTokenRegistered] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<Location.LocationAccuracy>(Location.LocationAccuracy.Balanced);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    // Check location permission
    const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
    setLocationEnabled(locationStatus === 'granted');

    // Check background location permission
    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
    setBackgroundLocationEnabled(backgroundStatus === 'granted');

    // Check notification permission
    const { status: notificationStatus } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(notificationStatus === 'granted');

    // Check background tracking status
    setBackgroundTrackingEnabled(BackgroundLocationService.isBackgroundLocationRunning());

    // Check push token registration
    const deviceInfo = await PushNotificationService.getStoredDeviceInfo();
    setPushTokenRegistered(!!deviceInfo);
  };

  const toggleLocationPermission = async () => {
    if (locationEnabled) {
      Alert.alert(
        'Disable Location',
        'This will stop location tracking. You can re-enable it in device settings.',
        [{ text: 'OK' }]
      );
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationEnabled(true);
        LocationService.startLocationTracking();
      } else {
        Alert.alert('Permission Denied', 'Location permission is required for this app to work properly.');
      }
    }
  };

  const toggleBackgroundLocation = async () => {
    if (backgroundLocationEnabled) {
      Alert.alert(
        'Background Location',
        'Background location tracking will be disabled. You can re-enable it in device settings.',
        [{ text: 'OK' }]
      );
    } else {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status === 'granted') {
        setBackgroundLocationEnabled(true);
      } else {
        Alert.alert(
          'Permission Required',
          'Background location permission allows the app to track your location even when closed.'
        );
      }
    }
  };

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      Alert.alert(
        'Notifications',
        'Notification permissions cannot be disabled from within the app. Please go to device settings.',
        [{ text: 'OK' }]
      );
    } else {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotificationsEnabled(true);
      } else {
        Alert.alert('Permission Denied', 'Notification permission is required to receive location alerts.');
      }
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all notification zones and history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            LocationService.clearAllData();
            Alert.alert('Success', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  const toggleBackgroundTracking = async () => {
    if (backgroundTrackingEnabled) {
      await BackgroundLocationService.stopBackgroundLocationTracking();
      setBackgroundTrackingEnabled(false);
      Alert.alert('Success', 'Background location tracking stopped');
    } else {
      if (!backgroundLocationEnabled) {
        Alert.alert(
          'Permission Required', 
          'Background location permission is required first'
        );
        return;
      }
      
      const success = await BackgroundLocationService.startBackgroundLocationTracking();
      if (success) {
        setBackgroundTrackingEnabled(true);
        Alert.alert('Success', 'Background location tracking started');
      } else {
        Alert.alert('Error', 'Failed to start background location tracking');
      }
    }
  };

  const testPushNotification = async () => {
    await PushNotificationService.scheduleTestNotification(
      'Test Notification',
      'This is a test of native push notifications',
      5
    );
    Alert.alert('Test Scheduled', 'A test notification will appear in 5 seconds');
  };

  const reregisterPushToken = async () => {
    await PushNotificationService.registerTokenWithServer();
    const deviceInfo = await PushNotificationService.getStoredDeviceInfo();
    setPushTokenRegistered(!!deviceInfo);
    Alert.alert('Success', 'Push token re-registered with server');
  };

  const testLocationUpdate = async () => {
    const result = await BackgroundLocationService.triggerImmediateUpdate();
    Alert.alert(
      result.success ? 'Success' : 'Error', 
      result.message || (result.success ? 'Location update sent' : 'Failed to send location update')
    );
  };

  const showPushTokenInfo = async () => {
    const deviceInfo = await PushNotificationService.getStoredDeviceInfo();
    const token = PushNotificationService.getPushToken();
    
    Alert.alert(
      'Push Token Info',
      `Token: ${token ? token.slice(0, 20) + '...' : 'None'}\n` +
      `Device ID: ${deviceInfo?.deviceId || 'None'}\n` +
      `Type: ${deviceInfo?.type || 'None'}\n` +
      `Last Registered: ${deviceInfo?.lastRegistered ? new Date(deviceInfo.lastRegistered).toLocaleString() : 'Never'}`
    );
  };

  const showAppInfo = () => {
    Alert.alert(
      'GeoNotify App',
      'Version 1.0.0\n\nA location-based notification app that sends alerts when users enter or exit specified geographic areas.\n\nNow with native push notifications and background location tracking.\n\nBuilt with React Native and Expo.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>
          Manage your location and notification preferences
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <MapPin size={24} color="#3B82F6" />
            <View style={styles.settingText}>
              <Text style={styles.settingName}>Location Access</Text>
              <Text style={styles.settingDescription}>
                Allow access to your location for zone detection
              </Text>
            </View>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={toggleLocationPermission}
            trackColor={{ false: '#F3F4F6', true: '#3B82F6' }}
            thumbColor={locationEnabled ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <MapPin size={24} color="#F59E0B" />
            <View style={styles.settingText}>
              <Text style={styles.settingName}>Background Location</Text>
              <Text style={styles.settingDescription}>
                Track location when app is in background
              </Text>
            </View>
          </View>
          <Switch
            value={backgroundLocationEnabled}
            onValueChange={toggleBackgroundLocation}
            trackColor={{ false: '#F3F4F6', true: '#F59E0B' }}
            thumbColor={backgroundLocationEnabled ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Wifi size={24} color="#9333EA" />
            <View style={styles.settingText}>
              <Text style={styles.settingName}>Background Tracking</Text>
              <Text style={styles.settingDescription}>
                Send location updates to server in background
              </Text>
            </View>
          </View>
          <Switch
            value={backgroundTrackingEnabled}
            onValueChange={toggleBackgroundTracking}
            trackColor={{ false: '#F3F4F6', true: '#9333EA' }}
            thumbColor={backgroundTrackingEnabled ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Bell size={24} color="#10B981" />
            <View style={styles.settingText}>
              <Text style={styles.settingName}>Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive notifications when entering zones
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#F3F4F6', true: '#10B981' }}
            thumbColor={notificationsEnabled ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Accuracy</Text>
        
        <TouchableOpacity 
          style={[styles.accuracyOption, locationAccuracy === Location.LocationAccuracy.Low && styles.selectedOption]}
          onPress={() => setLocationAccuracy(Location.LocationAccuracy.Low)}>
          <Text style={styles.optionText}>Low Accuracy</Text>
          <Text style={styles.optionDescription}>Battery efficient, ~1000m accuracy</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.accuracyOption, locationAccuracy === Location.LocationAccuracy.Balanced && styles.selectedOption]}
          onPress={() => setLocationAccuracy(Location.LocationAccuracy.Balanced)}>
          <Text style={styles.optionText}>Balanced</Text>
          <Text style={styles.optionDescription}>Good balance of accuracy and battery</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.accuracyOption, locationAccuracy === Location.LocationAccuracy.High && styles.selectedOption]}
          onPress={() => setLocationAccuracy(Location.LocationAccuracy.High)}>
          <Text style={styles.optionText}>High Accuracy</Text>
          <Text style={styles.optionDescription}>Best accuracy, more battery usage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Native Push Notifications</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Smartphone size={24} color={pushTokenRegistered ? '#10B981' : '#EF4444'} />
            <View style={styles.settingText}>
              <Text style={styles.settingName}>Push Token Registration</Text>
              <Text style={styles.settingDescription}>
                {pushTokenRegistered ? 'Registered with server' : 'Not registered'}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.actionIconButton} 
            onPress={showPushTokenInfo}>
            <Info size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={testPushNotification}>
          <Bell size={20} color="#3B82F6" />
          <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>
            Test Push Notification
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={reregisterPushToken}>
          <Smartphone size={20} color="#10B981" />
          <Text style={[styles.actionButtonText, { color: '#10B981' }]}>
            Re-register Token
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={testLocationUpdate}>
          <MapPin size={20} color="#F59E0B" />
          <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>
            Send Location Update
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Privacy</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={clearAllData}>
          <Trash2 size={20} color="#EF4444" />
          <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
            Clear All Data
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={showAppInfo}>
          <Info size={20} color="#6B7280" />
          <Text style={styles.actionButtonText}>App Information</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your location data is stored locally on your device and is not shared with third parties.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  accuracyOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  selectedOption: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
  },
  actionIconButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  footer: {
    padding: 16,
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});