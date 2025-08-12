import 'dotenv/config';
import { logger, metrics } from './observability/index.js';

const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN || '';
const STRAPI_DEBUG = process.env.STRAPI_DEBUG === '1';

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path.startsWith('http') ? path : `${STRAPI_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function strapiGet<T = any>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = buildUrl(path, params);
  const timer = metrics.cmsRequestDuration.record.bind(metrics.cmsRequestDuration);
  const startTime = Date.now();
  
  if (STRAPI_DEBUG) {
    logger.debug('Strapi request started', { url, path, params });
    console.log('[strapi] GET', url);
  }
  
  try {
    const r = await fetch(url, {
      headers: STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : undefined
    });
    
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      timer(Date.now() - startTime, { status: 'error', statusCode: String(r.status) });
      
      const errorMessage = `Strapi GET ${url} failed: ${r.status} ${r.statusText} ${text}`;
      logger.error('Strapi request failed', {
        url,
        status: r.status,
        statusText: r.statusText,
        response: text.slice(0, 500)
      });
      
      if (STRAPI_DEBUG) console.error('[strapi] error', r.status, r.statusText, text.slice(0, 500));
      throw new Error(errorMessage);
    }
    
    const json = (await r.json()) as T;
    timer(Date.now() - startTime, { status: 'success', statusCode: String(r.status) });
    
    logger.debug('Strapi request completed successfully', {
      url,
      status: r.status,
      responseKeys: Object.keys(json as any),
      duration: Date.now() - startTime
    });
    
    if (STRAPI_DEBUG) console.log('[strapi] OK', url, 'keys=', Object.keys(json as any));
    return json;
  } catch (e: any) {
    timer(Date.now() - startTime, { status: 'error' });
    logger.error('Strapi request exception', {
      url,
      error: e.message,
      stack: e.stack
    });
    
    if (STRAPI_DEBUG) console.error('[strapi] error', e);
    throw e;
  }
}
