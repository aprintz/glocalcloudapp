import { Strapi } from '@strapi/strapi';

export default ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx) {
    try {
      await this.validatePermissions(ctx);
      
      const data = await strapi.plugin('geofences').service('notificationTemplate').find(ctx.query);
      return { data };
    } catch (error) {
      strapi.log.error('Error fetching notification templates:', error);
      return ctx.badRequest('Failed to fetch notification templates');
    }
  },

  async findOne(ctx) {
    try {
      await this.validatePermissions(ctx);
      
      const { id } = ctx.params;
      const data = await strapi.plugin('geofences').service('notificationTemplate').findOne(id, ctx.query);
      
      if (!data) {
        return ctx.notFound('Notification template not found');
      }
      
      return { data };
    } catch (error) {
      strapi.log.error('Error fetching notification template:', error);
      return ctx.badRequest('Failed to fetch notification template');
    }
  },

  async create(ctx) {
    try {
      await this.validatePermissions(ctx);
      
      const data = await strapi.plugin('geofences').service('notificationTemplate').create(ctx.request.body);
      
      strapi.log.info(`Notification template created: ${data.name}`, {
        spec_id: 'F-003',
        template_id: data.id,
        user_id: ctx.state.user?.id,
        action: 'create_template'
      });
      
      return { data };
    } catch (error) {
      strapi.log.error('Error creating notification template:', error);
      return ctx.badRequest('Failed to create notification template');
    }
  },

  async update(ctx) {
    try {
      await this.validatePermissions(ctx);
      
      const { id } = ctx.params;
      const data = await strapi.plugin('geofences').service('notificationTemplate').update(id, ctx.request.body);
      
      if (!data) {
        return ctx.notFound('Notification template not found');
      }
      
      strapi.log.info(`Notification template updated: ${data.name}`, {
        spec_id: 'F-003',
        template_id: data.id,
        user_id: ctx.state.user?.id,
        action: 'update_template'
      });
      
      return { data };
    } catch (error) {
      strapi.log.error('Error updating notification template:', error);
      return ctx.badRequest('Failed to update notification template');
    }
  },

  async delete(ctx) {
    try {
      await this.validatePermissions(ctx);
      
      const { id } = ctx.params;
      const data = await strapi.plugin('geofences').service('notificationTemplate').delete(id);
      
      if (!data) {
        return ctx.notFound('Notification template not found');
      }
      
      strapi.log.info(`Notification template deleted: ${data.name}`, {
        spec_id: 'F-003',
        template_id: data.id,
        user_id: ctx.state.user?.id,
        action: 'delete_template'
      });
      
      return { data };
    } catch (error) {
      strapi.log.error('Error deleting notification template:', error);
      return ctx.badRequest('Failed to delete notification template');
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