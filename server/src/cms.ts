import 'dotenv/config';

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
  console.log(STRAPI_TOKEN);
  if (STRAPI_DEBUG) console.log('[strapi] GET', url);
  try{
  const r = await fetch(url, {
    headers: STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : undefined
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    if (STRAPI_DEBUG) console.error('[strapi] error', r.status, r.statusText, text.slice(0, 500));
    throw new Error(`Strapi GET ${url} failed: ${r.status} ${r.statusText} ${text}`);
  }
  const json = (await r.json()) as T;
  if (STRAPI_DEBUG) console.log('[strapi] OK', url, 'keys=', Object.keys(json as any));
  return json;
}
catch (e) {
    if (STRAPI_DEBUG) console.error('[strapi] error', e);
    throw e;
}
}
