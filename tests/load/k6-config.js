/**
 * VaxTrace Nigeria - Load Testing Configuration
 * 
 * This file contains the configuration for k6 load testing.
 * It simulates multiple users to find the breaking point of the system.
 * 
 * Prerequisites:
 * - Install k6: https://k6.io/docs/getting-started/installation/
 * - Backend server running on http://localhost:8000
 * - Frontend server running on http://localhost:3000
 * 
 * Usage:
 * - Run all tests: npm run test:load
 * - Run specific test: k6 run tests/load/api-load-test.js
 * - Run with custom options: k6 run --vus 100 --duration 5m tests/load/api-load-test.js
 * 
 * @author VaxTrace Team
 * @version 1.0.0
 */

// ============================================
// BASE CONFIGURATION
// ============================================

export const options = {
  // Scenarios define the load patterns
  scenarios: {
    // Constant load scenario - steady traffic
    constant_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      gracefulStop: '30s',
      startTime: '0s',
    },
    
    // Ramp-up scenario - gradually increasing load
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up to 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '2m', target: 200 },  // Ramp up to 200 users
        { duration: '2m', target: 300 },  // Ramp up to 300 users
        { duration: '1m', target: 0 },    // Ramp down to 0
      ],
      gracefulRampDown: '30s',
      startTime: '2m',
    },
    
    // Stress test scenario - find breaking point
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 500,
      stages: [
        { duration: '2m', target: 50 },   // 50 requests per second
        { duration: '2m', target: 100 },  // 100 requests per second
        { duration: '2m', target: 200 },  // 200 requests per second
        { duration: '2m', target: 500 },  // 500 requests per second (stress)
        { duration: '1m', target: 0 },    // Ramp down
      ],
      startTime: '11m',
    },
    
    // Soak test scenario - sustained load
    soak_test: {
      executor: 'constant-vus',
      vus: 100,
      duration: '10m',
      gracefulStop: '30s',
      startTime: '22m',
    },
  },
  
  // Thresholds define pass/fail criteria
  thresholds: {
    // HTTP request duration
    http_req_duration: ['p(95)<500', 'p(99)<1000', 'avg<300'],
    
    // HTTP request failures
    http_req_failed: ['rate<0.01'], // Less than 1% failure rate
    
    // Response time for specific endpoints
    'http_req_duration{endpoint:health}': ['p(95)<100'],
    'http_req_duration{endpoint:login}': ['p(95)<500'],
    'http_req_duration{endpoint:stock}': ['p(95)<1000'],
    'http_req_duration{endpoint:alerts}': ['p(95)<800'],
    
    // Checks pass rate
    checks: ['rate>0.95'], // 95% of checks should pass
  },
};

// ============================================
// BASE URL CONFIGURATION
// ============================================

export const BASE_URL = __ENV.API_URL || 'http://localhost:8000';
export const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// ============================================
// TEST DATA
// ============================================

export const TEST_CREDENTIALS = {
  admin: {
    userId: 'VT-ADMIN-001',
    password: 'password123',
  },
  manager: {
    userId: 'VT-MGR-001',
    password: 'password123',
  },
  supervisor: {
    userId: 'VT-SUP-001',
    password: 'password123',
  },
  facility: {
    userId: 'VT-FAC-001',
    password: 'password123',
  },
};

export const TEST_ENDPOINTS = {
  health: '/health',
  login: '/api/auth/login',
  stock: '/api/stock',
  alerts: '/api/alerts',
  delivery: '/api/delivery/confirm',
  transferSuggestions: '/api/transfer-suggestions',
  predictiveInsights: '/api/predictive-insights',
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generates a random user ID for load testing
 */
export function generateRandomUserId() {
  return `VT-TEST-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

/**
 * Generates a random facility ID
 */
export function generateRandomFacilityId() {
  return `facility-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Generates a random QR code ID
 */
export function generateRandomQRCode() {
  return `QR-DEL-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
