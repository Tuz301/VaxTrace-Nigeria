/**
 * VaxTrace Nigeria - Jest Test Setup
 * 
 * Global test configuration and setup for Jest.
 * Runs before each test suite.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
process.env.OPENLMIS_BASE_URL = 'http://test-openlmis.org';
process.env.OPENLMIS_CLIENT_ID = 'test-client';
process.env.OPENLMIS_CLIENT_SECRET = 'test-secret';
process.env.OPENLMIS_USERNAME = 'test-user';
process.env.OPENLMIS_PASSWORD = 'test-password';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging test failures
  error: console.error,
};

// Mock process.uptime for testing
(process as any).uptime = jest.fn(() => 3600);

// Increase timeout for database operations
jest.setTimeout(30000);
