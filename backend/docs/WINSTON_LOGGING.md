# Winston Structured Logging

This document describes the Winston structured logging setup for VaxTrace Nigeria backend.

## Overview

Winston is a versatile logging library for Node.js that provides support for multiple transports, log levels, and custom formatting. The VaxTrace backend uses Winston for structured logging with file rotation and correlation IDs.

## Features

- **Multiple Log Levels**: error, warn, info, http, debug, verbose, silly
- **Multiple Transports**: Console, file-based logging with rotation
- **Structured Logging**: JSON format for easy parsing and analysis
- **Correlation IDs**: Request tracking across microservices
- **HTTP Request Logging**: Automatic logging of all HTTP requests
- **Exception Handling**: Separate log files for exceptions and rejections
- **Log Rotation**: Automatic file rotation to prevent disk space issues

## Configuration

### Environment Variables

```env
# Log level (default: info in production, debug in development)
LOG_LEVEL=debug

# Node environment
NODE_ENV=development
```

### Log Files

Logs are stored in the `backend/logs/` directory:

- `error.log` - Error level logs
- `combined.log` - All logs (info level and above)
- `http.log` - HTTP request logs
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

### File Rotation

- **Max Size**: 10MB per file
- **Max Files**: 5 files per log type
- **Compression**: Enabled for rotated files

## Usage

### Basic Logging

```typescript
import { WinstonLogger } from './common/logger.service';

@Injectable()
export class MyService {
  private readonly logger = new WinstonLogger();

  myMethod() {
    this.logger.log('Info message', 'MyService');
    this.logger.error('Error message', 'stack trace', 'MyService');
    this.logger.warn('Warning message', 'MyService');
    this.logger.debug('Debug message', 'MyService');
  }
}
```

### Logging with Metadata

```typescript
this.logger.log('User logged in', 'AuthService', {
  userId: '123',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
});
```

### HTTP Request Logging

HTTP requests are automatically logged by the `LoggingInterceptor`:

```typescript
{
  "timestamp": "2026-02-19 16:00:00",
  "level": "http",
  "message": "GET /api/health",
  "http": {
    "method": "GET",
    "url": "/api/health",
    "statusCode": 200,
    "responseTime": 45
  },
  "requestId": "1234567890-abc123",
  "userId": "123",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "service": "vaxtrace-backend",
  "environment": "development"
}
```

### Setting Log Level Dynamically

```typescript
const logger = new WinstonLogger();
logger.setLevel(LogLevel.DEBUG);
```

### Creating Child Loggers

```typescript
const parentLogger = new WinstonLogger();
const childLogger = parentLogger.child({
  module: 'OpenLMIS',
  action: 'sync',
});
```

## Log Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `error` | Error conditions | Errors that require immediate attention |
| `warn` | Warning conditions | Potentially harmful situations |
| `info` | Informational messages | General informational messages |
| `http` | HTTP requests | HTTP request/response logging |
| `debug` | Debug messages | Detailed information for debugging |
| `verbose` | Verbose messages | Highly detailed information |
| `silly` | Silly messages | Extremely detailed information |

## Correlation IDs

Every HTTP request is assigned a unique correlation ID that is included in logs:

```typescript
// Correlation ID is automatically added to request
request.requestId = '1234567890-abc123';

// Included in response header
response.setHeader('x-request-id', requestId);
```

## Log Format

### Console Format (Development)

```
2026-02-19 16:00:00 [info] [Bootstrap] Starting VaxTrace Nigeria backend...
```

### File Format (Production)

```json
{
  "timestamp": "2026-02-19 16:00:00",
  "level": "info",
  "message": "Starting VaxTrace Nigeria backend...",
  "context": "Bootstrap",
  "service": "vaxtrace-backend",
  "environment": "development"
}
```

## Monitoring and Analysis

### Log Aggregation

For production, consider using log aggregation tools:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk**
- **Datadog**
- **CloudWatch**
- **Grafana Loki**

### Log Queries

Example queries for log analysis:

```bash
# Find all errors in the last hour
grep "error" logs/combined.log | grep "2026-02-19 1[5-9]:"

# Find slow HTTP requests (> 1s)
grep "responseTime" logs/http.log | jq 'select(.http.responseTime > 1000)'

# Find logs for a specific request ID
grep "requestId" logs/combined.log | grep "1234567890-abc123"
```

## Best Practices

1. **Use Appropriate Log Levels**: Choose the right log level for each message
2. **Include Context**: Always include relevant context (userId, requestId, etc.)
3. **Avoid Logging Sensitive Data**: Never log passwords, tokens, or PII
4. **Use Structured Data**: Log structured data instead of formatted strings
5. **Set Reasonable Log Levels**: Use `info` for production, `debug` for development
6. **Monitor Log Files**: Set up monitoring for log files to prevent disk space issues

## Troubleshooting

### Logs Not Appearing

1. Check log level: `LOG_LEVEL` environment variable
2. Check file permissions: Ensure the `logs/` directory is writable
3. Check disk space: Ensure sufficient disk space is available

### Performance Issues

1. Reduce log level in production
2. Use async logging for high-throughput scenarios
3. Consider log sampling for high-volume endpoints

## Related Files

- [`backend/src/common/logger.service.ts`](../src/common/logger.service.ts) - Winston logger service
- [`backend/src/common/logger.module.ts`](../src/common/logger.module.ts) - Winston logger module
- [`backend/src/common/logging.interceptor.ts`](../src/common/logging.interceptor.ts) - HTTP logging interceptor
- [`backend/src/main.ts`](../src/main.ts) - Application bootstrap with Winston integration
