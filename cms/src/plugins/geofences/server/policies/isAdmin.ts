export default (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  const { user } = policyContext.state;
  
  if (!user) {
    return false;
  }
  
  // Check if user has admin role or specific geofences permissions
  const isAdmin = user.roles?.some((role: any) => role.type === 'admin');
  const hasGeofencePermission = user.roles?.some((role: any) => 
    role.permissions?.some((permission: any) => 
      permission.action?.startsWith('plugin::geofences')
    )
  );
  
  if (isAdmin || hasGeofencePermission) {
    strapi.log.info('Admin access granted for geofences', {
      spec_id: 'F-003',
      user_id: user.id,
      action: 'admin_access'
    });
    return true;
  }
  
  strapi.log.warn('Unauthorized geofences access attempt', {
    spec_id: 'F-003',
    user_id: user.id,
    action: 'unauthorized_access'
  });
  
  return false;
};