# Protobuf API Content Negotiation

## Overview

This document describes the Protobuf API content negotiation implementation for VaxTrace Nigeria. The system automatically negotiates response formats (JSON or Protobuf) based on client `Accept` headers, providing significant bandwidth savings on 3G/4G networks.

## Architecture

### Backend Components

| Component | File | Purpose |
|-----------|------|---------|
| Content Negotiation Interceptor | [`backend/src/common/content-negotiation.interceptor.ts`](../backend/src/common/content-negotiation.interceptor.ts) | Intercepts requests and determines response format |
| Protobuf Response Transformer | [`backend/src/common/protobuf-response.transformer.ts`](../backend/src/common/protobuf-response.transformer.ts) | Handles actual Protobuf encoding |
| Content Negotiation Module | [`backend/src/common/content-negotiation.module.ts`](../backend/src/common/content-negotiation.module.ts) | Provides global access to content negotiation services |
| Protobuf Service | [`backend/src/modules/protobuf/protobuf.service.ts`](../backend/src/modules/protobuf/protobuf.service.ts) | Core Protobuf encoding/decoding service |

### Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| Protobuf Client | [`frontend/src/lib/protobuf-client.ts`](../frontend/src/lib/protobuf-client.ts) | Client-side utility for Protobuf requests |

## API Endpoints

All stock data endpoints support Protobuf content negotiation:

### GET /api/v1/openlmis/stock

Fetch stock data with optional filters.

**Request Headers:**
```
Accept: application/vnd.google.protobuf, application/json;q=0.9
```

**Response Headers (Protobuf):**
```
Content-Type: application/vnd.google.protobuf
X-Protobuf-Type: StockSnapshot
X-Protobuf-Size: 12345
X-Original-Size: 67890
X-Compression-Ratio: 81.82
X-Encoding-Time: 15
Vary: Accept
```

**Response Headers (JSON):**
```
Content-Type: application/json
X-Response-Size: 67890
Vary: Accept
```

### GET /api/v1/openlmis/stock/aggregated

Fetch aggregated stock data by state.

### GET /api/v1/openlmis/stock/national

Fetch national stock summary.

## Client Usage

### Using the Frontend Utility

```typescript
import { fetchStockData, useProtobufFetch } from '@/lib/protobuf-client';

// Direct function call
const stockData = await fetchStockData({
  stateId: 'AB',
  facilityId: 'FAC-001',
});

console.log(stockData.format); // 'protobuf' or 'json'
console.log(stockData.bandwidthSaved); // bytes saved
console.log(stockData.compressionRatio); // percentage

// Using React hook
function StockComponent() {
  const { fetchStockData, calculateSavingsStats } = useProtobufFetch();
  
  const loadData = async () => {
    const response = await fetchStockData({ stateId: 'AB' });
    const stats = calculateSavingsStats(response);
    
    console.log(`Saved ${stats?.bytesSaved} bytes (${stats?.percentSaved}%)`);
  };
}
```

### Using Fetch API Directly

```typescript
// Request Protobuf format
const response = await fetch('/api/v1/openlmis/stock', {
  headers: {
    'Accept': 'application/vnd.google.protobuf, application/json;q=0.9',
  },
});

// Check response format
const contentType = response.headers.get('Content-Type');
if (contentType?.includes('application/vnd.google.protobuf')) {
  // Handle Protobuf response
  const buffer = await response.arrayBuffer();
  // Decode using protobufjs or similar library
} else {
  // Handle JSON response
  const data = await response.json();
}
```

## Bandwidth Savings

### Typical Payload Sizes

| Endpoint | JSON Size | Protobuf Size | Savings |
|----------|-----------|---------------|---------|
| Stock (single facility) | 2.5 KB | 512 B | 80% |
| Stock (state-level) | 150 KB | 30 KB | 80% |
| Stock (national) | 500 KB | 100 KB | 80% |

### Network Performance

| Network Type | Speed | Time Saved (500 KB payload) |
|--------------|-------|------------------------------|
| 3G | 1.5 Mbps | 2.2 seconds |
| 4G | 10 Mbps | 0.33 seconds |
| 5G | 50 Mbps | 0.06 seconds |

## Implementation Details

### Content Negotiation Flow

