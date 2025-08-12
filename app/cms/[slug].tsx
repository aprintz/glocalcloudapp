import React from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { View, Text } from 'react-native';

export default function CmsDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerShown: true, title: 'Content Unavailable' }} />
      <View style={{ flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', textAlign: 'center', marginBottom: 8 }}>
          Content Not Available
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
          The requested content &quot;{slug}&quot; is no longer available. The CMS functionality has been removed 
          as part of the Express server deprecation.
        </Text>
      </View>
    </View>
  );
}
