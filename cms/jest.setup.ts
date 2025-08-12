// Global test setup
import { jest } from '@jest/globals';

// Mock Strapi instance for testing
global.strapi = {
  plugin: jest.fn(),
  service: jest.fn(),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  db: {
    query: jest.fn(),
    transaction: jest.fn()
  },
  config: {
    get: jest.fn()
  }
} as any;

// Increase timeout for integration tests
jest.setTimeout(30000);