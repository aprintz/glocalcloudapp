import 'dotenv/config';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential, ChainedTokenCredential, ManagedIdentityCredential, AzureCliCredential } from '@azure/identity';

interface SecretsConfig {
  DATABASE_URL: string;
  APP_API_KEY: string;
  STRAPI_TOKEN?: string;
  STRAPI_BASE_URL?: string;
}

class SecretsService {
  private client: SecretClient | null = null;
  private cache: Map<string, { value: string; expires: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly useKeyVault: boolean;

  constructor() {
    const keyVaultUrl = process.env.AZURE_KEY_VAULT_URL;
    this.useKeyVault = Boolean(keyVaultUrl && process.env.NODE_ENV === 'production');
    
    if (this.useKeyVault && keyVaultUrl) {
      try {
        // Use chained credential for better compatibility across environments
        const credential = new ChainedTokenCredential(
          new ManagedIdentityCredential(),
          new AzureCliCredential()
        );
        this.client = new SecretClient(keyVaultUrl, credential);
        console.log('Azure Key Vault client initialized');
      } catch (error) {
        console.warn('Failed to initialize Azure Key Vault client:', error);
        this.useKeyVault = false;
      }
    } else {
      console.log('Using environment variables for secrets (local development)');
    }
  }

  private async getFromKeyVault(secretName: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      const secret = await this.client.getSecret(secretName);
      return secret.value || null;
    } catch (error) {
      console.warn(`Failed to retrieve secret "${secretName}" from Key Vault:`, error);
      return null;
    }
  }

  private async getCachedSecret(key: string): Promise<string | null> {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.value;
    }
    return null;
  }

  private setCachedSecret(key: string, value: string): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.CACHE_TTL_MS
    });
  }

  async getSecret(secretName: string, envVarName?: string): Promise<string> {
    // Check cache first
    const cacheKey = secretName;
    const cached = await this.getCachedSecret(cacheKey);
    if (cached) return cached;

    let value: string | null = null;

    // Try Key Vault first (production)
    if (this.useKeyVault) {
      value = await this.getFromKeyVault(secretName);
    }

    // Fallback to environment variable
    if (!value) {
      value = process.env[envVarName || secretName] || null;
    }

    if (!value) {
      throw new Error(`Secret "${secretName}" not found in Key Vault or environment variables`);
    }

    // Cache the result
    this.setCachedSecret(cacheKey, value);
    return value;
  }

  async getAllSecrets(): Promise<SecretsConfig> {
    const [
      DATABASE_URL,
      APP_API_KEY,
      STRAPI_TOKEN,
      STRAPI_BASE_URL
    ] = await Promise.all([
      this.getSecret('database-url', 'DATABASE_URL'),
      this.getSecret('app-api-key', 'APP_API_KEY'),
      this.getSecret('strapi-token', 'STRAPI_TOKEN').catch(() => ''),
      this.getSecret('strapi-base-url', 'STRAPI_BASE_URL').catch(() => process.env.STRAPI_BASE_URL || 'http://localhost:1337')
    ]);

    return {
      DATABASE_URL,
      APP_API_KEY,
      STRAPI_TOKEN: STRAPI_TOKEN || undefined,
      STRAPI_BASE_URL: STRAPI_BASE_URL || undefined
    };
  }

  // Clear cache - useful for testing or forced refresh
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const secretsService = new SecretsService();
export { SecretsConfig };