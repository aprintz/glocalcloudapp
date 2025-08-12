import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getPool } from './db.js';

async function run() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const dir = join(__dirname, '..', 'sql');
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  const pool = await getPool();
  for (const f of files) {
    const p = join(dir, f);
    const sql = readFileSync(p, 'utf8');
    console.log(`Running migration: ${f}`);
    await pool.query(sql);
  }
  console.log('Migrations completed');
  await pool.end();
}

run().catch(async (e) => {
  console.error('Migration failed:', e);
  try { 
    const pool = await getPool();
    await pool.end(); 
  } catch {}
  process.exit(1);
});
