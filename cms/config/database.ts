import path from 'path';
import { createEnhancedEnv, initializeSecrets } from '../src/env-enhancer';

export default ({ env }) => {
  // Initialize secrets loading (fire and forget for now)
  initializeSecrets();
  
  // Create enhanced env function
  const enhancedEnv = createEnhancedEnv(env);
  
  const client = enhancedEnv('DATABASE_CLIENT', 'sqlite');

  const connections = {
    mysql: {
      connection: {
        host: enhancedEnv('DATABASE_HOST', 'localhost'),
        port: enhancedEnv.int('DATABASE_PORT', 3306),
        database: enhancedEnv('DATABASE_NAME', 'strapi'),
        user: enhancedEnv('DATABASE_USERNAME', 'strapi'),
        password: enhancedEnv('DATABASE_PASSWORD', 'strapi'),
        ssl: enhancedEnv.bool('DATABASE_SSL', false) && {
          key: enhancedEnv('DATABASE_SSL_KEY', undefined),
          cert: enhancedEnv('DATABASE_SSL_CERT', undefined),
          ca: enhancedEnv('DATABASE_SSL_CA', undefined),
          capath: enhancedEnv('DATABASE_SSL_CAPATH', undefined),
          cipher: enhancedEnv('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: enhancedEnv.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: { min: enhancedEnv.int('DATABASE_POOL_MIN', 2), max: enhancedEnv.int('DATABASE_POOL_MAX', 10) },
    },
    postgres: {
      connection: {
        connectionString: enhancedEnv('DATABASE_URL'),
        host: enhancedEnv('DATABASE_HOST', 'localhost'),
        port: enhancedEnv.int('DATABASE_PORT', 5432),
        database: enhancedEnv('DATABASE_NAME', 'strapi'),
        user: enhancedEnv('DATABASE_USERNAME', 'strapi'),
        password: enhancedEnv('DATABASE_PASSWORD', 'strapi'),
        ssl: enhancedEnv.bool('DATABASE_SSL', false) && {
          key: enhancedEnv('DATABASE_SSL_KEY', undefined),
          cert: enhancedEnv('DATABASE_SSL_CERT', undefined),
          ca: enhancedEnv('DATABASE_SSL_CA', undefined),
          capath: enhancedEnv('DATABASE_SSL_CAPATH', undefined),
          cipher: enhancedEnv('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: enhancedEnv.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
        schema: enhancedEnv('DATABASE_SCHEMA', 'public'),
      },
      pool: { min: enhancedEnv.int('DATABASE_POOL_MIN', 2), max: enhancedEnv.int('DATABASE_POOL_MAX', 10) },
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', '..', enhancedEnv('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: enhancedEnv.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
