import React from 'react';
import { View, Text } from 'react-native';

export default function CmsListScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 16, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', textAlign: 'center', marginBottom: 8 }}>
        Content Management Unavailable
      </Text>
      <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 }}>
        The CMS functionality has been removed as part of the Express server deprecation. 
        Content management features are no longer available in this version of the app.
      </Text>
    </View>
  );
}
