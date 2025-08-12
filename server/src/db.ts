import 'dotenv/config';
import { Pool, QueryConfig, QueryResult, QueryResultRow } from 'pg';
import { secretsService } from './secrets.js';

let pool: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (!pool) {
    const DATABASE_URL = await secretsService.getSecret('database-url', 'DATABASE_URL');
    const useSsl = (process.env.DATABASE_SSL || '').toLowerCase() === 'require';
    
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
}

export { getPool };

export async function ping() {
  const pool = await getPool();
  const r = await pool.query('select 1 as ok');
  // Check PostGIS extension presence
  const ext = await pool.query(
    "SELECT installed FROM (SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='postgis') AS installed) s"
  );
  return r.rows[0].ok === 1 && ext.rows?.[0]?.installed === true;
}

export async function query<T extends QueryResultRow = any>(
  text: string | QueryConfig<any[]>,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = await getPool();
  return params ? (pool.query as any)(text as string, params) : (pool.query as any)(text as any);
}
