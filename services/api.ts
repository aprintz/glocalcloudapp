// Expo packs public env at build-time; fall back to globals when running in dev
const expoEnv: any = (global as any)?.__expo?.env || {};
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || expoEnv.EXPO_PUBLIC_API_BASE || 'http://localhost:4000';
const APP_KEY = process.env.EXPO_PUBLIC_APP_API_KEY || expoEnv.EXPO_PUBLIC_APP_API_KEY || '';

export async function apiGet<T = any>(path: string): Promise<T> {
  const url = `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const r = await fetch(url, {
    headers: APP_KEY ? { 'x-app-key': APP_KEY } : undefined,
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`GET ${url} failed: ${r.status} ${text}`);
  }
  return (await r.json()) as T;
}

export type CmsPage = {
  id: string | number;
  attributes?: {
    title?: string;
    slug?: string;
    content?: string;
    tenant?: string;
  };
  title?: string;
  slug?: string;
  content?: string;
  tenant?: string;
};

export async function getCmsPage(slug: string) {
  return apiGet(`/cms/pages/${encodeURIComponent(slug)}`);
}

export async function listCmsPages() {
  return apiGet(`/cms/pages`);
}
