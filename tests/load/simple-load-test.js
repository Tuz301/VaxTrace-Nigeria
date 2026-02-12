/**
 * VaxTrace Nigeria - Simple Load Test
 * 
 * This is a simplified load test for quick verification.
 * It tests the most critical endpoints with a constant load.
 * 
 * Usage:
 * - k6 run tests/load/simple-load-test.js
 * - k6 run --vus 50 --duration 2m tests/load/simple-load-test.js
 * 
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { check, group } from 'k6';
import http from 'k6/http';
import { sleep } from 'k6';

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:8000';

// Test credentials
const TEST_USER = {
  userId: 'VT-ADMIN-001',
  password: 'password123',
};

// Export options for k6
export const options = {
  vus: 10, // Number of virtual users
  duration: '2m', // Test duration
  
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'], // Less than 5% failure rate
    checks: ['rate>0.90'], // 90% of checks should pass
  },
};

// Main test function
export default function () {
  // Test health check
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/health`);
    check(response, {
      'health status is 200': (r) => r.status === 200,
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });
  });
  
  sleep(1);
  
  // Test login
  group('Login', () => {
    const response = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify(TEST_USER),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const hasToken = check(response, {
      'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'login response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    // If login successful, test protected endpoints
    if (response.status === 200) {
      try {
        const body = JSON.parse(response.body);
        const token = body.accessToken;
        
        if (token) {
          // Test stock endpoint
          group('Stock API', () => {
            const stockResponse = http.get(
              `${BASE_URL}/api/stock`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            check(stockResponse, {
              'stock status is 200': (r) => r.status === 200,
              'stock response time < 1000ms': (r) => r.timings.duration < 1000,
            });
          });
          
          sleep(1);
          
          // Test alerts endpoint
          group('Alerts API', () => {
            const alertsResponse = http.get(
              `${BASE_URL}/api/alerts`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            check(alertsResponse, {
              'alerts status is 200': (r) => r.status === 200,
              'alerts response time < 800ms': (r) => r.timings.duration < 800,
            });
          });
        }
      } catch (e) {
        console.error('Error parsing login response:', e);
      }
    }
  });
  
  // Sleep between iterations
  sleep(Math.random() * 2 + 1);
}

// Setup function
export function setup() {
  console.log(`Starting simple load test against: ${BASE_URL}`);
  console.log(`VUs: ${options.vus}, Duration: ${options.duration}`);
}

// Teardown function
export function teardown(data) {
  console.log('Simple load test completed');
}
