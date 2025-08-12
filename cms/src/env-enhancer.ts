import { cmsSecretsService } from './secrets';

// This module provides a custom environment function that integrates with Azure Key Vault
// It's designed to work with Strapi's env() function pattern

let secretsCache: any = null;
let secretsPromise: Promise<any> | null = null;

async function loadSecrets() {
  if (secretsCache) return secretsCache;
  
  if (!secretsPromise) {
    secretsPromise = cmsSecretsService.getAllSecrets().then(secrets => {
      secretsCache = secrets;
      return secrets;
    }).catch(error => {
      console.warn('CMS: Failed to load secrets from Key Vault, using environment variables:', error.message);
      return null;
    });
  }
  
  return await secretsPromise;
}

// Enhanced env function that tries Key Vault first, then falls back to environment variables
export function createEnhancedEnv(originalEnv: any) {
  const enhancedEnv = (key: string, defaultValue?: any) => {
    // For most environment variables, use the original function
    if (!['APP_KEYS', 'API_TOKEN_SALT', 'ADMIN_JWT_SECRET', 'JWT_SECRET', 'DATABASE_URL'].includes(key)) {
      return originalEnv(key, defaultValue);
    }

    // For secrets, try to use cached values from Key Vault
    if (secretsCache) {
      switch (key) {
        case 'APP_KEYS':
          return secretsCache.APP_KEYS;
        case 'API_TOKEN_SALT':
          return secretsCache.API_TOKEN_SALT;
        case 'ADMIN_JWT_SECRET':
          return secretsCache.ADMIN_JWT_SECRET;
        case 'JWT_SECRET':
          return secretsCache.JWT_SECRET;
        case 'DATABASE_URL':
          return secretsCache.DATABASE_URL || originalEnv(key, defaultValue);
      }
    }

    // Fallback to original environment function
    return originalEnv(key, defaultValue);
  };

  // Copy all methods from original env
  enhancedEnv.int = originalEnv.int;
  enhancedEnv.float = originalEnv.float;
  enhancedEnv.bool = originalEnv.bool;
  enhancedEnv.json = originalEnv.json;
  enhancedEnv.array = (key: string, defaultValue?: any) => {
    if (key === 'APP_KEYS' && secretsCache?.APP_KEYS) {
      return secretsCache.APP_KEYS;
    }
    return originalEnv.array(key, defaultValue);
  };
  enhancedEnv.date = originalEnv.date;

  return enhancedEnv;
}

// Initialize secrets loading
export async function initializeSecrets() {
  try {
    await loadSecrets();
    console.log('CMS: Secrets initialization completed');
  } catch (error) {
    console.warn('CMS: Secrets initialization failed:', error);
  }
}