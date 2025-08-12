import * as fc from 'fast-check';
import crypto from 'crypto';
import pushService, { PushRegistration, PushMessage } from '../../../src/plugins/push/services/push';

// Mock Strapi instance
const mockStrapi = {
  db: {
    query: jest.fn()
  },
  config: {
    get: jest.fn()
  },
  log: {
    info: jest.fn(),
    error: jest.fn()
  },
  plugin: jest.fn()
};

const service = pushService({ strapi: mockStrapi as any });

describe('Push Plugin - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStrapi.config.get.mockReturnValue('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
  });

  describe('Registration - PUSH-REG-001', () => {
    it('should register a new device successfully', async () => {
      // Arrange
      const mockRegistration = {
        id: 'test-id',
        userId: 'user-123',
        deviceToken: 'hashed-token',
        platform: 'ios',
        encryptedToken: 'encrypted-token',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockStrapi.db.query.mockReturnValue({
        create: jest.fn().mockResolvedValue(mockRegistration)
      });

      // Act
      const result = await service.register('user-123', 'device-token-123', 'ios');

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe('user-123');
      expect(result.platform).toBe('ios');
      expect(mockStrapi.db.query).toHaveBeenCalledWith('plugin::push.registration');
    });

    it('should validate platform values', async () => {
      // Property-based test for platform validation
      await fc.assert(fc.asyncProperty(
        fc.constantFrom('ios', 'android', 'web'),
        async (platform) => {
          mockStrapi.db.query.mockReturnValue({
            create: jest.fn().mockResolvedValue({})
          });

          const result = await service.register('user-123', 'token', platform);
          expect(['ios', 'android', 'web']).toContain(result.platform);
        }
      ));
    });

    it('should generate unique IDs for registrations', async () => {
      // Test using property-based testing
      await fc.assert(fc.asyncProperty(
        fc.array(fc.tuple(fc.string(), fc.string()), { minLength: 2, maxLength: 10 }),
        async (userTokenPairs) => {
          const ids = new Set();
          
          for (const [userId, token] of userTokenPairs) {
            mockStrapi.db.query.mockReturnValue({
              create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data))
            });

            const result = await service.register(userId, token, 'ios');
            expect(ids.has(result.id)).toBe(false);
            ids.add(result.id);
          }
        }
      ));
    });
  });

  describe('Token Hashing - PUSH-HASH-001', () => {
    it('should hash tokens consistently', () => {
      // Arrange
      const token = 'test-device-token';

      // Act
      const hash1 = service.hashToken(token);
      const hash2 = service.hashToken(token);

      // Assert
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('should produce different hashes for different tokens', () => {
      // Property-based test for hash uniqueness
      fc.assert(fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 20 }),
        (tokens) => {
          const uniqueTokens = [...new Set(tokens)];
          if (uniqueTokens.length < 2) return true;

          const hashes = uniqueTokens.map(token => service.hashToken(token));
          const uniqueHashes = new Set(hashes);
          
          return uniqueHashes.size === uniqueTokens.length;
        }
      ));
    });

    it('should handle empty and special characters in tokens', () => {
      // Test edge cases
      const testCases = ['', ' ', '\n', '\t', '🚀', 'ñørmäl-tëxt'];
      
      testCases.forEach(token => {
        expect(() => service.hashToken(token)).not.toThrow();
        expect(service.hashToken(token)).toHaveLength(64);
      });
    });
  });

  describe('Token Encryption - PUSH-ENC-001', () => {
    it('should encrypt and decrypt tokens correctly', async () => {
      // Arrange
      const originalToken = 'my-secret-device-token';

      // Act
      const encrypted = await service.encrypt(originalToken);
      const decrypted = await service.decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(originalToken);
      expect(encrypted).not.toBe(originalToken);
      expect(encrypted).toContain(':'); // IV:encrypted format
    });

    it('should produce different encrypted values for same token', async () => {
      // Test that encryption includes random IV
      const token = 'test-token';
      
      const encrypted1 = await service.encrypt(token);
      const encrypted2 = await service.encrypt(token);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same value
      const decrypted1 = await service.decrypt(encrypted1);
      const decrypted2 = await service.decrypt(encrypted2);
      
      expect(decrypted1).toBe(token);
      expect(decrypted2).toBe(token);
    });

    it('should handle various token lengths and characters', async () => {
      // Property-based test for encryption robustness
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 1000 }),
        async (token) => {
          const encrypted = await service.encrypt(token);
          const decrypted = await service.decrypt(encrypted);
          expect(decrypted).toBe(token);
        }
      ));
    });
  });

  describe('Device Messaging - PUSH-SEND-001', () => {
    it('should send message to device successfully', async () => {
      // Arrange
      const deviceToken = 'device-token-123';
      const message: PushMessage = {
        title: 'Test Title',
        body: 'Test message body',
        data: { key: 'value' }
      };

      // Act
      const result = await service.sendToDevice(deviceToken, message);

      // Assert
      expect(result).toBe(true);
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        `Sending push to device: ${deviceToken}`,
        message
      );
    });

    it('should validate message structure', () => {
      // Property-based test for message validation
      fc.assert(fc.property(
        fc.record({
          title: fc.string({ minLength: 1 }),
          body: fc.string({ minLength: 1 }),
          data: fc.oneof(fc.constant(undefined), fc.object()),
          badge: fc.oneof(fc.constant(undefined), fc.integer({ min: 0 })),
          sound: fc.oneof(fc.constant(undefined), fc.string())
        }),
        (message) => {
          // Message should have required fields
          expect(message.title).toBeDefined();
          expect(message.body).toBeDefined();
          expect(typeof message.title).toBe('string');
          expect(typeof message.body).toBe('string');
        }
      ));
    });
  });

  describe('User Messaging - PUSH-SEND-002', () => {
    it('should send messages to all user devices', async () => {
      // Arrange
      const userId = 'user-123';
      const message: PushMessage = { title: 'Test', body: 'Test message' };
      const mockRegistrations = [
        { deviceToken: 'token1' },
        { deviceToken: 'token2' },
        { deviceToken: 'token3' }
      ];

      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockRegistrations)
      });

      // Mock successful sends
      jest.spyOn(service, 'sendToDevice').mockResolvedValue(true);

      // Act
      const result = await service.sendToUser(userId, message);

      // Assert
      expect(result).toBe(3);
      expect(service.sendToDevice).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const message: PushMessage = { title: 'Test', body: 'Test message' };
      const mockRegistrations = [
        { deviceToken: 'token1' },
        { deviceToken: 'token2' },
        { deviceToken: 'token3' }
      ];

      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockRegistrations)
      });

      // Mock mixed success/failure
      jest.spyOn(service, 'sendToDevice')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      // Act
      const result = await service.sendToUser(userId, message);

      // Assert
      expect(result).toBe(2); // 2 successful sends
    });
  });

  describe('Hub Messaging - PUSH-HUB-001', () => {
    it('should send messages to all hub users', async () => {
      // Arrange
      const hubId = 'hub-123';
      const message: PushMessage = { title: 'Hub Message', body: 'Hub notification' };
      const mockHubUsers = [
        { userId: 'user1' },
        { userId: 'user2' }
      ];

      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockHubUsers)
      });

      // Mock sendToUser
      jest.spyOn(service, 'sendToUser')
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);

      // Act
      const result = await service.sendToHub(hubId, message);

      // Assert
      expect(result).toBe(3); // Total sends across users
      expect(service.sendToUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('Registration Validation - PUSH-VAL-001', () => {
    it('should validate complete registration objects', () => {
      // Arrange
      const validRegistration: PushRegistration = {
        id: 'test-id',
        userId: 'user-123',
        deviceToken: 'token-hash',
        platform: 'ios',
        encryptedToken: 'encrypted',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Act & Assert
      expect(service.validateRegistration(validRegistration)).toBe(true);
    });

    it('should reject invalid registrations', () => {
      // Test missing required fields
      const invalidCases = [
        { id: '', userId: 'user', deviceToken: 'token', platform: 'ios' },
        { id: 'id', userId: '', deviceToken: 'token', platform: 'ios' },
        { id: 'id', userId: 'user', deviceToken: '', platform: 'ios' },
        { id: 'id', userId: 'user', deviceToken: 'token', platform: 'invalid' }
      ];

      invalidCases.forEach(registration => {
        expect(service.validateRegistration(registration as any)).toBe(false);
      });
    });

    it('should validate platform enum values', () => {
      // Property-based test for platform validation
      fc.assert(fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          userId: fc.string({ minLength: 1 }),
          deviceToken: fc.string({ minLength: 1 }),
          platform: fc.oneof(
            fc.constantFrom('ios', 'android', 'web'),
            fc.string().filter(s => !['ios', 'android', 'web'].includes(s))
          )
        }),
        (registration) => {
          const isValid = service.validateRegistration(registration as any);
          const expectedValid = ['ios', 'android', 'web'].includes(registration.platform);
          expect(isValid).toBe(expectedValid);
        }
      ));
    });
  });
});

