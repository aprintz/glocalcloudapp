import * as fc from 'fast-check';
import geolocationService, { LocationData, LocationHub } from '../../../src/plugins/geolocation/services/geolocation';

// Mock Strapi instance
const mockStrapi = {
  db: {
    query: jest.fn()
  },
  log: {
    info: jest.fn(),
    error: jest.fn()
  }
};

const service = geolocationService({ strapi: mockStrapi as any });

describe('Geolocation Plugin - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Location Ingestion - GEO-ING-001', () => {
    it('should ingest valid location data', async () => {
      // Arrange
      const locationData = {
        userId: 'user-123',
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        timestamp: new Date()
      };

      mockStrapi.db.query.mockReturnValue({
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data))
      });

      // Act
      const result = await service.ingestLocation(locationData);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(locationData.userId);
      expect(result.latitude).toBe(locationData.latitude);
      expect(result.longitude).toBe(locationData.longitude);
      expect(result.id).toBeDefined();
    });

    it('should validate location coordinates', async () => {
      // Property-based test for coordinate validation
      await fc.assert(fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1 }),
          latitude: fc.float({ min: -90, max: 90 }),
          longitude: fc.float({ min: -180, max: 180 }),
          accuracy: fc.option(fc.float({ min: 0 }))
        }),
        async (locationData) => {
          mockStrapi.db.query.mockReturnValue({
            create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data))
          });

          const result = await service.ingestLocation(locationData);
          expect(result.latitude).toBe(locationData.latitude);
          expect(result.longitude).toBe(locationData.longitude);
        }
      ));
    });

    it('should reject invalid coordinates', async () => {
      // Test invalid latitude
      const invalidLatitude = {
        userId: 'user-123',
        latitude: 91, // Invalid
        longitude: 0,
        timestamp: new Date()
      };

      await expect(service.ingestLocation(invalidLatitude)).rejects.toThrow('Invalid latitude');

      // Test invalid longitude
      const invalidLongitude = {
        userId: 'user-123',
        latitude: 0,
        longitude: 181, // Invalid
        timestamp: new Date()
      };

      await expect(service.ingestLocation(invalidLongitude)).rejects.toThrow('Invalid longitude');
    });

    it('should handle missing required fields', async () => {
      // Test missing userId
      const noUserId = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: new Date()
      };

      await expect(service.ingestLocation(noUserId as any)).rejects.toThrow('userId is required');
    });

    it('should set timestamp if not provided', async () => {
      // Arrange
      const locationData = {
        userId: 'user-123',
        latitude: 37.7749,
        longitude: -122.4194
      };

      mockStrapi.db.query.mockReturnValue({
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data))
      });

      const beforeTime = new Date();

      // Act
      const result = await service.ingestLocation(locationData);

      const afterTime = new Date();

      // Assert
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Idempotency - GEO-ING-002', () => {
    it('should prevent duplicate ingestion with same ID', async () => {
      // Arrange
      const ingestionId = 'duplicate-test-id';
      const locationData = {
        userId: 'user-123',
        latitude: 37.7749,
        longitude: -122.4194,
        ingestionId,
        timestamp: new Date()
      };

      // Mock existing record
      mockStrapi.db.query.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ id: 'existing-record' }),
        create: jest.fn()
      });

      // Act & Assert
      await expect(service.ingestLocation(locationData)).rejects.toThrow('Location already ingested with this ID');
    });

    it('should allow ingestion when no existing record found', async () => {
      // Arrange
      const ingestionId = 'new-unique-id';
      const locationData = {
        userId: 'user-123',
        latitude: 37.7749,
        longitude: -122.4194,
        ingestionId,
        timestamp: new Date()
      };

      mockStrapi.db.query.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data))
      });

      // Act
      const result = await service.ingestLocation(locationData);

      // Assert
      expect(result).toBeDefined();
      expect(result.ingestionId).toBe(ingestionId);
    });

    it('should handle idempotency check correctly', async () => {
      // Test with existing record
      mockStrapi.db.query.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ id: 'exists' })
      });

      expect(await service.checkIdempotency('existing-id')).toBe(true);

      // Test with non-existing record
      mockStrapi.db.query.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null)
      });

      expect(await service.checkIdempotency('new-id')).toBe(false);
    });
  });

  describe('Data Pruning - GEO-PRU-001', () => {
    it('should prune locations older than retention period', async () => {
      // Arrange
      const retentionDays = 30;
      const mockDeleteResult = { count: 42 };

      mockStrapi.db.query.mockReturnValue({
        deleteMany: jest.fn().mockResolvedValue(mockDeleteResult)
      });

      // Act
      const deletedCount = await service.pruneOldLocations(retentionDays);

      // Assert
      expect(deletedCount).toBe(42);
      expect(mockStrapi.db.query().deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            $lt: expect.any(Date)
          }
        }
      });
    });

    it('should use default retention period when not specified', async () => {
      // Arrange
      mockStrapi.db.query.mockReturnValue({
        deleteMany: jest.fn().mockResolvedValue({ count: 10 })
      });

      // Act
      await service.pruneOldLocations();

      // Assert
      const call = mockStrapi.db.query().deleteMany.mock.calls[0][0];
      const cutoffDate = call.where.timestamp.$lt;
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 30);

      // Allow for small time differences
      expect(Math.abs(cutoffDate.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
    });

    it('should handle various retention periods', () => {
      // Property-based test for retention periods
      fc.assert(fc.asyncProperty(
        fc.integer({ min: 1, max: 365 }),
        async (retentionDays) => {
          mockStrapi.db.query.mockReturnValue({
            deleteMany: jest.fn().mockResolvedValue({ count: 0 })
          });

          await service.pruneOldLocations(retentionDays);

          const call = mockStrapi.db.query().deleteMany.mock.calls[0][0];
          const cutoffDate = call.where.timestamp.$lt;
          const expectedCutoff = new Date();
          expectedCutoff.setDate(expectedCutoff.getDate() - retentionDays);

          expect(Math.abs(cutoffDate.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
        }
      ));
    });
  });

  describe('User Location Query - GEO-QUE-001', () => {
    it('should retrieve user locations with default limit', async () => {
      // Arrange
      const userId = 'user-123';
      const mockLocations = [
        { id: '1', userId, latitude: 37.7749, longitude: -122.4194, timestamp: new Date() },
        { id: '2', userId, latitude: 37.7849, longitude: -122.4094, timestamp: new Date() }
      ];

      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockLocations)
      });

      // Act
      const result = await service.getUserLocations(userId);

      // Assert
      expect(result).toEqual(mockLocations);
      expect(mockStrapi.db.query().findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        limit: 100
      });
    });

    it('should respect custom limit parameter', async () => {
      // Arrange
      const userId = 'user-123';
      const customLimit = 50;

      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockResolvedValue([])
      });

      // Act
      await service.getUserLocations(userId, customLimit);

      // Assert
      expect(mockStrapi.db.query().findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        limit: customLimit
      });
    });
  });

  describe('Hub Management - GEO-HUB-001, GEO-HUB-002, GEO-HUB-003', () => {
    it('should create a new hub', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const hubName = 'Test Hub';
      const description = 'A test hub for testing';

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geolocation.hub') {
          return {
            create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data))
          };
        } else if (entity === 'plugin::geolocation.hub-user') {
          return {
            create: jest.fn().mockResolvedValue({})
          };
        }
        return {};
      });

      // Act
      const result = await service.createHub(adminUserId, hubName, description);

      // Assert
      expect(result.name).toBe(hubName);
      expect(result.description).toBe(description);
      expect(result.adminUserId).toBe(adminUserId);
      expect(result.isActive).toBe(true);
      expect(result.userCount).toBe(1);
      expect(result.id).toBeDefined();
    });

    it('should add users to hub successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const hubId = 'hub-456';

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geolocation.hub-user') {
          return {
            findOne: jest.fn().mockResolvedValue(null), // Not already a member
            create: jest.fn().mockResolvedValue({})
          };
        } else if (entity === 'plugin::geolocation.hub') {
          return {
            update: jest.fn().mockResolvedValue({})
          };
        }
        return {};
      });

      // Act
      const result = await service.joinHub(userId, hubId);

      // Assert
      expect(result).toBe(true);
      expect(mockStrapi.db.query('plugin::geolocation.hub-user').create).toHaveBeenCalled();
      expect(mockStrapi.db.query('plugin::geolocation.hub').update).toHaveBeenCalled();
    });

    it('should prevent duplicate hub memberships', async () => {
      // Arrange
      const userId = 'user-123';
      const hubId = 'hub-456';

      mockStrapi.db.query.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ id: 'existing-membership' })
      });

      // Act
      const result = await service.joinHub(userId, hubId);

      // Assert
      expect(result).toBe(false);
    });

    it('should remove users from hub', async () => {
      // Arrange
      const userId = 'user-123';
      const hubId = 'hub-456';

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geolocation.hub-user') {
          return {
            deleteMany: jest.fn().mockResolvedValue({ count: 1 })
          };
        } else if (entity === 'plugin::geolocation.hub') {
          return {
            update: jest.fn().mockResolvedValue({})
          };
        }
        return {};
      });

      // Act
      const result = await service.leaveHub(userId, hubId);

      // Assert
      expect(result).toBe(true);
      expect(mockStrapi.db.query('plugin::geolocation.hub').update).toHaveBeenCalledWith({
        where: { id: hubId },
        data: {
          userCount: { $dec: 1 }
        }
      });
    });

    it('should list hub users', async () => {
      // Arrange
      const hubId = 'hub-456';
      const mockHubUsers = [
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' }
      ];

      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockHubUsers)
      });

      // Act
      const result = await service.getHubUsers(hubId);

      // Assert
      expect(result).toEqual(['user-1', 'user-2', 'user-3']);
      expect(mockStrapi.db.query().findMany).toHaveBeenCalledWith({
        where: { hubId },
        select: ['userId']
      });
    });
  });

  describe('Validation - GEO-VAL-001', () => {
    it('should validate location data correctly', () => {
      // Valid cases
      const validCases = [
        { userId: 'user-123', latitude: 0, longitude: 0 },
        { userId: 'user-123', latitude: 90, longitude: 180 },
        { userId: 'user-123', latitude: -90, longitude: -180 },
        { userId: 'user-123', latitude: 37.7749, longitude: -122.4194, accuracy: 10 }
      ];

      validCases.forEach(locationData => {
        expect(() => service.validateLocationData(locationData)).not.toThrow();
      });
    });

    it('should reject invalid location data', () => {
      // Invalid cases
      const invalidCases = [
        { latitude: 37.7749, longitude: -122.4194 }, // Missing userId
        { userId: '', latitude: 37.7749, longitude: -122.4194 }, // Empty userId
        { userId: 'user-123', latitude: 91, longitude: 0 }, // Invalid latitude
        { userId: 'user-123', latitude: -91, longitude: 0 }, // Invalid latitude
        { userId: 'user-123', latitude: 0, longitude: 181 }, // Invalid longitude
        { userId: 'user-123', latitude: 0, longitude: -181 }, // Invalid longitude
        { userId: 'user-123', latitude: 0, longitude: 0, accuracy: -1 } // Negative accuracy
      ];

      invalidCases.forEach(locationData => {
        expect(() => service.validateLocationData(locationData)).toThrow();
      });
    });

    it('should validate coordinates using property-based testing', () => {
      // Property-based test for coordinate bounds
      fc.assert(fc.property(
        fc.record({
          userId: fc.string({ minLength: 1 }),
          latitude: fc.float(),
          longitude: fc.float(),
          accuracy: fc.option(fc.float())
        }),
        (locationData) => {
          const isLatValid = locationData.latitude >= -90 && locationData.latitude <= 90;
          const isLonValid = locationData.longitude >= -180 && locationData.longitude <= 180;
          const isAccValid = locationData.accuracy === undefined || locationData.accuracy >= 0;

          if (isLatValid && isLonValid && isAccValid) {
            expect(() => service.validateLocationData(locationData)).not.toThrow();
          } else {
            expect(() => service.validateLocationData(locationData)).toThrow();
          }
        }
      ));
    });
  });
});

