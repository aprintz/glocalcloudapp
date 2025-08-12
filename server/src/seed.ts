import 'dotenv/config';
import { getPool } from './db.js';

async function run() {
  const pts = [
    { title: 'Copenhagen', lon: 12.5683, lat: 55.6761 },
    { title: 'Stockholm', lon: 18.0686, lat: 59.3293 },
    { title: 'Oslo', lon: 10.7522, lat: 59.9139 },
    { title: 'Berlin', lon: 13.4050, lat: 52.5200 }
  ];
  const values: string[] = [];
  const params: any[] = [];
  let i = 1;
  for (const p of pts) {
    values.push(`(gen_random_uuid(), $${i++}, '{}'::jsonb, ST_SetSRID(ST_MakePoint($${i++}, $${i++}), 4326)::geography)`);
    params.push(p.title, p.lon, p.lat);
  }
  const pool = await getPool();
  await pool.query(`INSERT INTO events (id, title, payload, geog) VALUES ${values.join(', ')}` , params);
  console.log('Seeded', pts.length, 'events');
  await pool.end();
}

run().catch(async (e) => {
  console.error('Seed failed:', e);
  try { 
    const pool = await getPool();
    await pool.end(); 
  } catch {}
  process.exit(1);
});
