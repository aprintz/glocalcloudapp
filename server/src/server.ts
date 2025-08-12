import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { pool, ping, query } from './db.js';
import { strapiGet } from './cms.js';
import { TTLCache } from './cache.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
  const ok = await ping();
  res.json({ ok });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// CMS proxy: list pages for a tenant
const cmsCache = new TTLCache<any>(Number(process.env.CMS_CACHE_TTL_MS || 15000));

// Simple app authentication using a pre-shared API key
const APP_API_KEY = process.env.APP_API_KEY || '';
function requireAppKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!APP_API_KEY) return res.status(500).json({ error: 'APP_API_KEY not configured' });
  const headerKey = req.header('x-app-key') || '';
  const bearer = req.header('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (headerKey === APP_API_KEY || bearer === APP_API_KEY) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

app.get('/cms/pages', requireAppKey, async (req, res) => {
  const cacheKey = `pages:list:all`;
  const cached = cmsCache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    const data = await strapiGet<any>('/api/pages', {
      'pagination[pageSize]': 50,
      'sort[0]': 'updatedAt:desc',
      'publicationState': 'live'
    });
    cmsCache.set(cacheKey, data);
    res.json(data);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// CMS proxy: get page by slug within tenant
app.get('/cms/pages/:slug', requireAppKey, async (req, res) => {
  const slug = req.params.slug;
  const cacheKey = `pages:slug:${slug}`;
  const cached = cmsCache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    const data = await strapiGet<any>('/api/pages', {
      'filters[slug][$eq]': slug,
      'publicationState': 'live'
    });
    const item = data?.data?.[0] ?? null;
    if (!item) return res.status(404).json({ error: 'not found' });
    cmsCache.set(cacheKey, item);
    res.json(item);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// Disambiguated fetch when slugs can repeat per-tenant
app.get('/cms/pages/:tenant/:slug', requireAppKey, async (req, res) => {
  const { tenant, slug } = req.params as { tenant: string; slug: string };
  const cacheKey = `pages:tenant-slug:${tenant}:${slug}`;
  const cached = cmsCache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    const data = await strapiGet<any>('/api/pages', {
      'filters[tenant][$eq]': tenant,
      'filters[slug][$eq]': slug,
      'publicationState': 'live'
    });
    const item = data?.data?.[0] ?? null;
    if (!item) return res.status(404).json({ error: 'not found' });
    cmsCache.set(cacheKey, item);
    res.json(item);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// List recent events: /events?limit=100&sinceHours=24
app.get('/events', async (req, res) => {
  const q = z
    .object({
      limit: z.coerce.number().int().positive().max(1000).default(100),
      sinceHours: z.coerce.number().int().positive().max(24 * 365).optional(),
      payload: z.string().optional()
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json(q.error.flatten());
  const { limit, sinceHours, payload } = q.data;

  const params: any[] = [];
  let idx = 1;
  const where: string[] = [];
  if (sinceHours) { where.push(`created_at >= now() - ($${idx++}::int || ' hours')::interval`); params.push(sinceHours); }
  if (payload) { where.push(`payload @> $${idx++}::jsonb`); params.push(payload); }
  const sql = `
    SELECT id, title, payload, created_at, ST_AsGeoJSON(geog::geometry) AS geojson
    FROM events
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY created_at DESC
    LIMIT $${idx}
  `;
  params.push(limit);
  const r = await query(sql, params);
  res.json(r.rows);
});

// Radius search: /events/radius?lat=..&lon=..&meters=3000
app.get('/events/radius', async (req, res) => {
  const q = z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lon: z.coerce.number().min(-180).max(180),
      meters: z.coerce.number().positive().max(100000),
      payload: z.string().optional()
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json(q.error.flatten());
  const { lat, lon, meters, payload } = q.data;

  const wherePayload = payload ? ' AND payload @> $4::jsonb' : '';
  const sql = `
    SELECT id, title, payload, created_at,
           ST_Distance(geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS meters
    FROM events
    WHERE ST_DWithin(geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
    ${wherePayload}
    ORDER BY meters ASC
    LIMIT 200
  `;
  const params: any[] = [lon, lat, meters];
  if (payload) params.push(payload);
  const r = await pool.query(sql, params);
  res.json(r.rows);
});

// Nearest N: /events/nearest?lat=..&lon=..&limit=20
app.get('/events/nearest', async (req, res) => {
  const q = z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lon: z.coerce.number().min(-180).max(180),
      limit: z.coerce.number().int().positive().max(500).default(20),
      payload: z.string().optional()
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json(q.error.flatten());
  const { lat, lon, limit, payload } = q.data;

  const wherePayload = payload ? 'WHERE payload @> $3::jsonb' : '';
  const sql = `
    SELECT id, title, payload, created_at,
           geog <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS dist
    FROM events
    ${wherePayload}
    ORDER BY dist ASC
    LIMIT $${payload ? 4 : 3}
  `;
  const params: any[] = [lon, lat];
  if (payload) params.push(payload);
  params.push(limit);
  const r = await pool.query(sql, params);
  res.json(r.rows);
});

// Polygon search: POST /events/polygon { polygon: GeoJSON Polygon }
app.post('/events/polygon', async (req, res) => {
  const schema = z.object({ polygon: z.any(), payload: z.string().optional() });
  const v = schema.safeParse(req.body);
  if (!v.success) return res.status(400).json(v.error.flatten());
  const wherePayload = v.data.payload ? ' AND payload @> $2::jsonb' : '';
  const sql = `
    SELECT id, title, payload, created_at
    FROM events
    WHERE ST_Intersects(
      geog,
      ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography
    )
    ${wherePayload}
    LIMIT 500
  `;
  const params: any[] = [JSON.stringify(v.data.polygon)];
  if (v.data.payload) params.push(v.data.payload);
  const r = await pool.query(sql, params);
  res.json(r.rows);
});

// Create event: POST /events { id?, title, payload, lon, lat }
app.post('/events', async (req, res) => {
  const schema = z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    payload: z.any().optional(),
    lon: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90)
  });
  const v = schema.safeParse(req.body);
  if (!v.success) return res.status(400).json(v.error.flatten());
  const { id, title, payload, lon, lat } = v.data;

  const sql = `
    INSERT INTO events (id, title, payload, geog)
    VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3::jsonb,
      ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography)
    RETURNING id
  `;
  try {
    const r = await pool.query(sql, [id ?? null, title, JSON.stringify(payload ?? {}), lon, lat]);
    res.status(201).json({ id: r.rows[0].id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Bounding box: /events/bbox?w=-122.52&s=37.70&e=-122.35&n=37.83
app.get('/events/bbox', async (req, res) => {
  const q = z
    .object({
      w: z.coerce.number().min(-180).max(180),
      s: z.coerce.number().min(-90).max(90),
      e: z.coerce.number().min(-180).max(180),
      n: z.coerce.number().min(-90).max(90),
      payload: z.string().optional()
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json(q.error.flatten());
  const { w, s, e, n, payload } = q.data;
  const sql = `
    SELECT id, title, payload, created_at
    FROM events
    WHERE ST_Intersects(
      geog,
      ST_SetSRID(ST_MakeEnvelope($1, $2, $3, $4, 4326), 4326)::geography
    )
    ${payload ? 'AND payload @> $5::jsonb' : ''}
    LIMIT 1000
  `;
  const r = await query(sql, payload ? [w, s, e, n, payload] : [w, s, e, n]);
  res.json(r.rows);
});

// Get by id
app.get('/events/:id', async (req, res) => {
  const id = req.params.id;
  if (!z.string().uuid().safeParse(id).success) return res.status(400).json({ error: 'invalid id' });
  const r = await query('SELECT id, title, payload, created_at, ST_AsGeoJSON(geog::geometry) AS geojson FROM events WHERE id=$1', [id]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
  res.json(r.rows[0]);
});

// Update by id (partial)
app.patch('/events/:id', async (req, res) => {
  const id = req.params.id;
  if (!z.string().uuid().safeParse(id).success) return res.status(400).json({ error: 'invalid id' });
  const schema = z.object({
    title: z.string().min(1).max(200).optional(),
    payload: z.any().optional(),
    lon: z.number().min(-180).max(180).optional(),
    lat: z.number().min(-90).max(90).optional()
  });
  const v = schema.safeParse(req.body);
  if (!v.success) return res.status(400).json(v.error.flatten());
  const { title, payload, lon, lat } = v.data;

  // Build dynamic update
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;
  if (title !== undefined) { sets.push(`title=$${idx++}`); params.push(title); }
  if (payload !== undefined) { sets.push(`payload=$${idx++}::jsonb`); params.push(JSON.stringify(payload)); }
  if (lon !== undefined && lat !== undefined) {
    sets.push(`geog=ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)::geography`);
    params.push(lon, lat);
  } else if ((lon !== undefined) !== (lat !== undefined)) {
    return res.status(400).json({ error: 'lon and lat must be provided together' });
  }
  if (sets.length === 0) return res.status(400).json({ error: 'no fields to update' });
  params.push(id);
  const sql = `UPDATE events SET ${sets.join(', ')} WHERE id=$${idx} RETURNING id`;
  try {
    const r = await query(sql, params);
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json({ id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Delete
app.delete('/events/:id', async (req, res) => {
  const id = req.params.id;
  if (!z.string().uuid().safeParse(id).success) return res.status(400).json({ error: 'invalid id' });
  const r = await query('DELETE FROM events WHERE id=$1', [id]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
  res.status(204).send();
});

// Bulk insert: POST /events/bulk [{title, payload?, lon, lat}, ...]
app.post('/events/bulk', async (req, res) => {
  const itemSchema = z.object({
    title: z.string().min(1).max(200),
    payload: z.any().optional(),
    lon: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90)
  });
  const arr = z.array(itemSchema).min(1).max(1000).safeParse(req.body);
  if (!arr.success) return res.status(400).json(arr.error.flatten());
  const values: string[] = [];
  const params: any[] = [];
  let i = 1;
  for (const it of arr.data) {
    values.push(`(gen_random_uuid(), $${i++}, $${i++}::jsonb, ST_SetSRID(ST_MakePoint($${i++}, $${i++}), 4326)::geography)`);
    params.push(it.title, JSON.stringify(it.payload ?? {}), it.lon, it.lat);
  }
  const sql = `INSERT INTO events (id, title, payload, geog) VALUES ${values.join(', ')} RETURNING id`;
  try {
    const r = await query(sql, params);
    res.status(201).json({ inserted: r.rowCount });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// User location tracking: POST /locations { userId, lat, lon, accuracy? }
app.post('/locations', requireAppKey, async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1).max(100),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    accuracy: z.number().positive().optional()
  });
  const v = schema.safeParse(req.body);
  if (!v.success) return res.status(400).json(v.error.flatten());
  const { userId, lat, lon, accuracy } = v.data;

  const sql = `
    INSERT INTO user_locations (user_id, geog, accuracy_meters)
    VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)
    RETURNING id
  `;
  try {
    const r = await query(sql, [userId, lon, lat, accuracy ?? null]);
    res.status(201).json({ id: r.rows[0].id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`server listening on :${port}`);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  try { await pool.end(); } catch {}
  process.exit(0);
});
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  try { await pool.end(); } catch {}
  process.exit(0);
});