describe('Geolocation Plugin - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Location Flow', () => {
    it('should handle complete location ingestion and retrieval flow', async () => {
      // Arrange
      const userId = 'integration-user';
      const locations = [
        { userId, latitude: 37.7749, longitude: -122.4194, timestamp: new Date() },
        { userId, latitude: 37.7849, longitude: -122.4094, timestamp: new Date() },
        { userId, latitude: 37.7949, longitude: -122.3994, timestamp: new Date() }
      ];

      const storedLocations: LocationData[] = [];

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geolocation.location') {
          return {
            create: jest.fn().mockImplementation(({ data }) => {
              const location = { ...data, id: `loc-${storedLocations.length}` };
              storedLocations.push(location);
              return Promise.resolve(location);
            }),
            findMany: jest.fn().mockImplementation(({ where }) => {
              return Promise.resolve(
                storedLocations.filter(loc => loc.userId === where.userId)
              );
            })
          };
        }
        return {};
      });

      // Act - Ingest locations
      for (const location of locations) {
        await service.ingestLocation(location);
      }

      // Retrieve locations
      const retrievedLocations = await service.getUserLocations(userId);

      // Assert
      expect(retrievedLocations).toHaveLength(3);
      expect(retrievedLocations.every(loc => loc.userId === userId)).toBe(true);
    });
  });

  describe('Hub Operations Integration', () => {
    it('should handle complete hub lifecycle', async () => {
      // Arrange
      const adminUserId = 'admin-user';
      const normalUserId = 'normal-user';
      const hubName = 'Integration Test Hub';

      const hubs: LocationHub[] = [];
      const hubUsers: Array<{ hubId: string; userId: string }> = [];

      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::geolocation.hub') {
          return {
            create: jest.fn().mockImplementation(({ data }) => {
              const hub = { ...data };
              hubs.push(hub);
              return Promise.resolve(hub);
            }),
            update: jest.fn().mockImplementation(({ where, data }) => {
              const hub = hubs.find(h => h.id === where.id);
              if (hub && data.userCount) {
                if (data.userCount.$inc) hub.userCount += data.userCount.$inc;
                if (data.userCount.$dec) hub.userCount -= data.userCount.$dec;
              }
              return Promise.resolve(hub);
            })
          };
        } else if (entity === 'plugin::geolocation.hub-user') {
          return {
            create: jest.fn().mockImplementation(({ data }) => {
              hubUsers.push(data);
              return Promise.resolve(data);
            }),
            findOne: jest.fn().mockImplementation(({ where }) => {
              const existing = hubUsers.find(
                hu => hu.hubId === where.hubId && hu.userId === where.userId
              );
              return Promise.resolve(existing || null);
            }),
            findMany: jest.fn().mockImplementation(({ where }) => {
              return Promise.resolve(
                hubUsers.filter(hu => hu.hubId === where.hubId)
              );
            }),
            deleteMany: jest.fn().mockImplementation(({ where }) => {
              const initialLength = hubUsers.length;
              const filtered = hubUsers.filter(
                hu => !(hu.hubId === where.hubId && hu.userId === where.userId)
              );
              hubUsers.length = 0;
              hubUsers.push(...filtered);
              return Promise.resolve({ count: initialLength - filtered.length });
            })
          };
        }
        return {};
      });

      // Act - Create hub
      const hub = await service.createHub(adminUserId, hubName);

      // Join hub
      const joinResult = await service.joinHub(normalUserId, hub.id);

      // Get hub users
      const users = await service.getHubUsers(hub.id);

      // Leave hub
      const leaveResult = await service.leaveHub(normalUserId, hub.id);

      // Get hub users after leaving
      const usersAfterLeave = await service.getHubUsers(hub.id);

      // Assert
      expect(hub.name).toBe(hubName);
      expect(hub.adminUserId).toBe(adminUserId);
      expect(joinResult).toBe(true);
      expect(users).toContain(normalUserId);
      expect(users).toContain(adminUserId);
      expect(leaveResult).toBe(true);
      expect(usersAfterLeave).not.toContain(normalUserId);
      expect(usersAfterLeave).toContain(adminUserId);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockStrapi.db.query.mockReturnValue({
        create: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      });

      const locationData = {
        userId: 'user-123',
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: new Date()
      };

      // Act & Assert
      await expect(service.ingestLocation(locationData)).rejects.toThrow('Database connection failed');
    });

    it('should handle concurrent operations safely', async () => {
      // Arrange
      const userId = 'concurrent-user';
      const locations = Array.from({ length: 50 }, (_, i) => ({
        userId,
        latitude: 37.7749 + (i * 0.001),
        longitude: -122.4194 + (i * 0.001),
        timestamp: new Date(Date.now() + i * 1000)
      }));

      let idCounter = 0;
      mockStrapi.db.query.mockReturnValue({
        create: jest.fn().mockImplementation(({ data }) => 
          Promise.resolve({ ...data, id: `loc-${++idCounter}` })
        )
      });

      // Act
      const promises = locations.map(loc => service.ingestLocation(loc));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(50);
      const uniqueIds = new Set(results.map(r => r.id));
      expect(uniqueIds.size).toBe(50); // All IDs should be unique
    });
  });
});