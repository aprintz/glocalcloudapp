import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::page.page' as any, ({ strapi }) => ({
  // Override the default find method to add observability
  async find(params: any) {
    const startTime = Date.now();
    const operation = 'find_pages';
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Page service operation started',
      operation,
      params: params ? Object.keys(params) : []
    }));

    try {
      const result = await super.find(params);
      
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Page service operation completed successfully',
        operation,
        resultCount: result.results?.length || 0,
        pagination: result.pagination,
        duration
      }));
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Page service operation failed',
        operation,
        error: error.message,
        stack: error.stack,
        duration
      }));
      throw error;
    }
  },

  // Override the default findOne method
  async findOne(entityId: any, params: any) {
    const startTime = Date.now();
    const operation = 'find_one_page';
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Page service operation started',
      operation,
      entityId,
      params: params ? Object.keys(params) : []
    }));

    try {
      const result = await super.findOne(entityId, params);
      
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Page service operation completed successfully',
        operation,
        entityId,
        found: !!result,
        slug: result?.slug,
        title: result?.title,
        duration
      }));
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Page service operation failed',
        operation,
        entityId,
        error: error.message,
        stack: error.stack,
        duration
      }));
      throw error;
    }
  },

  // Override create method
  async create(params: any) {
    const startTime = Date.now();
    const operation = 'create_page';
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Page service operation started',
      operation,
      title: params.data?.title,
      slug: params.data?.slug
    }));

    try {
      const result = await super.create(params);
      
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Page service operation completed successfully',
        operation,
        entityId: result.id,
        title: result.title,
        slug: result.slug,
        duration
      }));
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Page service operation failed',
        operation,
        error: error.message,
        stack: error.stack,
        duration
      }));
      throw error;
    }
  }
}));
