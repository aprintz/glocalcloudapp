import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Bell, MapPin, Clock, Trash2, Send } from 'lucide-react-native';
import { LocationService } from '@/services/LocationService';
import { NotificationZone, NotificationHistory } from '@/types/notification';

export default function NotificationsScreen() {
  const [zones, setZones] = useState<NotificationZone[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'zones' | 'history'>('zones');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const savedZones = LocationService.getNotificationZones();
    const notificationHistory = LocationService.getNotificationHistory();
    setZones(savedZones);
    setHistory(notificationHistory);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const deleteZone = (zoneId: string) => {
    LocationService.removeNotificationZone(zoneId);
    loadData();
  };

  const testNotification = (zone: NotificationZone) => {
    LocationService.sendTestNotification(zone);
  };

  const renderZoneItem = ({ item }: { item: NotificationZone }) => (
    <View style={[styles.card, !item.isActive && styles.inactiveCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.zoneInfo}>
          <Text style={styles.zoneName}>{item.name}</Text>
          <View style={styles.locationInfo}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.locationText}>
              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, item.isActive ? styles.activeText : styles.inactiveText]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.zoneMessage}>{item.message}</Text>
      
      <View style={styles.zoneDetails}>
        <Text style={styles.detailText}>Radius: {item.radius}m</Text>
        <Text style={styles.detailText}>
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={() => testNotification(item)}>
          <Send size={16} color="#3B82F6" />
          <Text style={styles.testButtonText}>Test</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={() => deleteZone(item.id)}>
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHistoryItem = ({ item }: { item: NotificationHistory }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Bell size={20} color="#10B981" />
        <Text style={styles.historyTitle}>{item.zoneName}</Text>
        <View style={styles.historyTime}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.historyTimeText}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </View>
      <Text style={styles.historyMessage}>{item.message}</Text>
      <Text style={styles.historyDate}>
        {new Date(item.timestamp).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'zones' && styles.activeTab]}
            onPress={() => setActiveTab('zones')}>
            <Text style={[styles.tabText, activeTab === 'zones' && styles.activeTabText]}>
              Zones ({zones.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}>
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History ({history.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'zones' ? (
        <FlatList
          data={zones}
          renderItem={renderZoneItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MapPin size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No notification zones</Text>
              <Text style={styles.emptyDescription}>
                Go to the Map tab to create your first notification zone
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Bell size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No notification history</Text>
              <Text style={styles.emptyDescription}>
                Notifications will appear here when triggered
              </Text>
            </View>
          }
        />
      )}
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  listContainer: {
    padding: 16,
  },
  card: {
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
  inactiveCard: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeText: {
    color: '#16A34A',
  },
  inactiveText: {
    color: '#6B7280',
  },
  zoneMessage: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  zoneDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  testButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  historyCard: {
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
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  historyTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTimeText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  historyMessage: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 18,
  },
  historyDate: {
    fontSize: 12,
    color: '#9CA3AF',
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
});