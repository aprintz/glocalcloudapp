import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::page.page' as any, ({ strapi }) => ({
  // Override find method to add request-level observability
  async find(ctx: any) {
    const startTime = Date.now();
    const userId = ctx.state?.user?.id || 'anonymous';
    const operation = 'api_find_pages';
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Page controller operation started',
      operation,
      userId,
      query: ctx.query,
      method: ctx.method,
      path: ctx.path
    }));

    try {
      const result = await super.find(ctx);
      
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Page controller operation completed successfully',
        operation,
        userId,
        resultCount: result.data?.length || 0,
        meta: result.meta,
        duration
      }));
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Page controller operation failed',
        operation,
        userId,
        error: error.message,
        stack: error.stack,
        duration
      }));
      throw error;
    }
  },

  // Override findOne method
  async findOne(ctx: any) {
    const startTime = Date.now();
    const userId = ctx.state?.user?.id || 'anonymous';
    const operation = 'api_find_one_page';
    const pageId = ctx.params.id;
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Page controller operation started',
      operation,
      userId,
      pageId,
      query: ctx.query,
      method: ctx.method,
      path: ctx.path
    }));

    try {
      const result = await super.findOne(ctx);
      
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Page controller operation completed successfully',
        operation,
        userId,
        pageId,
        found: !!result.data,
        slug: result.data?.attributes?.slug,
        title: result.data?.attributes?.title,
        duration
      }));
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Page controller operation failed',
        operation,
        userId,
        pageId,
        error: error.message,
        stack: error.stack,
        duration
      }));
      throw error;
    }
  }
}));
