import 'dotenv/config';
import { Pool, QueryConfig, QueryResult, QueryResultRow } from 'pg';
import { metrics, tracing, logger } from './observability/index.js';

const useSsl = (process.env.DATABASE_SSL || '').toLowerCase() === 'require';
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
});

// Monitor pool events
pool.on('connect', () => {
  logger.debug('Database pool connection established');
});

pool.on('error', (err) => {
  metrics.dbConnectionErrors.increment(1, { error: err.name });
  logger.error('Database pool error', { error: err.message, stack: err.stack });
});

export async function ping() {
  const timer = metrics.dbQueryDuration.record.bind(metrics.dbQueryDuration);
  const startTime = Date.now();
  
  try {
    const r = await pool.query('select 1 as ok');
    // Check PostGIS extension presence
    const ext = await pool.query(
      "SELECT installed FROM (SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='postgis') AS installed) s"
    );
    
    timer(Date.now() - startTime, { operation: 'ping', status: 'success' });
    metrics.dbQueryCount.increment(2, { operation: 'ping' }); // 2 queries executed
    
    const result = r.rows[0].ok === 1 && ext.rows?.[0]?.installed === true;
    logger.debug('Database ping completed', { 
      dbConnected: r.rows[0].ok === 1,
      postgisInstalled: ext.rows?.[0]?.installed === true,
      result 
    });
    
    return result;
  } catch (error: any) {
    timer(Date.now() - startTime, { operation: 'ping', status: 'error' });
    metrics.dbConnectionErrors.increment(1, { error: error.name });
    logger.error('Database ping failed', { error: error.message });
    throw error;
  }
}

export async function query<T extends QueryResultRow = any>(
  text: string | QueryConfig<any[]>,
  params?: any[]
): Promise<QueryResult<T>> {
  const timer = metrics.dbQueryDuration.record.bind(metrics.dbQueryDuration);
  const startTime = Date.now();
  
  const queryText = typeof text === 'string' ? text : text.text;
  const truncatedQuery = queryText.substring(0, 100);
  
  try {
    const result = params ? 
      await (pool.query as any)(text as string, params) : 
      await (pool.query as any)(text as any);
    
    timer(Date.now() - startTime, { status: 'success' });
    metrics.dbQueryCount.increment(1, { status: 'success' });
    
    logger.debug('Database query executed', {
      query: truncatedQuery,
      rowCount: result.rowCount,
      duration: Date.now() - startTime
    });
    
    return result;
  } catch (error: any) {
    timer(Date.now() - startTime, { status: 'error' });
    metrics.dbQueryCount.increment(1, { status: 'error' });
    
    logger.error('Database query failed', {
      query: truncatedQuery,
      error: error.message,
      code: error.code
    });
    
    throw error;
  }
}
