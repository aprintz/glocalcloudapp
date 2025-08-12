import { Strapi } from '@strapi/strapi';

export default ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx) {
    try {
      // Only admin users can access geofences
      await this.validatePermissions(ctx);
      
      const data = await strapi.plugin('geofences').service('geofence').find(ctx.query);
      return { data };
    } catch (error) {
      strapi.log.error('Error fetching geofences:', error);
      return ctx.badRequest('Failed to fetch geofences');
    }
  },

  async findOne(ctx) {
    try {
      await this.validatePermissions(ctx);
      
      const { id } = ctx.params;
      const data = await strapi.plugin('geofences').service('geofence').findOne(id, ctx.query);
      
      if (!data) {
        return ctx.notFound('Geofence not found');
      }
      
      return { data };
    } catch (error) {
      strapi.log.error('Error fetching geofence:', error);
      return ctx.badRequest('Failed to fetch geofence');
    }
  },

  async create(ctx) {
    try {
      await this.validatePermissions(ctx);
      
      const data = await strapi.plugin('geofences').service('geofence').create(ctx.request.body);
      
      // Log creation with spec_id
      strapi.log.info(`Geofence created: ${data.name}`, {
        spec_id: 'F-003',
        geofence_id: data.id,
        user_id: ctx.state.user?.id,
        action: 'create'
      });
      
      return { data };
    } catch (error) {
      strapi.log.error('Error creating geofence:', error);
      return ctx.badRequest('Failed to create geofence');
    }
  },

  async update(ctx) {
    try {
      await this.validatePermissions(ctx);
      
      const { id } = ctx.params;
      const data = await strapi.plugin('geofences').service('geofence').update(id, ctx.request.body);
      
      if (!data) {
        return ctx.notFound('Geofence not found');
      }
      
      // Log update with spec_id
      strapi.log.info(`Geofence updated: ${data.name}`, {
        spec_id: 'F-003',
        geofence_id: data.id,
        user_id: ctx.state.user?.id,
        action: 'update'
      });
      
      return { data };
    } catch (error) {
      strapi.log.error('Error updating geofence:', error);
      return ctx.badRequest('Failed to update geofence');
    }
  },

  async delete(ctx) {
    try {
      await this.validatePermissions(ctx);
      
      const { id } = ctx.params;
      const data = await strapi.plugin('geofences').service('geofence').delete(id);
      
      if (!data) {
        return ctx.notFound('Geofence not found');
      }
      
      // Log deletion with spec_id
      strapi.log.info(`Geofence deleted: ${data.name}`, {
        spec_id: 'F-003',
        geofence_id: data.id,
        user_id: ctx.state.user?.id,
        action: 'delete'
      });
      
      return { data };
    } catch (error) {
      strapi.log.error('Error deleting geofence:', error);
      return ctx.badRequest('Failed to delete geofence');
    }
  },

  async validateLocation(ctx) {
    try {
      const { latitude, longitude, user_id } = ctx.request.body;
      
      if (!latitude || !longitude || !user_id) {
        return ctx.badRequest('Missing required parameters: latitude, longitude, user_id');
      }
      
      const results = await strapi.plugin('geofences').service('geofenceEvaluation').evaluateUserLocation({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        user_id,
        tenant: ctx.request.body.tenant || 'public'
      });
      
      return { data: results };
    } catch (error) {
      strapi.log.error('Error validating location:', error);
      return ctx.badRequest('Failed to validate location');
    }
  },

  async validatePermissions(ctx) {
    // Check if user is admin or has proper permissions
    const isAdmin = ctx.state.user?.roles?.some(role => role.type === 'admin');
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }
  }
});