import crypto from 'crypto';

/**
 * Encryption utilities for securely storing push tokens using AES-256-GCM
 * 
 * This module provides functions to encrypt and decrypt push tokens using AES-256-GCM,
 * which provides both confidentiality and authenticity. The encryption key should be
 * stored securely in environment variables or Azure Key Vault.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommends 96-bit (12 bytes) IV
const TAG_LENGTH = 16; // GCM produces 128-bit (16 bytes) authentication tag

/**
 * Get the encryption key from environment variables
 * The key should be 32 bytes (256 bits) and base64 encoded
 */
function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.PUSH_TOKEN_ENCRYPTION_KEY;
  
  if (!keyBase64) {
    throw new Error('PUSH_TOKEN_ENCRYPTION_KEY environment variable is required');
  }
  
  try {
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (256 bits)');
    }
    return key;
  } catch (error) {
    throw new Error('Invalid PUSH_TOKEN_ENCRYPTION_KEY format. Must be base64 encoded 32-byte key');
  }
}

/**
 * Generate a new encryption key (for setup/rotation purposes)
 * Returns a base64 encoded 256-bit key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Encrypted token result containing all components needed for decryption
 */
export interface EncryptedToken {
  encryptedData: string; // base64 encoded encrypted token
  iv: string; // base64 encoded initialization vector
  tag: string; // base64 encoded authentication tag
}

/**
 * Encrypt a push token using AES-256-GCM
 * 
 * @param pushToken - The raw push token to encrypt
 * @returns EncryptedToken object with encrypted data, IV, and authentication tag
 */
export function encryptPushToken(pushToken: string): EncryptedToken {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('push_token')); // Additional authenticated data
    
    let encrypted = cipher.update(pushToken, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const tag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64')
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to encrypt push token: ${errorMessage}`);
  }
}

/**
 * Decrypt a push token using AES-256-GCM
 * 
 * @param encryptedToken - The EncryptedToken object containing encrypted data, IV, and tag
 * @returns The decrypted push token
 */
export function decryptPushToken(encryptedToken: EncryptedToken): string {
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(encryptedToken.iv, 'base64');
    const tag = Buffer.from(encryptedToken.tag, 'base64');
    const encrypted = Buffer.from(encryptedToken.encryptedData, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('push_token')); // Must match the AAD used during encryption
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to decrypt push token: ${errorMessage}`);
  }
}

/**
 * Validate that the encryption configuration is properly set up
 * This should be called during application startup
 */
export function validateEncryptionSetup(): void {
  try {
    // Test that we can get the encryption key
    getEncryptionKey();
    
    // Test that encryption/decryption works
    const testToken = 'test_push_token_' + Date.now();
    const encrypted = encryptPushToken(testToken);
    const decrypted = decryptPushToken(encrypted);
    
    if (decrypted !== testToken) {
      throw new Error('Encryption test failed: decrypted value does not match original');
    }
    
    console.log('✓ Push token encryption setup validated successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('✗ Push token encryption setup validation failed:', errorMessage);
    throw error;
  }
}

/**
 * Utility function to check if a token might be encrypted
 * (basic heuristic - real tokens are usually longer and don't contain base64 padding)
 */
export function isTokenEncrypted(token: string): boolean {
  // This is a simple heuristic - encrypted tokens will be base64 encoded
  // and typically shorter than raw FCM/APNS tokens
  try {
    const decoded = Buffer.from(token, 'base64');
    // If it's valid base64 and reasonable length, it might be encrypted
    return decoded.length > 0 && decoded.length < 200;
  } catch {
    return false;
  }
}