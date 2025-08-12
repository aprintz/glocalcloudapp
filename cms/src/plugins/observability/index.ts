// Strapi observability plugin
export default {
  register(/* { strapi } */) {
    // Plugin registration - could be used to register hooks
  },

  bootstrap(strapi: any) {
    // Plugin bootstrap - add observability to lifecycle hooks
    
    // Listen to content type lifecycle events
    strapi.db.lifecycles.subscribe({
      models: ['*'], // Listen to all models
      
      async beforeCreate(event: any) {
        const { model } = event;
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Content creation started',
          contentType: model.uid,
          operation: 'create'
        }));
      },

      async afterCreate(event: any) {
        const { result, model } = event;
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Content created successfully',
          contentType: model.uid,
          operation: 'create',
          documentId: result.id,
          publishedAt: result.publishedAt
        }));
      },

      async beforeUpdate(event: any) {
        const { model, params } = event;
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Content update started',
          contentType: model.uid,
          operation: 'update',
          documentId: params.where?.id
        }));
      },

      async afterUpdate(event: any) {
        const { result, model } = event;
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Content updated successfully',
          contentType: model.uid,
          operation: 'update',
          documentId: result.id,
          publishedAt: result.publishedAt
        }));
      },

      async beforeDelete(event: any) {
        const { model, params } = event;
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Content deletion started',
          contentType: model.uid,
          operation: 'delete',
          documentId: params.where?.id
        }));
      },

      async afterDelete(event: any) {
        const { result, model } = event;
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Content deleted successfully',
          contentType: model.uid,
          operation: 'delete',
          documentId: result?.id
        }));
      }
    });

    // Add request logging middleware for Strapi admin and API
    strapi.server.use(async (ctx: any, next: any) => {
      const startTime = Date.now();
      const requestId = `strapi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Extract user context
      const userId = ctx.state?.user?.id || ctx.state?.auth?.credentials?.id || 'anonymous';
      const specId = ctx.headers['x-spec-id'] || ctx.query.spec_id || undefined;
      
      // Log incoming request
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Strapi request started',
        requestId,
        userId,
        specId,
        method: ctx.method,
        path: ctx.path,
        userAgent: ctx.headers['user-agent']
      }));

      try {
        await next();
        
        const duration = Date.now() - startTime;
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Strapi request completed',
          requestId,
          userId,
          specId,
          method: ctx.method,
          path: ctx.path,
          status: ctx.status,
          duration
        }));
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Strapi request failed',
          requestId,
          userId,
          specId,
          method: ctx.method,
          path: ctx.path,
          status: ctx.status || 500,
          duration,
          error: error.message,
          stack: error.stack
        }));
        throw error;
      }
    });

    // Log Strapi startup
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Strapi observability plugin initialized',
      environment: strapi.config.environment,
      version: strapi.config.info.strapi
    }));
  },
};