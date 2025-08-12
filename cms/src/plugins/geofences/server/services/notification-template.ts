import { Strapi } from '@strapi/strapi';

export default ({ strapi }: { strapi: Strapi }) => ({
  async find(params = {}) {
    try {
      return await strapi.entityService.findMany('plugin::geofences.notification-template', {
        ...params,
        populate: ['geofences']
      });
    } catch (error) {
      strapi.log.error('Error in notification template find service:', error);
      throw error;
    }
  },

  async findOne(id: number, params = {}) {
    try {
      return await strapi.entityService.findOne('plugin::geofences.notification-template', id, {
        ...params,
        populate: ['geofences']
      });
    } catch (error) {
      strapi.log.error('Error in notification template findOne service:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      this.validateTemplateData(data);
      
      return await strapi.entityService.create('plugin::geofences.notification-template', {
        data,
        populate: ['geofences']
      });
    } catch (error) {
      strapi.log.error('Error in notification template create service:', error);
      throw error;
    }
  },

  async update(id: number, data: any) {
    try {
      if (data.notification_type || data.title || data.message) {
        this.validateTemplateData(data);
      }
      
      return await strapi.entityService.update('plugin::geofences.notification-template', id, {
        data,
        populate: ['geofences']
      });
    } catch (error) {
      strapi.log.error('Error in notification template update service:', error);
      throw error;
    }
  },

  async delete(id: number) {
    try {
      return await strapi.entityService.delete('plugin::geofences.notification-template', id);
    } catch (error) {
      strapi.log.error('Error in notification template delete service:', error);
      throw error;
    }
  },

  validateTemplateData(data: any) {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    
    if (!data.message || data.message.trim().length === 0) {
      throw new Error('Message is required');
    }
    
    const validTypes = ['push', 'email', 'sms', 'webhook'];
    if (data.notification_type && !validTypes.includes(data.notification_type)) {
      throw new Error(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (data.priority && !validPriorities.includes(data.priority)) {
      throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }
    
    if (data.notification_type === 'webhook' && !data.webhook_url) {
      throw new Error('Webhook URL is required for webhook notifications');
    }
    
    if (data.notification_type === 'email' && !data.email_template) {
      throw new Error('Email template is required for email notifications');
    }
    
    if (data.notification_type === 'sms' && !data.sms_template) {
      throw new Error('SMS template is required for SMS notifications');
    }
  },

  async findActiveTemplates(tenant = 'public') {
    try {
      return await strapi.entityService.findMany('plugin::geofences.notification-template', {
        filters: {
          is_active: true,
          tenant: tenant
        },
        populate: ['geofences']
      });
    } catch (error) {
      strapi.log.error('Error finding active notification templates:', error);
      throw error;
    }
  }
});