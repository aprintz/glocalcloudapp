import { createEnhancedEnv, initializeSecrets } from '../src/env-enhancer';

export default ({ env }) => {
  // Initialize secrets loading (fire and forget for now)
  initializeSecrets();
  
  // Create enhanced env function
  const enhancedEnv = createEnhancedEnv(env);
  
  return {
    auth: {
      secret: enhancedEnv('ADMIN_JWT_SECRET'),
    },
    apiToken: {
      salt: enhancedEnv('API_TOKEN_SALT'),
    },
    transfer: {
      token: {
        salt: enhancedEnv('TRANSFER_TOKEN_SALT'),
      },
    },
    secrets: {
      encryptionKey: enhancedEnv('ENCRYPTION_KEY'),
    },
    flags: {
      nps: enhancedEnv.bool('FLAG_NPS', true),
      promoteEE: enhancedEnv.bool('FLAG_PROMOTE_EE', true),
    },
  };
};
