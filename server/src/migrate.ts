import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

async function run() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const dir = join(__dirname, '..', 'sql');
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();
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
  try { await pool.end(); } catch {}
  process.exit(1);
});
