import 'dotenv/config';
import { secretsService } from './secrets.js';

let STRAPI_BASE_URL: string;
let STRAPI_TOKEN: string;
const STRAPI_DEBUG = process.env.STRAPI_DEBUG === '1';

// Initialize secrets on first use
let secretsInitialized = false;
async function initializeSecrets() {
  if (!secretsInitialized) {
    const secrets = await secretsService.getAllSecrets();
    STRAPI_BASE_URL = secrets.STRAPI_BASE_URL || 'http://localhost:1337';
    STRAPI_TOKEN = secrets.STRAPI_TOKEN || '';
    secretsInitialized = true;
  }
}

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
  await initializeSecrets();
  
  const url = buildUrl(path, params);
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
