import type { Core } from '@strapi/strapi';

// Ensures tenant filter is always present for public read requests
export default (config: any, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    // Only enforce on GET list/one for api::page.page
    if (ctx.method === 'GET' && ctx.request.path.startsWith('/api/pages')) {
      const filters = ctx.query?.filters || {};
      const tenantFilter = filters.tenant || filters['tenant[$eq]'] || undefined;
      if (!tenantFilter) {
        ctx.status = 400;
        ctx.body = { error: 'tenant filter is required' };
        return;
      }
    }
    await next();
  };
};
