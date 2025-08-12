import { Strapi } from '@strapi/strapi';

export default ({ strapi }: { strapi: Strapi }) => ({
  async find(params = {}) {
    try {
      return await strapi.entityService.findMany('plugin::geofences.geofence', {
        ...params,
        populate: ['notification_template']
      });
    } catch (error) {
      strapi.log.error('Error in geofence find service:', error);
      throw error;
    }
  },

  async findOne(id: number, params = {}) {
    try {
      return await strapi.entityService.findOne('plugin::geofences.geofence', id, {
        ...params,
        populate: ['notification_template']
      });
    } catch (error) {
      strapi.log.error('Error in geofence findOne service:', error);
      throw error;
    }
  },

  async create(data: any) {
    try {
      // Validate geometry data
      this.validateGeofenceData(data);
      
      return await strapi.entityService.create('plugin::geofences.geofence', {
        data: {
          ...data,
          spec_id: 'F-003'
        },
        populate: ['notification_template']
      });
    } catch (error) {
      strapi.log.error('Error in geofence create service:', error);
      throw error;
    }
  },

  async update(id: number, data: any) {
    try {
      // Validate geometry data if provided
      if (data.geometry_type || data.center_latitude || data.center_longitude || data.radius_meters || data.polygon_coordinates) {
        this.validateGeofenceData(data);
      }
      
      return await strapi.entityService.update('plugin::geofences.geofence', id, {
        data,
        populate: ['notification_template']
      });
    } catch (error) {
      strapi.log.error('Error in geofence update service:', error);
      throw error;
    }
  },

  async delete(id: number) {
    try {
      return await strapi.entityService.delete('plugin::geofences.geofence', id);
    } catch (error) {
      strapi.log.error('Error in geofence delete service:', error);
      throw error;
    }
  },

  validateGeofenceData(data: any) {
    if (data.geometry_type === 'point_radius') {
      if (!data.center_latitude || !data.center_longitude || !data.radius_meters) {
        throw new Error('Point radius geofences require center_latitude, center_longitude, and radius_meters');
      }
      
      // Validate latitude/longitude ranges
      if (data.center_latitude < -90 || data.center_latitude > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      if (data.center_longitude < -180 || data.center_longitude > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      
      if (data.radius_meters <= 0) {
        throw new Error('Radius must be greater than 0');
      }
    } else if (data.geometry_type === 'polygon') {
      if (!data.polygon_coordinates || !Array.isArray(data.polygon_coordinates)) {
        throw new Error('Polygon geofences require polygon_coordinates as an array');
      }
      
      // Validate polygon coordinates
      if (data.polygon_coordinates.length < 3) {
        throw new Error('Polygon must have at least 3 points');
      }
      
      for (const point of data.polygon_coordinates) {
        if (!Array.isArray(point) || point.length !== 2) {
          throw new Error('Each polygon point must be an array of [longitude, latitude]');
        }
        const [lng, lat] = point;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          throw new Error('Invalid coordinates in polygon');
        }
      }
    }
  },

  async findActiveGeofences(tenant = 'public') {
    try {
      return await strapi.entityService.findMany('plugin::geofences.geofence', {
        filters: {
          is_active: true,
          tenant: tenant
        },
        populate: ['notification_template']
      });
    } catch (error) {
      strapi.log.error('Error finding active geofences:', error);
      throw error;
    }
  }
});