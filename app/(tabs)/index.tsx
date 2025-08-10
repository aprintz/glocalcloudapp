import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { Plus, Save, X, MapPin } from 'lucide-react-native';
import { LocationService } from '@/services/LocationService';
import { NotificationZone } from '@/types/notification';

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [zones, setZones] = useState<NotificationZone[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [zoneRadius, setZoneRadius] = useState('100');
  const [zoneMessage, setZoneMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    
    const initializeLocation = async () => {
      try {
        await requestLocationPermission();
        if (mounted) {
          loadZones();
        }
      } catch (error) {
        console.error('Failed to initialize location:', error);
      }
    };

    initializeLocation();

    return () => {
      mounted = false;
    };
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to use this app');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      
      // Start location tracking
      LocationService.startLocationTracking();
    } catch (error) {
      Alert.alert('Error', 'Failed to get location permission');
    }
  };

  const loadZones = () => {
    const savedZones = LocationService.getNotificationZones();
    setZones(savedZones);
  };

  const handleCreateZone = () => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    setSelectedLocation({
      latitude: location.coords.latitude + (Math.random() - 0.5) * 0.01,
      longitude: location.coords.longitude + (Math.random() - 0.5) * 0.01,
    });
    setShowZoneModal(true);
  };

  const saveZone = () => {
    if (!selectedLocation || !zoneName.trim()) {
      Alert.alert('Error', 'Please provide a zone name');
      return;
    }

    const newZone: NotificationZone = {
      id: Date.now().toString(),
      name: zoneName.trim(),
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      radius: parseInt(zoneRadius) || 100,
      message: zoneMessage.trim() || `You are near ${zoneName}`,
      isActive: true,
      createdAt: new Date(),
    };

    LocationService.addNotificationZone(newZone);
    loadZones();
    resetModal();
  };

  const resetModal = () => {
    setShowZoneModal(false);
    setSelectedLocation(null);
    setZoneName('');
    setZoneRadius('100');
    setZoneMessage('');
  };

  const toggleZone = (zoneId: string) => {
    LocationService.toggleNotificationZone(zoneId);
    loadZones();
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <MapPin size={48} color="#3B82F6" />
        <Text style={styles.loadingText}>Loading location...</Text>
        <Text style={styles.loadingSubtext}>Please ensure location permissions are granted</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>Location Map</Text>
          <Text style={styles.coordinates}>
            {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
          </Text>
        </View>

        {/* Current Location */}
        <View style={styles.locationCard}>
          <View style={styles.locationMarker}>
            <MapPin size={20} color="#3B82F6" />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>Your Location</Text>
            <Text style={styles.locationSubtitle}>Current position</Text>
          </View>
        </View>

        {/* Notification Zones */}
        {zones.map((zone) => (
          <TouchableOpacity
            key={zone.id}
            style={[
              styles.zoneCard,
              { backgroundColor: zone.isActive ? '#F0FDF4' : '#F9FAFB' }
            ]}
            onPress={() => toggleZone(zone.id)}
          >
            <View style={[
              styles.zoneMarker,
              { backgroundColor: zone.isActive ? '#10B981' : '#9CA3AF' }
            ]}>
              <MapPin size={16} color="#FFFFFF" />
            </View>
            <View style={styles.zoneInfo}>
              <Text style={styles.zoneTitle}>{zone.name}</Text>
              <Text style={styles.zoneSubtitle}>
                Radius: {zone.radius}m • {zone.isActive ? 'Active' : 'Inactive'}
              </Text>
              <Text style={styles.zoneMessage}>{zone.message}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {Platform.OS === 'web' && (
          <View style={styles.webNotice}>
            <Text style={styles.webNoticeText}>
              📱 Native map functionality is available on mobile devices
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleCreateZone}>
        <Plus size={24} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add Zone</Text>
      </TouchableOpacity>

      {/* Zone creation modal */}
      <Modal
        visible={showZoneModal}
        animationType="slide"
        presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Notification Zone</Text>
            <TouchableOpacity onPress={resetModal} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Zone Name</Text>
              <TextInput
                style={styles.textInput}
                value={zoneName}
                onChangeText={setZoneName}
                placeholder="Enter zone name"
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Radius (meters)</Text>
              <TextInput
                style={styles.textInput}
                value={zoneRadius}
                onChangeText={setZoneRadius}
                placeholder="100"
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notification Message</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={zoneMessage}
                onChangeText={setZoneMessage}
                placeholder="Enter notification message"
                multiline
                maxLength={200}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveZone}>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Zone</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  mapPlaceholder: {
    flex: 1,
    padding: 16,
  },
  mapHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  locationSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  zoneCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  zoneMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  zoneSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  zoneMessage: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
  },
  webNotice: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  webNoticeText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});