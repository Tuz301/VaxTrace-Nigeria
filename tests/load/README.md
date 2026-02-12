# VaxTrace Nigeria - Load Testing Guide

This directory contains load testing scripts for the VaxTrace application using [k6](https://k6.io/).

## Prerequisites

1. **Install k6**:
   - **Windows**: `choco install k6`
   - **macOS**: `brew install k6`
   - **Linux**: `sudo apt-get install k6` or download from https://k6.io/

2. **Start the application**:
   ```bash
   npm run dev
   ```

3. **Verify servers are running**:
   - Backend: http://localhost:8000/health
   - Frontend: http://localhost:3000

## Test Files

| File | Description |
|------|-------------|
| [`k6-config.js`](./k6-config.js) | Configuration and utility functions |
| [`simple-load-test.js`](./simple-load-test.js) | Quick verification test |
| [`api-load-test.js`](./api-load-test.js) | Comprehensive API load test |

## Running Tests

### Quick Test (Simple Load Test)

Run a quick 2-minute test with 10 virtual users:

```bash
npm run test:load:simple
```

Or with custom parameters:

```bash
k6 run --vus 50 --duration 2m tests/load/simple-load-test.js
```

### Full Load Test

Run the comprehensive load test with multiple scenarios:

```bash
npm run test:load
```

### Stress Test

Find the breaking point with 500 concurrent users:

```bash
npm run test:load:stress
```

### Soak Test

Test system stability over 15 minutes with 100 users:

```bash
npm run test:load:soak
```

## Test Scenarios

### 1. Constant Load
- Steady traffic with 10 virtual users
- Duration: 2 minutes
- Purpose: Baseline performance measurement

### 2. Ramp-Up
- Gradually increase from 0 to 300 users
- Duration: 9 minutes
- Purpose: Find performance degradation points

### 3. Stress Test
- Ramp up to 500 requests per second
- Purpose: Find the breaking point

### 4. Soak Test
- Sustained load of 100 users for 10 minutes
- Purpose: Detect memory leaks and connection issues

## Test Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check (no auth) |
| `/api/auth/login` | POST | User authentication |
| `/api/stock` | GET | Stock data (requires auth) |
| `/api/alerts` | GET | Alerts data (requires auth) |
| `/api/delivery/confirm` | POST | Delivery confirmation (requires auth) |

## Metrics and Thresholds

### Response Time Thresholds
- **p(95) < 500ms**: 95% of requests should complete within 500ms
- **p(99) < 1000ms**: 99% of requests should complete within 1 second
- **Average < 300ms**: Average response time should be under 300ms

### Error Rate Thresholds
- **< 1%**: Less than 1% of requests should fail
- **Checks > 95%**: 95% of validation checks should pass

### Endpoint-Specific Thresholds
- Health check: p(95) < 100ms
- Login: p(95) < 500ms
- Stock: p(95) < 1000ms
- Alerts: p(95) < 800ms

## Interpreting Results

### Key Metrics

1. **http_req_duration**: Request response time
2. **http_req_failed**: Failed request rate
3. **checks**: Validation check pass rate
4. **vus**: Active virtual users
5. **rps**: Requests per second

### Example Output

```
✓ health status is 200
✓ login status is 200 or 401
✓ stock status is 200 or 401 or 404

checks.........................: 95.00% ✓ 9500  ✗ 500
http_req_duration..............: avg=250ms min=10ms med=200ms max=1500ms p(95)=450ms p(99)=800ms
http_req_failed................: 0.50%   ✓ 9950  ✗ 50
```

## Troubleshooting

### High Failure Rate

If you see high failure rates:
1. Check if the backend server is running
2. Verify database connections
3. Check for memory issues
4. Review server logs

### Slow Response Times

If response times are slow:
1. Check database query performance
2. Verify Redis cache is working
3. Check for network latency
4. Review server CPU/memory usage

### Connection Errors

If you see connection errors:
1. Verify the API URL is correct
2. Check firewall settings
3. Ensure ports are not blocked
4. Review rate limiting settings

## Customization

### Change Target URL

```bash
API_URL=https://api.example.com k6 run tests/load/simple-load-test.js
```

### Modify Test Data

Edit [`k6-config.js`](./k6-config.js) to change:
- Test credentials
- Test endpoints
- Test data generators

### Adjust Scenarios

Edit [`k6-config.js`](./k6-config.js) to modify:
- Virtual user counts
- Test durations
- Ramp-up patterns

## Best Practices

1. **Run tests during off-peak hours** to avoid affecting production
2. **Start with simple tests** before running stress tests
3. **Monitor system resources** during tests (CPU, memory, disk I/O)
4. **Review logs** after each test to identify issues
5. **Baseline first** - establish a baseline before making changes
6. **Test incrementally** - gradually increase load to find breaking points
7. **Document results** - keep track of test results for comparison

## CI/CD Integration

Add load testing to your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Load Tests
  run: |
    npm run test:load:simple
  env:
    API_URL: http://localhost:8000
```

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [Load Testing Best Practices](https://k6.io/docs/test-guides/test-execution/)
- [Performance Testing Guide](https://k6.io/docs/test-guides/performance-testing/)

## Support

For issues or questions:
- Check the [k6 troubleshooting guide](https://k6.io/docs/misc/troubleshooting/)
- Review server logs in the backend directory
- Open an issue in the project repository