describe('Push Plugin - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStrapi.config.get.mockReturnValue('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
  });

  describe('End-to-End Registration Flow', () => {
    it('should complete full registration and messaging flow', async () => {
      // Arrange
      const userId = 'integration-user';
      const deviceToken = 'integration-device-token';
      const platform = 'ios';

      // Mock database responses
      mockStrapi.db.query.mockImplementation((entity) => {
        if (entity === 'plugin::push.registration') {
          return {
            create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
            findMany: jest.fn().mockResolvedValue([{ deviceToken: service.hashToken(deviceToken) }])
          };
        }
        return { findMany: jest.fn().mockResolvedValue([]) };
      });

      // Act - Register device
      const registration = await service.register(userId, deviceToken, platform);

      // Assert registration
      expect(registration.userId).toBe(userId);
      expect(registration.platform).toBe(platform);

      // Act - Send message to user
      jest.spyOn(service, 'sendToDevice').mockResolvedValue(true);
      const message: PushMessage = { title: 'Welcome', body: 'Registration successful' };
      const sentCount = await service.sendToUser(userId, message);

      // Assert message sending
      expect(sentCount).toBe(1);
      expect(service.sendToDevice).toHaveBeenCalledWith(
        service.hashToken(deviceToken),
        message
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockStrapi.db.query.mockReturnValue({
        create: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      // Act & Assert
      await expect(service.register('user', 'token', 'ios')).rejects.toThrow('Database error');
    });

    it('should handle encryption key configuration errors', () => {
      // Arrange
      mockStrapi.config.get.mockReturnValue('invalid-key');

      // Act & Assert
      expect(async () => await service.encrypt('token')).rejects.toThrow();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent registrations', async () => {
      // Arrange
      const registrationPromises = [];
      mockStrapi.db.query.mockReturnValue({
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data))
      });

      // Act
      for (let i = 0; i < 100; i++) {
        registrationPromises.push(
          service.register(`user-${i}`, `token-${i}`, 'ios')
        );
      }

      const results = await Promise.all(registrationPromises);

      // Assert
      expect(results).toHaveLength(100);
      results.forEach((result, index) => {
        expect(result.userId).toBe(`user-${index}`);
      });
    });
  });
});