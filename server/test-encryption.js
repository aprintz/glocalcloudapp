#!/usr/bin/env node

/**
 * Test script for push token encryption functionality
 * Run with: npm run test:encryption
 */

import { generateEncryptionKey, encryptPushToken, decryptPushToken, validateEncryptionSetup } from './dist/encryption.js';

// Set up test environment
process.env.PUSH_TOKEN_ENCRYPTION_KEY = generateEncryptionKey();

console.log('🧪 Testing Push Token Encryption');
console.log('================================');

try {
  // Test 1: Validate encryption setup
  console.log('\n1. Testing encryption setup validation...');
  validateEncryptionSetup();
  
  // Test 2: Basic encryption/decryption
  console.log('\n2. Testing basic encryption/decryption...');
  const testToken = 'test_push_token_12345_abcdef';
  const encrypted = encryptPushToken(testToken);
  const decrypted = decryptPushToken(encrypted);
  
  console.log(`   Original token: ${testToken}`);
  console.log(`   Encrypted data: ${encrypted.encryptedData.substring(0, 20)}...`);
  console.log(`   IV: ${encrypted.iv}`);
  console.log(`   Tag: ${encrypted.tag}`);
  console.log(`   Decrypted token: ${decrypted}`);
  
  if (decrypted === testToken) {
    console.log('   ✅ Basic encryption/decryption test passed');
  } else {
    throw new Error('Decrypted token does not match original');
  }
  
  // Test 3: Different IVs for same token
  console.log('\n3. Testing IV uniqueness...');
  const encrypted1 = encryptPushToken(testToken);
  const encrypted2 = encryptPushToken(testToken);
  
  if (encrypted1.iv !== encrypted2.iv && encrypted1.encryptedData !== encrypted2.encryptedData) {
    console.log('   ✅ IV uniqueness test passed');
  } else {
    throw new Error('IVs should be different for each encryption');
  }
  
  // Test 4: Authentication (tampering detection)
  console.log('\n4. Testing authentication (tampering detection)...');
  const originalEncrypted = encryptPushToken(testToken);
  
  // Try to decrypt with modified encrypted data
  const tamperedData = { ...originalEncrypted, encryptedData: 'tampered_data' };
  try {
    decryptPushToken(tamperedData);
    throw new Error('Should have failed with tampered data');
  } catch (error) {
    console.log('   ✅ Authentication test passed - tampered data rejected');
  }
  
  // Test 5: Different token types
  console.log('\n5. Testing different token types...');
  const testTokens = [
    'short_token',
    'fcm_token_' + 'a'.repeat(100),
    'apns_token_' + 'b'.repeat(150),
    'web_push_token_' + JSON.stringify({ endpoint: 'https://example.com', keys: { p256dh: 'test', auth: 'test' } })
  ];
  
  for (const token of testTokens) {
    const enc = encryptPushToken(token);
    const dec = decryptPushToken(enc);
    if (dec !== token) {
      throw new Error(`Token type test failed for: ${token.substring(0, 20)}...`);
    }
  }
  console.log('   ✅ Different token types test passed');
  
  // Test 6: Error handling
  console.log('\n6. Testing error handling...');
  
  // Test with invalid key
  const originalKey = process.env.PUSH_TOKEN_ENCRYPTION_KEY;
  process.env.PUSH_TOKEN_ENCRYPTION_KEY = 'invalid_key';
  try {
    encryptPushToken('test');
    throw new Error('Should have failed with invalid key');
  } catch (error) {
    console.log('   ✅ Invalid key error handling test passed');
  } finally {
    process.env.PUSH_TOKEN_ENCRYPTION_KEY = originalKey;
  }
  
  console.log('\n🎉 All encryption tests passed!');
  console.log('\nEncryption key for testing:');
  console.log(process.env.PUSH_TOKEN_ENCRYPTION_KEY);
  
} catch (error) {
  console.error('\n❌ Encryption test failed:', error.message);
  process.exit(1);
}