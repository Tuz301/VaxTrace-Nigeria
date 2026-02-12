/**
 * VaxTrace Nigeria - API Load Test
 * 
 * This script tests the backend API endpoints under load.
 * It simulates multiple users accessing various endpoints.
 * 
 * Usage:
 * - k6 run tests/load/api-load-test.js
 * - k6 run --vus 100 --duration 5m tests/load/api-load-test.js
 * 
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { check, group } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';
import { sleep } from 'k6';

import {
  BASE_URL,
  TEST_CREDENTIALS,
  TEST_ENDPOINTS,
  generateRandomFacilityId,
  generateRandomQRCode,
} from './k6-config.js';

// ============================================
// CUSTOM METRICS
// ============================================

// Error rate by endpoint
const errorRate = new Rate('errors');

// Response time by endpoint
const loginResponseTime = new Rate('login_response_time_ok');
const stockResponseTime = new Rate('stock_response_time_ok');
const alertsResponseTime = new Rate('alerts_response_time_ok');
const deliveryResponseTime = new Rate('delivery_response_time_ok');

// ============================================
// TEST SCENARIOS
// ============================================

/**
 * Health check endpoint test
 */
export function testHealthCheck() {
  const response = http.get(`${BASE_URL}${TEST_ENDPOINTS.health}`, {
    tags: { endpoint: 'health' },
  });
  
  const isHealthy = check(response, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 100ms': (r) => r.timings.duration < 100,
    'health returns JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });
  
  errorRate.add(!isHealthy);
  
  return isHealthy;
}

/**
 * Login endpoint test
 */
export function testLogin() {
  const credentials = TEST_CREDENTIALS.admin;
  
  const response = http.post(
    `${BASE_URL}${TEST_ENDPOINTS.login}`,
    JSON.stringify({
      userId: credentials.userId,
      password: credentials.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login' },
    }
  );
  
  const isLoggedIn = check(response, {
    'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'login response time < 500ms': (r) => r.timings.duration < 500,
    'login returns JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });
  
  loginResponseTime.add(isLoggedIn);
  errorRate.add(!isLoggedIn);
  
  // Return token if login successful
  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      return body.accessToken || null;
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

/**
 * Stock endpoint test
 */
export function testStock(token) {
  const params = {
    headers: {},
    tags: { endpoint: 'stock' },
  };
  
  if (token) {
    params.headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = http.get(
    `${BASE_URL}${TEST_ENDPOINTS.stock}?facilityId=${generateRandomFacilityId()}`,
    params
  );
  
  const isOk = check(response, {
    'stock status is 200 or 401 or 404': (r) => [200, 401, 404].includes(r.status),
    'stock response time < 1000ms': (r) => r.timings.duration < 1000,
    'stock returns JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });
  
  stockResponseTime.add(isOk);
  errorRate.add(!isOk);
}

/**
 * Alerts endpoint test
 */
export function testAlerts(token) {
  const params = {
    headers: {},
    tags: { endpoint: 'alerts' },
  };
  
  if (token) {
    params.headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = http.get(
    `${BASE_URL}${TEST_ENDPOINTS.alerts}?active=true`,
    params
  );
  
  const isOk = check(response, {
    'alerts status is 200 or 401': (r) => [200, 401].includes(r.status),
    'alerts response time < 800ms': (r) => r.timings.duration < 800,
    'alerts returns JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });
  
  alertsResponseTime.add(isOk);
  errorRate.add(!isOk);
}

/**
 * Delivery confirmation endpoint test
 */
export function testDeliveryConfirmation(token) {
  const payload = {
    qrCodeId: generateRandomQRCode(),
    transferId: `transfer-${Math.floor(Math.random() * 10000)}`,
    vvmStage: Math.floor(Math.random() * 4) + 1,
    temperature: 4.5,
    timestamp: new Date().toISOString(),
    location: {
      lat: 9.0765,
      lng: 7.3986,
    },
  };
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'delivery' },
  };
  
  if (token) {
    params.headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = http.post(
    `${BASE_URL}${TEST_ENDPOINTS.delivery}`,
    JSON.stringify(payload),
    params
  );
  
  const isOk = check(response, {
    'delivery status is 200 or 201 or 401': (r) => [200, 201, 401].includes(r.status),
    'delivery response time < 1000ms': (r) => r.timings.duration < 1000,
    'delivery returns JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });
  
  deliveryResponseTime.add(isOk);
  errorRate.add(!isOk);
}

// ============================================
// MAIN TEST FUNCTION
// ============================================

export default function () {
  // Test health check (no auth required)
  group('Health Check', () => {
    testHealthCheck();
  });
  
  // Test authentication
  let authToken = null;
  group('Authentication', () => {
    authToken = testLogin();
  });
  
  // Test authenticated endpoints
  if (authToken) {
    group('Stock API', () => {
      testStock(authToken);
      sleep(1);
    });
    
    group('Alerts API', () => {
      testAlerts(authToken);
      sleep(1);
    });
    
    group('Delivery API', () => {
      testDeliveryConfirmation(authToken);
      sleep(1);
    });
  }
  
  // Random sleep between iterations (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

// ============================================
// SETUP FUNCTION
// ============================================

export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  console.log(`Test duration will be based on scenario configuration`);
  return {};
}

// ============================================
// TEARDOWN FUNCTION
// ============================================

export function teardown(data) {
  console.log('Load test completed');
  console.log('Check results in the k6 output for detailed metrics');
}
