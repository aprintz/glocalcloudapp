import 'dotenv/config';
import { Pool, QueryConfig, QueryResult, QueryResultRow } from 'pg';

const useSsl = (process.env.DATABASE_SSL || '').toLowerCase() === 'require';
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
});

export async function ping() {
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
  return params ? (pool.query as any)(text as string, params) : (pool.query as any)(text as any);
}
