// Map admin role code -> allowed tenants (comma-separated), e.g.
// TENANT_ROLE_MAP="strapi-author=tenant-a,tenant-b;strapi-editor=public"
const roleMap: Map<string, string[]> = (() => {
  const raw = process.env.TENANT_ROLE_MAP || '';
  const m = new Map<string, string[]>();
  raw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [role, tenants] = pair.split('=');
      if (!role || !tenants) return;
      const list = tenants
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      m.set(role.trim(), list);
    });
  return m;
})();

function isAllowedTenantForCurrentUser(tenant?: string | null): boolean {
  if (!tenant) return true; // allow default/public when unset
  const ctx = (global as any).strapi?.requestContext?.get?.();
  const user = ctx?.state?.user;
  if (!user) return true; // content API or background ops
  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (roles.some((r: any) => r.code === 'strapi-super-admin')) return true;
  if (roleMap.size === 0) return true; // no map configured => allow all
  const allowed = new Set<string>();
  for (const r of roles) {
    const list = roleMap.get(r.code) || [];
    for (const t of list) allowed.add(t);
  }
  return allowed.has(tenant);
}

async function getExistingTenant(id?: number | string) {
  if (!id) return undefined;
  try {
    const entity = await (global as any).strapi.entityService.findOne('api::page.page', id as any, {
      fields: ['tenant'],
    });
    return entity?.tenant as string | undefined;
  } catch {
    return undefined;
  }
}

export default {
  async beforeCreate(event: any) {
    const tenant = event?.params?.data?.tenant ?? undefined;
    if (!isAllowedTenantForCurrentUser(tenant)) {
      throw new Error('Not allowed to create content for this tenant');
    }
  },
  async beforeUpdate(event: any) {
    const id = event?.params?.where?.id;
    const currentTenant = await getExistingTenant(id);
    const nextTenant = event?.params?.data?.tenant ?? currentTenant;
    if (!isAllowedTenantForCurrentUser(nextTenant)) {
      throw new Error('Not allowed to update content for this tenant');
    }
  },
};
