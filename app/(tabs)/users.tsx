import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { User, MapPin, Clock, Bell } from 'lucide-react-native';
import { LocationService } from '@/services/LocationService';
import { UserLocation } from '@/types/notification';

export default function UsersScreen() {
  const [users, setUsers] = useState<UserLocation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
    // Simulate real-time updates
    const interval = setInterval(loadUsers, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadUsers = () => {
    const currentUsers = LocationService.getActiveUsers();
    setUsers(currentUsers);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadUsers();
    setRefreshing(false);
  };

  const sendNotificationToUser = (user: UserLocation) => {
    Alert.alert(
      'Send Notification',
      `Send a notification to ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send', 
          onPress: () => {
            LocationService.sendNotificationToUser(user.id, 'Hello from the app!');
            Alert.alert('Success', 'Notification sent successfully');
          }
        },
      ]
    );
  };

  const getDistanceColor = (distance: number) => {
    if (distance < 100) return '#10B981'; // Green - very close
    if (distance < 500) return '#F59E0B'; // Orange - moderate distance
    return '#EF4444'; // Red - far away
  };

  const renderUserItem = ({ item }: { item: UserLocation }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <User size={24} color="#FFFFFF" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.name}</Text>
            <View style={styles.locationInfo}>
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.locationText}>
                {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: item.isOnline ? '#10B981' : '#EF4444' }]} />
      </View>

      <View style={styles.userStats}>
        <View style={styles.statItem}>
          <Clock size={16} color="#6B7280" />
          <Text style={styles.statText}>
            Last seen: {new Date(item.lastSeen).toLocaleTimeString()}
          </Text>
        </View>
        <View style={styles.statItem}>
          <MapPin size={16} color={getDistanceColor(item.distanceFromZone || 0)} />
          <Text style={[styles.statText, { color: getDistanceColor(item.distanceFromZone || 0) }]}>
            {item.distanceFromZone ? `${Math.round(item.distanceFromZone)}m from nearest zone` : 'No active zones'}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.notifyButton}
        onPress={() => sendNotificationToUser(item)}>
        <Bell size={16} color="#3B82F6" />
        <Text style={styles.notifyButtonText}>Send Notification</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Users</Text>
        <Text style={styles.headerSubtitle}>
          {users.length} user{users.length !== 1 ? 's' : ''} currently tracked
        </Text>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <User size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No active users</Text>
            <Text style={styles.emptyDescription}>
              Users will appear here when they have location tracking enabled
            </Text>
          </View>
        }
      />

      <View style={styles.statsFooter}>
        <View style={styles.footerStat}>
          <Text style={styles.footerStatNumber}>{users.filter(u => u.isOnline).length}</Text>
          <Text style={styles.footerStatLabel}>Online</Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={styles.footerStatNumber}>
            {users.filter(u => u.distanceFromZone && u.distanceFromZone < 100).length}
          </Text>
          <Text style={styles.footerStatLabel}>In Zones</Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={styles.footerStatNumber}>
            {LocationService.getNotificationZones().filter(z => z.isActive).length}
          </Text>
          <Text style={styles.footerStatLabel}>Active Zones</Text>
        </View>
      </View>
    </View>
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
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  userStats: {
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  notifyButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsFooter: {
    position: 'absolute',
    bottom: 88,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  footerStat: {
    alignItems: 'center',
  },
  footerStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  footerStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});