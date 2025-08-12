import * as fc from 'fast-check';
import geofenceService, { GeofenceZone, GeofenceEvent, NotificationSuppression } from '../../../src/plugins/geofence/services/geofence';

// Mock Strapi instance
const mockStrapi = {
  db: {
    query: jest.fn()
  },
  log: {
    info: jest.fn(),
    error: jest.fn()
  },
  plugin: jest.fn()
};

const service = geofenceService({ strapi: mockStrapi as any });

describe('Geofence Plugin - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Zone Management - GEO-ZONE-001, GEO-ZONE-002, GEO-ZONE-003', () => {
    it('should create a new geofence zone', async () => {
      // Arrange
      const zoneData = {
        name: 'Test Zone',
        description: 'A test geofence zone',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 100,
        userId: 'user-123',
        isActive: true,
        notificationMessage: 'You entered the test zone!'
      };

      mockStrapi.db.query.mockReturnValue({
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data))
      });

      // Act
      const result = await service.createZone(zoneData);

      // Assert
      expect(result.name).toBe(zoneData.name);
      expect(result.latitude).toBe(zoneData.latitude);
      expect(result.longitude).toBe(zoneData.longitude);
      expect(result.radius).toBe(zoneData.radius);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate zone data during creation', async () => {
      // Test invalid zone data
      const invalidCases = [
        { name: '', latitude: 0, longitude: 0, radius: 100, userId: 'user', isActive: true, notificationMessage: 'test' },
        { name: 'Test', latitude: 91, longitude: 0, radius: 100, userId: 'user', isActive: true, notificationMessage: 'test' },
        { name: 'Test', latitude: 0, longitude: 181, radius: 100, userId: 'user', isActive: true, notificationMessage: 'test' },
        { name: 'Test', latitude: 0, longitude: 0, radius: 0, userId: 'user', isActive: true, notificationMessage: 'test' },
        { name: 'Test', latitude: 0, longitude: 0, radius: 15000, userId: 'user', isActive: true, notificationMessage: 'test' }
      ];

      for (const invalidZone of invalidCases) {
        await expect(service.createZone(invalidZone)).rejects.toThrow();
      }
    });

    it('should update zone with valid data', async () => {
      // Arrange
      const zoneId = 'zone-123';
      const updates = {
        name: 'Updated Zone Name',
        radius: 200,
        isActive: false
      };

      mockStrapi.db.query.mockReturnValue({
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: zoneId }))
      });

      // Act
      const result = await service.updateZone(zoneId, updates);

      // Assert
      expect(result.name).toBe(updates.name);
      expect(result.radius).toBe(updates.radius);
      expect(result.isActive).toBe(updates.isActive);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should delete zone and cleanup related data', async () => {
      // Arrange
      const zoneId = 'zone-123';

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geofence.zone') {
          return { delete: jest.fn().mockResolvedValue({}) };
        } else if (entity === 'plugin::geofence.event') {
          return { deleteMany: jest.fn().mockResolvedValue({ count: 5 }) };
        }
        return {};
      });

      // Act
      const result = await service.deleteZone(zoneId);

      // Assert
      expect(result).toBe(true);
      expect(mockStrapi.db.query('plugin::geofence.zone').delete).toHaveBeenCalledWith({
        where: { id: zoneId }
      });
      expect(mockStrapi.db.query('plugin::geofence.event').deleteMany).toHaveBeenCalledWith({
        where: { zoneId }
      });
    });

    it('should validate zone parameters using property-based testing', () => {
      // Property-based test for zone validation
      fc.assert(fc.property(
        fc.record({
          name: fc.string(),
          latitude: fc.float(),
          longitude: fc.float(),
          radius: fc.float()
        }),
        (zoneData) => {
          const isNameValid = zoneData.name.trim().length > 0;
          const isLatValid = zoneData.latitude >= -90 && zoneData.latitude <= 90;
          const isLonValid = zoneData.longitude >= -180 && zoneData.longitude <= 180;
          const isRadiusValid = zoneData.radius > 0 && zoneData.radius <= 10000;

          if (isNameValid && isLatValid && isLonValid && isRadiusValid) {
            expect(() => service.validateZoneData(zoneData as any)).not.toThrow();
          } else {
            expect(() => service.validateZoneData(zoneData as any)).toThrow();
          }
        }
      ));
    });
  });

  describe('Geofence Checking - GEO-CHECK-001', () => {
    it('should detect zone entry events', async () => {
      // Arrange
      const userId = 'user-123';
      const latitude = 37.7749;
      const longitude = -122.4194;

      const mockZones = [
        {
          id: 'zone-1',
          name: 'Test Zone',
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 100,
          isActive: true,
          notificationMessage: 'Welcome!'
        }
      ];

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geofence.zone') {
          return { findMany: jest.fn().mockResolvedValue(mockZones) };
        } else if (entity === 'plugin::geofence.event') {
          return {
            findOne: jest.fn().mockResolvedValue(null), // No previous events
            create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data))
          };
        }
        return {};
      });

      jest.spyOn(service, 'isNotificationSuppressed').mockResolvedValue(false);
      jest.spyOn(service, 'queueNotification').mockResolvedValue();

      // Act
      const events = await service.checkGeofences(userId, latitude, longitude);

      // Assert
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('enter');
      expect(events[0].zoneId).toBe('zone-1');
      expect(events[0].userId).toBe(userId);
    });

    it('should detect zone exit events', async () => {
      // Arrange
      const userId = 'user-123';
      const latitude = 37.8000; // Outside the zone
      const longitude = -122.5000;

      const mockZones = [
        {
          id: 'zone-1',
          name: 'Test Zone',
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 100,
          isActive: true,
          notificationMessage: 'Goodbye!'
        }
      ];

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geofence.zone') {
          return { findMany: jest.fn().mockResolvedValue(mockZones) };
        } else if (entity === 'plugin::geofence.event') {
          return {
            findOne: jest.fn().mockResolvedValue({ eventType: 'enter' }), // Was inside
            create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data))
          };
        }
        return {};
      });

      jest.spyOn(service, 'isNotificationSuppressed').mockResolvedValue(false);
      jest.spyOn(service, 'queueNotification').mockResolvedValue();

      // Act
      const events = await service.checkGeofences(userId, latitude, longitude);

      // Assert
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('exit');
      expect(events[0].zoneId).toBe('zone-1');
    });

    it('should not create events when no state change occurs', async () => {
      // Arrange
      const userId = 'user-123';
      const latitude = 37.7749; // Inside the zone
      const longitude = -122.4194;

      const mockZones = [
        {
          id: 'zone-1',
          name: 'Test Zone',
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 100,
          isActive: true,
          notificationMessage: 'Still here!'
        }
      ];

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geofence.zone') {
          return { findMany: jest.fn().mockResolvedValue(mockZones) };
        } else if (entity === 'plugin::geofence.event') {
          return {
            findOne: jest.fn().mockResolvedValue({ eventType: 'enter' }), // Already inside
            create: jest.fn()
          };
        }
        return {};
      });

      // Act
      const events = await service.checkGeofences(userId, latitude, longitude);

      // Assert
      expect(events).toHaveLength(0);
      expect(mockStrapi.db.query('plugin::geofence.event').create).not.toHaveBeenCalled();
    });

    it('should handle multiple zones correctly', async () => {
      // Arrange
      const userId = 'user-123';
      const latitude = 37.7749;
      const longitude = -122.4194;

      const mockZones = [
        {
          id: 'zone-1',
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 50,
          isActive: true,
          notificationMessage: 'Zone 1'
        },
        {
          id: 'zone-2',
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 100,
          isActive: true,
          notificationMessage: 'Zone 2'
        },
        {
          id: 'zone-3',
          latitude: 37.8000,
          longitude: -122.5000,
          radius: 50,
          isActive: true,
          notificationMessage: 'Zone 3'
        }
      ];

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geofence.zone') {
          return { findMany: jest.fn().mockResolvedValue(mockZones) };
        } else if (entity === 'plugin::geofence.event') {
          return {
            findOne: jest.fn().mockResolvedValue(null), // No previous events
            create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data))
          };
        }
        return {};
      });

      jest.spyOn(service, 'isNotificationSuppressed').mockResolvedValue(false);
      jest.spyOn(service, 'queueNotification').mockResolvedValue();

      // Act
      const events = await service.checkGeofences(userId, latitude, longitude);

      // Assert
      expect(events).toHaveLength(2); // Should enter zone-1 and zone-2, not zone-3
      expect(events.map(e => e.zoneId)).toContain('zone-1');
      expect(events.map(e => e.zoneId)).toContain('zone-2');
      expect(events.map(e => e.zoneId)).not.toContain('zone-3');
    });
  });

  describe('Distance Calculation - GEO-CALC-001', () => {
    it('should calculate distance correctly', () => {
      // Test known distances
      const testCases = [
        { lat1: 0, lon1: 0, lat2: 0, lon2: 0, expected: 0 },
        { lat1: 0, lon1: 0, lat2: 1, lon2: 0, expected: 111319 }, // Approximately 1 degree of latitude
        { lat1: 37.7749, lon1: -122.4194, lat2: 37.7849, lon2: -122.4094, expected: 1388 } // San Francisco points
      ];

      testCases.forEach(({ lat1, lon1, lat2, lon2, expected }) => {
        const distance = service.calculateDistance(lat1, lon1, lat2, lon2);
        expect(Math.abs(distance - expected)).toBeLessThan(expected * 0.1); // Within 10% tolerance
      });
    });

    it('should handle edge cases in distance calculation', () => {
      // Property-based test for distance calculation properties
      fc.assert(fc.property(
        fc.float({ min: -90, max: 90 }),
        fc.float({ min: -180, max: 180 }),
        fc.float({ min: -90, max: 90 }),
        fc.float({ min: -180, max: 180 }),
        (lat1, lon1, lat2, lon2) => {
          const distance = service.calculateDistance(lat1, lon1, lat2, lon2);
          
          // Distance should be non-negative
          expect(distance).toBeGreaterThanOrEqual(0);
          
          // Distance to same point should be zero
          if (lat1 === lat2 && lon1 === lon2) {
            expect(distance).toBe(0);
          }
          
          // Distance should be symmetric
          const reverseDistance = service.calculateDistance(lat2, lon2, lat1, lon1);
          expect(Math.abs(distance - reverseDistance)).toBeLessThan(0.001);
        }
      ));
    });
  });

  describe('Notification Logic - GEO-NOTIF-001', () => {
    it('should process notification queue successfully', async () => {
      // Arrange
      const pendingEvents = [
        {
          id: 'event-1',
          zoneId: 'zone-1',
          userId: 'user-1',
          eventType: 'enter',
          notificationSent: false,
          suppressed: false
        },
        {
          id: 'event-2',
          zoneId: 'zone-2',
          userId: 'user-2',
          eventType: 'exit',
          notificationSent: false,
          suppressed: false
        }
      ];

      const mockZones = [
        { id: 'zone-1', notificationMessage: 'Welcome to zone 1!', suppressionMinutes: 30 },
        { id: 'zone-2', notificationMessage: 'Goodbye from zone 2!' }
      ];

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geofence.event') {
          return {
            findMany: jest.fn().mockResolvedValue(pendingEvents),
            update: jest.fn().mockResolvedValue({})
          };
        } else if (entity === 'plugin::geofence.zone') {
          return {
            findOne: jest.fn().mockImplementation(({ where }) => 
              Promise.resolve(mockZones.find(z => z.id === where.id))
            )
          };
        }
        return {};
      });

      const mockPushService = {
        sendToUser: jest.fn().mockResolvedValue(1)
      };

      mockStrapi.plugin.mockReturnValue({
        service: jest.fn().mockReturnValue(mockPushService)
      });

      jest.spyOn(service, 'suppressNotifications').mockResolvedValue();

      // Act
      const processedCount = await service.processNotificationQueue();

      // Assert
      expect(processedCount).toBe(2);
      expect(mockPushService.sendToUser).toHaveBeenCalledTimes(2);
      expect(service.suppressNotifications).toHaveBeenCalledWith('user-1', 'zone-1', 30);
    });

    it('should handle notification failures gracefully', async () => {
      // Arrange
      const pendingEvents = [
        {
          id: 'event-1',
          zoneId: 'zone-1',
          userId: 'user-1',
          eventType: 'enter',
          notificationSent: false,
          suppressed: false
        }
      ];

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geofence.event') {
          return { findMany: jest.fn().mockResolvedValue(pendingEvents) };
        } else if (entity === 'plugin::geofence.zone') {
          return { findOne: jest.fn().mockRejectedValue(new Error('Zone not found')) };
        }
        return {};
      });

      // Act
      const processedCount = await service.processNotificationQueue();

      // Assert
      expect(processedCount).toBe(0);
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });

  describe('Notification Suppression - GEO-SUPP-001, GEO-SUPP-002', () => {
    it('should suppress notifications for specified duration', async () => {
      // Arrange
      const userId = 'user-123';
      const zoneId = 'zone-456';
      const minutes = 60;

      mockStrapi.db.query.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({})
      });

      // Act
      await service.suppressNotifications(userId, zoneId, minutes);

      // Assert
      expect(mockStrapi.db.query().create).toHaveBeenCalledWith({
        data: {
          userId,
          zoneId,
          suppressUntil: expect.any(Date)
        }
      });
    });

    it('should check suppression status correctly', async () => {
      // Arrange
      const userId = 'user-123';
      const zoneId = 'zone-456';

      // Test active suppression
      const futureDate = new Date(Date.now() + 3600000); // 1 hour in future
      mockStrapi.db.query.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ suppressUntil: futureDate })
      });

      let isSuppressed = await service.isNotificationSuppressed(userId, zoneId);
      expect(isSuppressed).toBe(true);

      // Test expired suppression
      const pastDate = new Date(Date.now() - 3600000); // 1 hour in past
      mockStrapi.db.query.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ suppressUntil: pastDate })
      });

      isSuppressed = await service.isNotificationSuppressed(userId, zoneId);
      expect(isSuppressed).toBe(false);

      // Test no suppression record
      mockStrapi.db.query.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null)
      });

      isSuppressed = await service.isNotificationSuppressed(userId, zoneId);
      expect(isSuppressed).toBe(false);
    });

    it('should handle suppression edge cases', async () => {
      // Property-based test for suppression timing
      await fc.assert(fc.asyncProperty(
        fc.integer({ min: 1, max: 10080 }), // 1 minute to 1 week
        async (minutes) => {
          const userId = 'test-user';
          const zoneId = 'test-zone';

          mockStrapi.db.query.mockReturnValue({
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({})
          });

          await service.suppressNotifications(userId, zoneId, minutes);

          const call = mockStrapi.db.query().create.mock.calls[0][0];
          const suppressUntil = call.data.suppressUntil;
          const expectedTime = new Date(Date.now() + minutes * 60 * 1000);

          // Allow for small time differences (within 1 second)
          expect(Math.abs(suppressUntil.getTime() - expectedTime.getTime())).toBeLessThan(1000);
        }
      ));
    });
  });

  describe('Batch Processing - GEO-BATCH-001', () => {
    it('should process events in batches successfully', async () => {
      // Arrange
      const events: GeofenceEvent[] = [
        {
          id: 'event-1',
          zoneId: 'zone-1',
          userId: 'user-1',
          eventType: 'enter',
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: new Date(),
          notificationSent: false,
          suppressed: false
        },
        {
          id: 'event-2',
          zoneId: 'zone-2',
          userId: 'user-2',
          eventType: 'exit',
          latitude: 37.7849,
          longitude: -122.4094,
          timestamp: new Date(),
          notificationSent: false,
          suppressed: false
        }
      ];

      mockStrapi.db.query.mockReturnValue({
        create: jest.fn().mockResolvedValue({})
      });

      // Act
      const processedCount = await service.batchProcessEvents(events);

      // Assert
      expect(processedCount).toBe(2);
      expect(mockStrapi.db.query().create).toHaveBeenCalledTimes(2);
    });

    it('should handle batch processing errors gracefully', async () => {
      // Arrange
      const events: GeofenceEvent[] = [
        {
          id: 'event-1',
          zoneId: 'zone-1',
          userId: 'user-1',
          eventType: 'enter',
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: new Date(),
          notificationSent: false,
          suppressed: false
        },
        {
          id: 'event-2',
          zoneId: 'zone-2',
          userId: 'user-2',
          eventType: 'exit',
          latitude: 37.7849,
          longitude: -122.4094,
          timestamp: new Date(),
          notificationSent: false,
          suppressed: false
        }
      ];

      // Mock partial failure
      mockStrapi.db.query.mockReturnValue({
        create: jest.fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('Database error'))
      });

      // Act
      const processedCount = await service.batchProcessEvents(events);

      // Assert
      expect(processedCount).toBe(1); // One success, one failure
      expect(mockStrapi.log.error).toHaveBeenCalledWith('Failed to process batch event', expect.any(Error));
    });
  });

  describe('Cron Tasks - GEO-CRON-001', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should schedule cleanup tasks', () => {
      // Arrange
      mockStrapi.db.query.mockReturnValue({
        deleteMany: jest.fn().mockResolvedValue({ count: 5 })
      });

      jest.spyOn(service, 'processNotificationQueue').mockResolvedValue(3);

      // Act
      service.scheduleCronTasks();

      // Advance timers
      jest.advanceTimersByTime(60 * 60 * 1000); // 1 hour

      // Assert - suppression cleanup should have run
      expect(mockStrapi.db.query().deleteMany).toHaveBeenCalledWith({
        where: {
          suppressUntil: { $lt: expect.any(Date) }
        }
      });

      // Advance timers for notification processing
      jest.advanceTimersByTime(30 * 1000); // 30 seconds

      // Assert - notification queue processing should have run
      expect(service.processNotificationQueue).toHaveBeenCalled();
    });
  });
});