```
┌─────────┐    Accept: application/vnd.google.protobuf    ┌──────────────┐
│ Client  │ ─────────────────────────────────────────────> │   Backend    │
└─────────┘                                                  └──────────────┘
      │                                                            │
      │                                                            │
      │  Content-Type: application/vnd.google.protobuf             │
      │  X-Protobuf-Type: StockSnapshot                           │
      │  X-Compression-Ratio: 80.00                               │
      │  <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
      │                                                            │
      │  Binary Protobuf Data (~80% smaller)                      │
      │<──────────────────────────────────────────────────────────│
```

### Server-Side Processing

1. **Request Interception**: [`ContentNegotiationInterceptor`](../backend/src/common/content-negotiation.interceptor.ts) intercepts the request
2. **Format Detection**: Parses `Accept` header to determine client preference
3. **Response Encoding**: If Protobuf requested, [`ProtobufResponseTransformer`](../backend/src/common/protobuf-response.transformer.ts) encodes the data
4. **Metadata Headers**: Adds compression statistics to response headers
5. **Fallback**: If encoding fails, automatically falls back to JSON

### Client-Side Processing

1. **Request Preparation**: Sets appropriate `Accept` header
2. **Network Detection**: Uses Network Information API to detect connection quality
3. **Automatic Fallback**: If Protobuf decoding fails, requests JSON format
4. **Statistics Tracking**: Logs bandwidth savings for monitoring

## Configuration

### Environment Variables

```bash
# .env
# Enable/disable Protobuf support (default: true)
PROTOBUF_ENABLED=true

# Minimum network quality for Protobuf (slow-2g, 2g, 3g, 4g)
PROTOBUF_MIN_NETWORK_QUALITY=3g

# Compression threshold (bytes)
PROTOBUF_COMPRESSION_THRESHOLD=1024
```

### Backend Configuration

The content negotiation module is globally available. To add Protobuf support to a new endpoint:

```typescript
import { UseInterceptors } from '@nestjs/common';
import { ContentNegotiationInterceptor, ProtobufResponse } from '@/common/content-negotiation.interceptor';

@Controller('api/v1/resource')
export class ResourceController {
  @Get()
  @UseInterceptors(ContentNegotiationInterceptor)
  @ProtobufResponse({ typeName: 'ResourceType' })
  async getResources() {
    return this.resourceService.findAll();
  }
}
```

## Monitoring

### Response Headers

All responses include metadata headers for monitoring:

- `X-Protobuf-Type`: Protobuf message type name
- `X-Protobuf-Size`: Encoded payload size in bytes
- `X-Original-Size`: Original JSON size in bytes
- `X-Compression-Ratio`: Percentage of size reduction
- `X-Encoding-Time`: Server-side encoding time in milliseconds

### Logging

The system logs encoding statistics:

```
[PROTOBUF-ENCODING] StockSnapshotCollection (150 items): 150000B -> 30000B (80.0% reduction) in 45ms
```

## Troubleshooting

### Client receives JSON instead of Protobuf

**Possible causes:**
1. `Accept` header not set correctly
2. Server-side encoding failed (check logs)
3. Protobuf schema not loaded

**Solution:**
```typescript
// Ensure Accept header is set
const response = await fetch('/api/endpoint', {
  headers: {
    'Accept': 'application/vnd.google.protobuf',
  },
});
```

### Decoding errors on client

**Possible causes:**
1. Protobuf schema mismatch between client and server
2. Corrupted response data

**Solution:**
```typescript
// Add error handling and fallback
try {
  const data = await decodeProtobuf(buffer);
} catch (error) {
  console.error('Protobuf decode failed, requesting JSON');
  const response = await fetch('/api/endpoint', {
    headers: { 'Accept': 'application/json' },
  });
  const data = await response.json();
}
```

## Future Enhancements

1. **gRPC Integration**: Full gRPC support for streaming updates
2. **WebAssembly Decoding**: Use WASM for faster client-side decoding
3. **Delta Encoding**: Send only changed fields for updates
4. **Compression**: Add gzip/brotli compression on top of Protobuf

## References

- [Protocol Buffers Documentation](https://developers.google.com/protocol-buffers)
- [HTTP Content Negotiation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Content_negotiation)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation)
