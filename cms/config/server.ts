import { createEnhancedEnv, initializeSecrets } from '../src/env-enhancer';

export default ({ env }) => {
  // Initialize secrets loading (fire and forget for now)
  initializeSecrets();
  
  // Create enhanced env function
  const enhancedEnv = createEnhancedEnv(env);
  
  return {
    host: enhancedEnv('HOST', '0.0.0.0'),
    port: enhancedEnv.int('PORT', 1337),
    app: {
      keys: enhancedEnv.array('APP_KEYS'),
    },
  };
};
