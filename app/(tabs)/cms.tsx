import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Link } from 'expo-router';
import { listCmsPages } from '@/services/api';

export default function CmsListScreen() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const res = await listCmsPages();
      const items = Array.isArray(res?.data) ? res.data : [];
      setData(items);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {error ? (
        <Text style={{ color: 'red', padding: 16 }}>{error}</Text>
      ) : null}
      <FlatList
        data={data}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const a = item.attributes || item;
          const title = a.title || a.slug || `#${item.id}`;
          const slug = a.slug;
          return (
            <Link asChild href={`/cms/${encodeURIComponent(slug)}`}>
              <Pressable style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                <Text style={{ fontSize: 16, fontWeight: '600' }}>{title}</Text>
                {a.tenant ? <Text style={{ color: '#6b7280', marginTop: 4 }}>Tenant: {a.tenant}</Text> : null}
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
  );
}
