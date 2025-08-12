import { setupStrapi, cleanupStrapi } from '../../../../test/helpers/strapi';

describe('Geolocation Plugin', () => {
  beforeAll(async () => {
    await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi();
  });

  describe('Radius Search', () => {
    test('should find events within radius', async () => {
      const strapi = global.strapi;
      
      // Create a test event first
      await strapi
        .plugin('geolocation')
        .service('geolocation')
        .create({
          title: 'Test Event',
          payload: { test: true },
          lon: -122.4194, // San Francisco
          lat: 37.7749
        });

      // Search for events within 5km radius
      const results = await strapi
        .plugin('geolocation')
        .service('geolocation')
        .findByRadius({
          lat: 37.7749,
          lon: -122.4194, 
          meters: 5000
        });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('title', 'Test Event');
      expect(results[0]).toHaveProperty('meters');
    });
  });

  describe('Nearest Search', () => {
    test('should find nearest events', async () => {
      const strapi = global.strapi;
      
      const results = await strapi
        .plugin('geolocation')
        .service('geolocation')
        .findNearest({
          lat: 37.7749,
          lon: -122.4194,
          limit: 5
        });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(5);
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('dist');
      }
    });
  });

  describe('Bounding Box Search', () => {
    test('should find events within bounding box', async () => {
      const strapi = global.strapi;
      
      // San Francisco bay area bounding box
      const results = await strapi
        .plugin('geolocation')
        .service('geolocation')
        .findByBbox({
          w: -122.5,  // West
          s: 37.7,    // South  
          e: -122.3,  // East
          n: 37.8     // North
        });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('CRUD Operations', () => {
    test('should create, read, update, and delete events', async () => {
      const strapi = global.strapi;
      const service = strapi.plugin('geolocation').service('geolocation');
      
      // Create
      const created = await service.create({
        title: 'CRUD Test Event',
        payload: { type: 'test' },
        lon: -122.4194,
        lat: 37.7749
      });
      
      expect(created).toHaveProperty('id');
      const eventId = created.id;

      // Read
      const found = await service.findOne(eventId);
      expect(found).toBeDefined();
      expect(found.title).toBe('CRUD Test Event');

      // Update
      const updated = await service.update(eventId, {
        title: 'Updated CRUD Test Event',
        payload: { type: 'updated' }
      });
      expect(updated).toHaveProperty('id', eventId);

      // Verify update
      const foundUpdated = await service.findOne(eventId);
      expect(foundUpdated.title).toBe('Updated CRUD Test Event');

      // Delete
      const deleted = await service.delete(eventId);
      expect(deleted).toHaveProperty('deleted', true);

      // Verify deletion
      const foundDeleted = await service.findOne(eventId);
      expect(foundDeleted).toBeNull();
    });
  });
});