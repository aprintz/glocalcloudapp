// Utility to test the new server endpoints
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4000';
const APP_KEY = process.env.EXPO_PUBLIC_APP_API_KEY || '';

const headers = {
  'Content-Type': 'application/json',
  ...(APP_KEY ? { 'x-app-key': APP_KEY } : {}),
};

export const testDeviceTokenEndpoint = async () => {
  try {
    console.log('🧪 Testing device token registration endpoint...');
    
    const testPayload = {
      token: 'test_token_123456789',
      type: 'android' as const,
      deviceId: 'test_device_001',
      platform: 'android',
      appVersion: '1.0.0',
    };
    
    const response = await fetch(`${API_BASE}/device-tokens`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Device token endpoint working:', result);
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Device token endpoint failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Device token endpoint error:', error);
    return false;
  }
};

export const testLocationUpdateEndpoint = async () => {
  try {
    console.log('🧪 Testing location update endpoint...');
    
    const testPayload = {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10.0,
      timestamp: new Date().toISOString(),
      deviceId: 'test_device_001',
    };
    
    const response = await fetch(`${API_BASE}/location-updates`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Location update endpoint working:', result);
      console.log('📋 Next suggested update interval:', result.nextSuggestedUpdateSec, 'seconds');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Location update endpoint failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Location update endpoint error:', error);
    return false;
  }
};

export const testServerHealth = async () => {
  try {
    console.log('🏥 Testing server health...');
    
    const response = await fetch(`${API_BASE}/health`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Server health:', result);
      return result.ok;
    } else {
      console.error('❌ Server health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Server health check error:', error);
    return false;
  }
};

export const runAllEndpointTests = async () => {
  console.log('🚀 Starting endpoint tests...\n');
  
  const healthOk = await testServerHealth();
  if (!healthOk) {
    console.log('❌ Server health check failed, skipping other tests');
    return false;
  }
  
  console.log(''); // spacing
  
  const deviceTokenOk = await testDeviceTokenEndpoint();
  console.log(''); // spacing
  
  const locationUpdateOk = await testLocationUpdateEndpoint();
  console.log(''); // spacing
  
  const allTestsPassed = deviceTokenOk && locationUpdateOk;
  
  if (allTestsPassed) {
    console.log('🎉 All endpoint tests passed!');
  } else {
    console.log('❌ Some endpoint tests failed');
  }
  
  return allTestsPassed;
};