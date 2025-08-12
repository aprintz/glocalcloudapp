import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { getCmsPage } from '@/services/api';

function stripHtml(html?: string) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export default function CmsDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await getCmsPage(String(slug));
        // Strapi REST returns { data, meta }
        const data = (res as any)?.data || res;
        if (mounted) setItem(data);
      } catch (e: any) {
        if (mounted) setError(e.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [slug]);

  const a = item?.attributes || item || {};
  const title = a.title || a.slug || String(slug);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerShown: true, title }} />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <Text style={{ color: 'red', padding: 16 }}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>{title}</Text>
          <Text style={{ fontSize: 16, lineHeight: 22 }}>{stripHtml(a.content)}</Text>
        </ScrollView>
      )}
    </View>
  );
}