describe('Geofence Plugin - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Geofence Workflow', () => {
    it('should handle full geofence lifecycle with notifications', async () => {
      // Arrange
      const userId = 'integration-user';
      const zoneData = {
        name: 'Integration Test Zone',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 100,
        userId,
        isActive: true,
        notificationMessage: 'Welcome to integration test!',
        suppressionMinutes: 30
      };

      // Storage for created entities
      const zones: GeofenceZone[] = [];
      const events: GeofenceEvent[] = [];
      const suppressions: NotificationSuppression[] = [];

      // Mock database operations
      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geofence.zone') {
          return {
            create: jest.fn().mockImplementation(({ data }) => {
              const zone = { ...data, id: `zone-${zones.length}` };
              zones.push(zone);
              return Promise.resolve(zone);
            }),
            findMany: jest.fn().mockImplementation(({ where }) => {
              return Promise.resolve(zones.filter(z => where.isActive ? z.isActive : true));
            }),
            findOne: jest.fn().mockImplementation(({ where }) => {
              return Promise.resolve(zones.find(z => z.id === where.id));
            })
          };
        } else if (entity === 'plugin::geofence.event') {
          return {
            create: jest.fn().mockImplementation(({ data }) => {
              const event = { ...data, id: `event-${events.length}` };
              events.push(event);
              return Promise.resolve(event);
            }),
            findOne: jest.fn().mockImplementation(({ where }) => {
              return Promise.resolve(
                events
                  .filter(e => e.userId === where.userId && e.zoneId === where.zoneId)
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0] || null
              );
            }),
            findMany: jest.fn().mockImplementation(({ where }) => {
              return Promise.resolve(
                events.filter(e => 
                  e.notificationSent === where.notificationSent && 
                  e.suppressed === where.suppressed
                )
              );
            }),
            update: jest.fn().mockImplementation(({ where, data }) => {
              const event = events.find(e => e.id === where.id);
              if (event) {
                Object.assign(event, data);
              }
              return Promise.resolve(event);
            })
          };
        } else if (entity === 'plugin::geofence.suppression') {
          return {
            findOne: jest.fn().mockImplementation(({ where }) => {
              return Promise.resolve(
                suppressions.find(s => 
                  s.userId === where.userId && s.zoneId === where.zoneId
                ) || null
              );
            }),
            create: jest.fn().mockImplementation(({ data }) => {
              suppressions.push(data);
              return Promise.resolve(data);
            }),
            update: jest.fn().mockImplementation(({ where, data }) => {
              const existing = suppressions.findIndex(s => 
                s.userId === where.userId && s.zoneId === where.zoneId
              );
              if (existing >= 0) {
                suppressions[existing] = { ...suppressions[existing], ...data };
              }
              return Promise.resolve(data);
            })
          };
        }
        return {};
      });

      // Mock push service
      const mockPushService = {
        sendToUser: jest.fn().mockResolvedValue(1)
      };
      
      mockStrapi.plugin.mockReturnValue({
        service: jest.fn().mockReturnValue(mockPushService)
      });

      // Act & Assert - Create zone
      const zone = await service.createZone(zoneData);
      expect(zone.name).toBe(zoneData.name);
      expect(zones).toHaveLength(1);

      // Act & Assert - User enters zone
      const enterEvents = await service.checkGeofences(userId, 37.7749, -122.4194);
      expect(enterEvents).toHaveLength(1);
      expect(enterEvents[0].eventType).toBe('enter');
      expect(events).toHaveLength(1);

      // Act & Assert - Process notifications
      const processedCount = await service.processNotificationQueue();
      expect(processedCount).toBe(1);
      expect(mockPushService.sendToUser).toHaveBeenCalledWith(userId, {
        title: 'Geofence enter',
        body: zoneData.notificationMessage,
        data: {
          zoneId: zone.id,
          eventType: 'enter',
          eventId: enterEvents[0].id
        }
      });

      // Check suppression was applied
      expect(suppressions).toHaveLength(1);
      expect(suppressions[0].userId).toBe(userId);
      expect(suppressions[0].zoneId).toBe(zone.id);

      // Act & Assert - User exits zone
      const exitEvents = await service.checkGeofences(userId, 37.8000, -122.5000);
      expect(exitEvents).toHaveLength(1);
      expect(exitEvents[0].eventType).toBe('exit');
      expect(events).toHaveLength(2);

      // Verify no new notification due to suppression
      const isSuppressed = await service.isNotificationSuppressed(userId, zone.id);
      expect(isSuppressed).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of zones efficiently', async () => {
      // Arrange
      const userId = 'perf-user';
      const numZones = 1000;
      const zones = Array.from({ length: numZones }, (_, i) => ({
        id: `zone-${i}`,
        name: `Zone ${i}`,
        latitude: 37.7749 + (i * 0.001),
        longitude: -122.4194 + (i * 0.001),
        radius: 50,
        isActive: i % 2 === 0, // Only half are active
        notificationMessage: `Zone ${i} message`
      }));

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geofence.zone') {
          return {
            findMany: jest.fn().mockResolvedValue(zones.filter(z => z.isActive))
          };
        } else if (entity === 'plugin::geofence.event') {
          return {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({})
          };
        }
        return {};
      });

      jest.spyOn(service, 'isNotificationSuppressed').mockResolvedValue(false);
      jest.spyOn(service, 'queueNotification').mockResolvedValue();

      const startTime = Date.now();

      // Act
      const events = await service.checkGeofences(userId, 37.7749, -122.4194);

      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(events.length).toBeGreaterThan(0); // Should find some zones to enter
    });

    it('should handle concurrent geofence checks', async () => {
      // Arrange
      const users = Array.from({ length: 100 }, (_, i) => `user-${i}`);
      const zone = {
        id: 'concurrent-zone',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 1000,
        isActive: true,
        notificationMessage: 'Concurrent test'
      };

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geofence.zone') {
          return { findMany: jest.fn().mockResolvedValue([zone]) };
        } else if (entity === 'plugin::geofence.event') {
          return {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data))
          };
        }
        return {};
      });

      jest.spyOn(service, 'isNotificationSuppressed').mockResolvedValue(false);
      jest.spyOn(service, 'queueNotification').mockResolvedValue();

      // Act
      const promises = users.map(userId => 
        service.checkGeofences(userId, 37.7749, -122.4194)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(100);
      results.forEach((events, index) => {
        expect(events).toHaveLength(1);
        expect(events[0].userId).toBe(`user-${index}`);
        expect(events[0].eventType).toBe('enter');
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      // Arrange
      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockRejectedValue(new Error('Database connection lost'))
      });

      // Act & Assert
      await expect(service.checkGeofences('user-123', 37.7749, -122.4194))
        .rejects.toThrow('Database connection lost');
    });

    it('should handle partial system failures during notification processing', async () => {
      // Arrange
      const pendingEvents = [
        { id: 'event-1', zoneId: 'zone-1', userId: 'user-1', notificationSent: false, suppressed: false },
        { id: 'event-2', zoneId: 'zone-2', userId: 'user-2', notificationSent: false, suppressed: false }
      ];

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geofence.event') {
          return {
            findMany: jest.fn().mockResolvedValue(pendingEvents),
            update: jest.fn().mockResolvedValue({})
          };
        } else if (entity === 'plugin::geofence.zone') {
          return {
            findOne: jest.fn()
              .mockResolvedValueOnce({ id: 'zone-1', notificationMessage: 'Test 1' })
              .mockRejectedValueOnce(new Error('Zone not found'))
          };
        }
        return {};
      });

      const mockPushService = {
        sendToUser: jest.fn().mockResolvedValue(1)
      };
      
      mockStrapi.plugin.mockReturnValue({
        service: jest.fn().mockReturnValue(mockPushService)
      });

      // Act
      const processedCount = await service.processNotificationQueue();

      // Assert
      expect(processedCount).toBe(1); // Only one successful
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });
});