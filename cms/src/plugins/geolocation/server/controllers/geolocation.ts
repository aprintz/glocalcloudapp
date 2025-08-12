import { factories } from '@strapi/strapi';

export default factories.createCoreController('plugin::geolocation.event', ({ strapi }) => ({
  
  async findMany(ctx) {
    const { query } = ctx;
    
    // Validate query parameters similar to Express endpoint
    const limit = Math.min(parseInt(query.limit) || 100, 1000);
    const sinceHours = query.sinceHours ? parseInt(query.sinceHours) : undefined;
    const payload = query.payload;

    try {
      const result = await strapi
        .plugin('geolocation')
        .service('geolocation')
        .findMany({ limit, sinceHours, payload });

      ctx.body = result;
    } catch (error) {
      ctx.throw(500, error.message);
    }
  },

  async findByRadius(ctx) {
    const { query } = ctx;
    
    // Validate required parameters
    const lat = parseFloat(query.lat);
    const lon = parseFloat(query.lon);
    const meters = parseFloat(query.meters);
    const payload = query.payload;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return ctx.badRequest('Invalid latitude');
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return ctx.badRequest('Invalid longitude');
    }
    if (isNaN(meters) || meters <= 0 || meters > 100000) {
      return ctx.badRequest('Invalid meters radius');
    }

    try {
      const result = await strapi
        .plugin('geolocation')
        .service('geolocation')
        .findByRadius({ lat, lon, meters, payload });

      ctx.body = result;
    } catch (error) {
      ctx.throw(500, error.message);
    }
  },

  async findNearest(ctx) {
    const { query } = ctx;
    
    const lat = parseFloat(query.lat);
    const lon = parseFloat(query.lon);
    const limit = Math.min(parseInt(query.limit) || 20, 500);
    const payload = query.payload;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return ctx.badRequest('Invalid latitude');
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return ctx.badRequest('Invalid longitude');
    }

    try {
      const result = await strapi
        .plugin('geolocation')
        .service('geolocation')
        .findNearest({ lat, lon, limit, payload });

      ctx.body = result;
    } catch (error) {
      ctx.throw(500, error.message);
    }
  },

  async findByPolygon(ctx) {
    const { body } = ctx.request;
    
    if (!body.polygon) {
      return ctx.badRequest('Polygon is required');
    }

    try {
      const result = await strapi
        .plugin('geolocation')
        .service('geolocation')
        .findByPolygon({ polygon: body.polygon, payload: body.payload });

      ctx.body = result;
    } catch (error) {
      ctx.throw(500, error.message);
    }
  },

  async findByBbox(ctx) {
    const { query } = ctx;
    
    const w = parseFloat(query.w);
    const s = parseFloat(query.s);
    const e = parseFloat(query.e);
    const n = parseFloat(query.n);
    const payload = query.payload;

    if (isNaN(w) || w < -180 || w > 180) {
      return ctx.badRequest('Invalid west longitude');
    }
    if (isNaN(s) || s < -90 || s > 90) {
      return ctx.badRequest('Invalid south latitude');
    }
    if (isNaN(e) || e < -180 || e > 180) {
      return ctx.badRequest('Invalid east longitude');
    }
    if (isNaN(n) || n < -90 || n > 90) {
      return ctx.badRequest('Invalid north latitude');
    }

    try {
      const result = await strapi
        .plugin('geolocation')
        .service('geolocation')
        .findByBbox({ w, s, e, n, payload });

      ctx.body = result;
    } catch (error) {
      ctx.throw(500, error.message);
    }
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    
    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return ctx.badRequest('Invalid ID format');
    }

    try {
      const result = await strapi
        .plugin('geolocation')
        .service('geolocation')
        .findOne(id);

      if (!result) {
        return ctx.notFound('Event not found');
      }

      ctx.body = result;
    } catch (error) {
      ctx.throw(500, error.message);
    }
  },

  async create(ctx) {
    const { body } = ctx.request;
    
    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.length < 1 || body.title.length > 200) {
      return ctx.badRequest('Title is required and must be 1-200 characters');
    }
    
    const lon = parseFloat(body.lon);
    const lat = parseFloat(body.lat);
    
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return ctx.badRequest('Invalid latitude');
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return ctx.badRequest('Invalid longitude');
    }

    try {
      const result = await strapi
        .plugin('geolocation')
        .service('geolocation')
        .create({
          id: body.id,
          title: body.title,
          payload: body.payload,
          lon,
          lat
        });

      ctx.status = 201;
      ctx.body = result;
    } catch (error) {
      ctx.throw(500, error.message);
    }
  },

  async createBulk(ctx) {
    const { body } = ctx.request;
    
    if (!Array.isArray(body) || body.length === 0 || body.length > 1000) {
      return ctx.badRequest('Body must be an array of 1-1000 items');
    }

    // Validate each item
    for (const item of body) {
      if (!item.title || typeof item.title !== 'string' || item.title.length < 1 || item.title.length > 200) {
        return ctx.badRequest('Each item must have a title (1-200 characters)');
      }
      
      const lon = parseFloat(item.lon);
      const lat = parseFloat(item.lat);
      
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return ctx.badRequest('Each item must have valid latitude');
      }
      if (isNaN(lon) || lon < -180 || lon > 180) {
        return ctx.badRequest('Each item must have valid longitude');
      }
    }

    try {
      const result = await strapi
        .plugin('geolocation')
        .service('geolocation')
        .createBulk(body);

      ctx.status = 201;
      ctx.body = result;
    } catch (error) {
      ctx.throw(500, error.message);
    }
  },

  async update(ctx) {
    const { id } = ctx.params;
    const { body } = ctx.request;
    
    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return ctx.badRequest('Invalid ID format');
    }

    // Validate optional fields
    if (body.title !== undefined && (typeof body.title !== 'string' || body.title.length < 1 || body.title.length > 200)) {
      return ctx.badRequest('Title must be 1-200 characters');
    }

    if (body.lon !== undefined || body.lat !== undefined) {
      const lon = parseFloat(body.lon);
      const lat = parseFloat(body.lat);
      
      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) {
        return ctx.badRequest('Both lon and lat must be provided with valid values');
      }
    }

    try {
      const result = await strapi
        .plugin('geolocation')
        .service('geolocation')
        .update(id, body);

      ctx.body = result;
    } catch (error) {
      if (error.message === 'Event not found') {
        return ctx.notFound('Event not found');
      }
      if (error.message === 'No fields to update') {
        return ctx.badRequest('No fields to update');
      }
      ctx.throw(500, error.message);
    }
  },

  async delete(ctx) {
    const { id } = ctx.params;
    
    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return ctx.badRequest('Invalid ID format');
    }

    try {
      await strapi
        .plugin('geolocation')
        .service('geolocation')
        .delete(id);

      ctx.status = 204;
    } catch (error) {
      if (error.message === 'Event not found') {
        return ctx.notFound('Event not found');
      }
      ctx.throw(500, error.message);
    }
  }

}));