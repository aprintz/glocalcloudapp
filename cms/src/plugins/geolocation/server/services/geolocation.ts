import { factories } from '@strapi/strapi';

export default factories.createCoreService('plugin::geolocation.event', ({ strapi }) => ({
  
  async findMany(params = {}) {
    const { limit = 100, sinceHours, payload } = params;
    
    // Build the query parameters similar to the Express endpoint
    const knex = strapi.db.connection;
    let query = knex('events')
      .select('id', 'title', 'payload', 'created_at')
      .addSelect(knex.raw('ST_AsGeoJSON(geog::geometry) AS geojson'))
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (sinceHours) {
      query = query.whereRaw(`created_at >= now() - (?::int || ' hours')::interval`, [sinceHours]);
    }

    if (payload) {
      query = query.whereRaw('payload @> ?::jsonb', [payload]);
    }

    return await query;
  },

  async findByRadius(params) {
    const { lat, lon, meters, payload } = params;
    
    const knex = strapi.db.connection;
    let query = knex('events')
      .select('id', 'title', 'payload', 'created_at')
      .addSelect(knex.raw('ST_Distance(geog, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) AS meters', [lon, lat]))
      .whereRaw('ST_DWithin(geog, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)', [lon, lat, meters])
      .orderByRaw('ST_Distance(geog, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) ASC', [lon, lat])
      .limit(200);

    if (payload) {
      query = query.whereRaw('payload @> ?::jsonb', [payload]);
    }

    return await query;
  },

  async findNearest(params) {
    const { lat, lon, limit = 20, payload } = params;
    
    const knex = strapi.db.connection;
    let query = knex('events')
      .select('id', 'title', 'payload', 'created_at')
      .addSelect(knex.raw('geog <-> ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography AS dist', [lon, lat]))
      .orderByRaw('geog <-> ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography ASC', [lon, lat])
      .limit(limit);

    if (payload) {
      query = query.whereRaw('payload @> ?::jsonb', [payload]);
    }

    return await query;
  },

  async findByPolygon(params) {
    const { polygon, payload } = params;
    
    const knex = strapi.db.connection;
    let query = knex('events')
      .select('id', 'title', 'payload', 'created_at')
      .whereRaw('ST_Intersects(geog, ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)::geography)', [JSON.stringify(polygon)])
      .limit(500);

    if (payload) {
      query = query.whereRaw('payload @> ?::jsonb', [payload]);
    }

    return await query;
  },

  async findByBbox(params) {
    const { w, s, e, n, payload } = params;
    
    const knex = strapi.db.connection;
    let query = knex('events')
      .select('id', 'title', 'payload', 'created_at')
      .whereRaw('ST_Intersects(geog, ST_SetSRID(ST_MakeEnvelope(?, ?, ?, ?, 4326), 4326)::geography)', [w, s, e, n])
      .limit(1000);

    if (payload) {
      query = query.whereRaw('payload @> ?::jsonb', [payload]);
    }

    return await query;
  },

  async findOne(id) {
    const knex = strapi.db.connection;
    const result = await knex('events')
      .select('id', 'title', 'payload', 'created_at')
      .addSelect(knex.raw('ST_AsGeoJSON(geog::geometry) AS geojson'))
      .where('id', id)
      .first();

    return result;
  },

  async create(data) {
    const { title, payload = {}, lon, lat, id } = data;
    
    const knex = strapi.db.connection;
    const result = await knex('events')
      .insert({
        id: id || knex.raw('gen_random_uuid()'),
        title,
        payload: JSON.stringify(payload),
        geog: knex.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography', [lon, lat])
      })
      .returning('id');

    return { id: result[0].id };
  },

  async createBulk(items) {
    const knex = strapi.db.connection;
    
    const insertData = items.map(item => ({
      id: knex.raw('gen_random_uuid()'),
      title: item.title,
      payload: JSON.stringify(item.payload || {}),
      geog: knex.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography', [item.lon, item.lat])
    }));

    const result = await knex('events').insert(insertData);
    return { inserted: result.length };
  },

  async update(id, data) {
    const { title, payload, lon, lat } = data;
    const knex = strapi.db.connection;
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (payload !== undefined) updateData.payload = JSON.stringify(payload);
    if (lon !== undefined && lat !== undefined) {
      updateData.geog = knex.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography', [lon, lat]);
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    const result = await knex('events')
      .where('id', id)
      .update(updateData)
      .returning('id');

    if (result.length === 0) {
      throw new Error('Event not found');
    }

    return { id };
  },

  async delete(id) {
    const knex = strapi.db.connection;
    const result = await knex('events')
      .where('id', id)
      .del();

    if (result === 0) {
      throw new Error('Event not found');
    }

    return { deleted: true };
  }
}));