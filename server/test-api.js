#!/usr/bin/env node

/**
 * API test script for device registration endpoints
 * Run with: npm run test:api
 * 
 * Prerequisites: 
 * 1. Database must be running and migrated
 * 2. PUSH_TOKEN_ENCRYPTION_KEY must be set
 * 3. APP_API_KEY must be set
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:4000';
const API_KEY = process.env.APP_API_KEY || 'test-api-key';

console.log('🔗 Testing Device Registration API');
console.log('==================================');
console.log(`API Base: ${API_BASE}`);

let testDeviceId = `test-device-${Date.now()}`;
let testUserId = `test-user-${Date.now()}`;

async function apiRequest(method, path, body = null) {
  const url = `${API_BASE}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-app-key': API_KEY
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`\n${method} ${path}`);
  if (body) {
    console.log('Body:', JSON.stringify(body, null, 2));
  }
  
  const response = await fetch(url, options);
  const data = await response.text();
  
  console.log(`Status: ${response.status}`);
  console.log('Response:', data);
  
  if (response.headers.get('content-type')?.includes('application/json')) {
    return JSON.parse(data);
  }
  
  return data;
}

async function runTests() {
  try {
    // Test 1: Health check
    console.log('\n1. Testing health endpoint...');
    const health = await apiRequest('GET', '/health');
    if (health.ok) {
      console.log('✅ Health check passed');
    } else {
      throw new Error('Health check failed');
    }
    
    // Test 2: Register device
    console.log('\n2. Testing device registration...');
    const registrationData = {
      deviceId: testDeviceId,
      userId: testUserId,
      platform: 'ios',
      pushToken: 'test_push_token_' + Date.now(),
      appVersion: '1.0.0',
      deviceMetadata: {
        timezone: 'UTC',
        language: 'en'
      },
      latitude: 37.7749,
      longitude: -122.4194
    };
    
    const registration = await apiRequest('POST', '/devices/register', registrationData);
    
    if (registration.deviceId === testDeviceId) {
      console.log('✅ Device registration passed');
      
      // Verify token is not exposed
      if (registration.pushToken || registration.encryptedToken) {
        throw new Error('Push token exposed in response');
      }
      console.log('✅ Token security check passed');
    } else {
      throw new Error('Device registration failed');
    }
    
    // Test 3: Get device
    console.log('\n3. Testing get device...');
    const device = await apiRequest('GET', `/devices/${testDeviceId}`);
    
    if (device.deviceId === testDeviceId && device.userId === testUserId) {
      console.log('✅ Get device passed');
    } else {
      throw new Error('Get device failed');
    }
    
    // Test 4: Update device
    console.log('\n4. Testing device update...');
    const updateData = {
      pushToken: 'updated_push_token_' + Date.now(),
      appVersion: '1.1.0',
      deviceMetadata: {
        timezone: 'UTC',
        language: 'en',
        updated: true
      }
    };
    
    const updated = await apiRequest('PATCH', `/devices/${testDeviceId}`, updateData);
    
    if (updated.appVersion === '1.1.0') {
      console.log('✅ Device update passed');
    } else {
      throw new Error('Device update failed');
    }
    
    // Test 5: Get user devices
    console.log('\n5. Testing get user devices...');
    const userDevices = await apiRequest('GET', `/users/${testUserId}/devices`);
    
    if (Array.isArray(userDevices) && userDevices.length > 0) {
      console.log('✅ Get user devices passed');
    } else {
      throw new Error('Get user devices failed');
    }
    
    // Test 6: Register second device for same user
    console.log('\n6. Testing multiple devices for user...');
    const secondDevice = {
      deviceId: testDeviceId + '_2',
      userId: testUserId,
      platform: 'android',
      pushToken: 'test_push_token_android_' + Date.now()
    };
    
    await apiRequest('POST', '/devices/register', secondDevice);
    const userDevicesAfter = await apiRequest('GET', `/users/${testUserId}/devices`);
    
    if (userDevicesAfter.length >= 2) {
      console.log('✅ Multiple devices test passed');
    } else {
      throw new Error('Multiple devices test failed');
    }
    
    // Test 7: Cleanup expired registrations
    console.log('\n7. Testing cleanup...');
    const cleanup = await apiRequest('POST', '/devices/cleanup');
    
    if (typeof cleanup.cleanedUp === 'number') {
      console.log('✅ Cleanup test passed');
    } else {
      throw new Error('Cleanup test failed');
    }
    
    // Test 8: Deactivate device
    console.log('\n8. Testing device deactivation...');
    await apiRequest('DELETE', `/devices/${testDeviceId}`);
    
    const deactivatedDevice = await apiRequest('GET', `/devices/${testDeviceId}`);
    if (deactivatedDevice.error || deactivatedDevice.isActive === false) {
      console.log('✅ Device deactivation passed');
    } else {
      console.log('⚠️  Device deactivation may have issues (device still appears active)');
    }
    
    // Test 9: Authorization test
    console.log('\n9. Testing authorization...');
    try {
      const response = await fetch(`${API_BASE}/devices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No API key
        },
        body: JSON.stringify(registrationData)
      });
      
      if (response.status === 401) {
        console.log('✅ Authorization test passed');
      } else {
        throw new Error('Authorization test failed - should have returned 401');
      }
    } catch (error) {
      throw new Error(`Authorization test failed: ${error.message}`);
    }
    
    console.log('\n🎉 All API tests passed!');
    
  } catch (error) {
    console.error('\n❌ API test failed:', error.message);
    process.exit(1);
  }
}

// Check if server is likely running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('⚠️  Server not running or not accessible at', API_BASE);
    console.log('Please start the server first with: npm run dev');
    console.log('And ensure the database is migrated with: npm run migrate');
    process.exit(1);
  }
  
  await runTests();
}

main().catch(console.error);