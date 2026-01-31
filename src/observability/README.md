# Observability Module

## What This Module Teaches

This module demonstrates **structured logging**, **request tracing**, and **metrics collection** for production-grade observability.

## Key Concepts

### 1. Why Structured Logging?

**Unstructured logs** (hard to parse):
```
Server starting on port 3000
User user_1 reserved item_1
Error: something failed
```

**Structured logs** (machine-readable):
```json
{"level":"info","time":"2024-01-31T12:00:00.000Z","msg":"Server started"}
{"level":"info","time":"2024-01-31T12:00:01.000Z","msg":"Item reserved","userId":"user_1","itemId":"item_1"}
{"level":"error","time":"2024-01-31T12:00:02.000Z","msg":"Reservation failed","error":"OUT_OF_STOCK"}
```

### 2. Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| `trace` | Very detailed debugging | Function entry/exit |
| `debug` | Development info | Cache hits, query details |
| `info` | Normal operation | Request received, item reserved |
| `warn` | Unexpected but not critical | Retry attempted, high latency |
| `error` | Error that needs attention | Database connection failed |
| `fatal` | Application can't continue | Out of memory |

### 3. Request Tracing

Track a request across all logs using a **request ID**:

```json
{"requestId":"abc-123","msg":"GET /api/v1/items 200","durationMs":12}
{"requestId":"abc-123","msg":"Item reserved","itemId":"item_1"}
{"requestId":"abc-123","msg":"POST /api/v1/reserve 201","durationMs":45}
```

## Files in This Directory

### [`index.ts`](index.ts)

Logging and observability:
- **Pino logger** - High-performance JSON logging
- **Request ID middleware** - Distributed tracing
- **Request logging** - HTTP request tracking
- **Performance timers** - Measure execution time
- **Metrics collection** - Counters, gauges, histograms
- **Error tracking** - Monitor error occurrences

## Basic Logging

### Import Logger

```typescript
import { logger } from '../observability/index.js';
```

### Log Levels

```typescript
logger.trace('Very detailed debug info');
logger.debug('Cache hit', { key: 'items' });
logger.info('Item reserved', { itemId: 'item_1', qty: 2 });
logger.warn('High latency', { durationMs: 5000 });
logger.error('Database error', error, { query: 'SELECT * FROM items' });
logger.fatal('Out of memory', { maxHeap: 1000000 });
```

### Helper Functions

```typescript
import { logTrace, logDebug, logInfo, logWarn, logError, logFatal } from '../observability/index.js';

logInfo('Reservation created', { reservationId: 'res_123' });
logError('Failed to process', error, { userId: 'user_1' });
```

## Request Tracing

### Request ID Middleware

```typescript
import { requestIdMiddleware } from '../observability/index.js';

app.use(requestIdMiddleware);
```

**What it does**:
1. Checks for `x-request-id` header
2. Generates UUID if not present
3. Adds to response header
4. Creates child logger with request ID

### Use Request ID in Logs

```typescript
app.get('/items', (req, res) => {
  logger.info('Listing items', {
    requestId: req.requestId,
    userId: req.userId
  });

  return ok(res, items);
});
```

### All Logs Include Request ID

```json
{
  "level": "info",
  "time": "2024-01-31T12:00:00.000Z",
  "requestId": "abc-123",
  "msg": "GET /api/v1/items 200"
}
```

### Search Logs by Request ID

```bash
# Find all logs for a specific request
grep "abc-123" logs/app.log

# Or in ELK/Splunk
requestId: "abc-123"
```

## HTTP Request Logging

### Automatic Request Logging

```typescript
import { requestLoggingMiddleware } from '../observability/index.js';

app.use(requestLoggingMiddleware);
```

### Log Entry for Each Request

```json
{
  "level": "info",
  "time": "2024-01-31T12:00:00.000Z",
  "method": "POST",
  "path": "/api/v1/reserve",
  "status": 201,
  "durationMs": 45,
  "requestId": "abc-123",
  "userId": "user_1",
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "msg": "POST /api/v1/reserve 201 - 45ms"
}
```

### Log Level Based on Status

- 2xx → `info`
- 3xx → `info`
- 4xx → `warn`
- 5xx → `error`

## Performance Monitoring

### Time an Operation

```typescript
import { createTimer } from '../observability/index.js';

const timer = createTimer();

// ... do some work ...

const duration = timer.end();
logInfo('Operation completed', { duration });
```

### Measure Async Function

```typescript
import { measure } from '../observability/index.js';

const result = await measure(
  () => fetchFromDatabase(),
  'database query'
);
// Logs: "database query completed in 45ms"
```

### Track Duration

```typescript
const start = Date.now();

const items = listItems();

const duration = Date.now() - start;
logDebug('List items completed', {
  duration,
  itemCount: items.length
});
```

## Metrics Collection

### Counters

Count events:

```typescript
import { incrementCounter } from '../observability/index.js';

incrementCounter('requests.total');
incrementCounter('requests.reserve.success');
incrementCounter('requests.reserve.error');
```

### Gauges

Track current values:

```typescript
import { setGauge } from '../observability/index.js';

setGauge('active_connections', 42);
setGauge('memory_usage', process.memoryUsage().heapUsed);
setGauge('queue_size', queue.length);
```

### Histograms

Track distributions:

```typescript
import { recordHistogram } from '../observability/index.js';

recordHistogram('request_duration', 123);
recordHistogram('response_size', 4567);
```

### Get Statistics

```typescript
import { getMetrics, calculateHistogramStats } from '../observability/index.js';

const metrics = getMetrics();
// {
//   counters: { 'requests.total': 1523 },
//   gauges: { 'active_connections': 42 },
//   histograms: { 'request_duration': [12, 45, 67, 123, ...] }
// }

const stats = calculateHistogramStats(metrics.histograms['request_duration']);
// {
//   min: 5,
//   max: 5000,
//   avg: 123,
//   p50: 98,
//   p95: 450,
//   p99: 1200
// }
```

## Error Tracking

### Track Errors

```typescript
import { trackError } from '../observability/index.js';

trackError('OUT_OF_STOCK', 'Not enough items available');
trackError('VALIDATION_ERROR', 'Invalid email format');
```

### Get Error Statistics

```typescript
import { getErrorTracker } from '../observability/index.js';

const errors = getErrorTracker();
// {
//   'OUT_OF_STOCK': {
//     count: 152,
//     lastSeen: 1706716800000,
//     lastMessage: 'Not enough items available'
//   },
//   'VALIDATION_ERROR': {
//     count: 45,
//     lastSeen: 1706716750000,
//     lastMessage: 'Invalid email format'
//   }
// }
```

## Safe Logging

### Redact Sensitive Data

```typescript
const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization',  // Don't log auth tokens
      'req.headers.cookie',          // Don't log cookies
      'req.body.password',           // Don't log passwords
      'req.body.apiKey',             // Don't log API keys
      'req.body.creditCard'          // Don't log credit cards
    ],
    remove: true  // Replace with [Redacted]
  }
});
```

### What to Log

**✅ DO log**:
- Request IDs
- User IDs (not PII)
- Actions performed
- Error codes
- Performance metrics
- State changes

**❌ DON'T log**:
- Passwords
- API keys
- Credit card numbers
- Session tokens
- Full request bodies
- Personal data (addresses, SSN, etc.)

## Health Metrics

### Get Current Health

```typescript
import { getHealthMetrics } from '../observability/index.js';

const health = getHealthMetrics();
// {
//   uptime: 3600,
//   memory: { heapUsed: 12345678, ... },
//   cpu: { user: 1234567, system: 456789 },
//   metrics: { ... },
//   errors: { ... }
// }
```

### Use in Health Endpoint

```typescript
app.get('/health', (req, res) => {
  const health = getHealthMetrics();

  return ok(res, {
    status: 'healthy',
    uptime: health.uptime,
    memory: health.memory
  });
});
```

## Production Logging

### Log to stdout

```typescript
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // No pretty print in production
  // Logs collected by container/runtime
});
```

### Use Log Aggregator

Ship logs to central service:

1. **ELK Stack** (Elasticsearch, Logstash, Kibana)
2. **CloudWatch** (AWS)
3. **Splunk**
4. **Datadog**
5. **Google Cloud Logging**

### Configure Pino for Production

```typescript
const logger = pino({
  level: appConfig.LOG_LEVEL,
  // Redact sensitive fields
  redact: ['req.headers.authorization', 'req.body.password'],
  // ISO timestamps
  timestamp: pino.stdTimeFunctions.isoTime,
  // serializers for error/request handling
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
```

## Testing Logging

### Run Server and Watch Logs

```bash
npm run dev

# Make requests
curl http://localhost:3000/api/v1/items
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_1","itemId":"item_1","qty":1}'
```

### Check Logs for Request ID

```bash
# Request with specific ID
curl -H "X-Request-ID: my-test-123" http://localhost:3000/api/v1/items

# Look in logs for "my-test-123"
```

### View Metrics

```bash
# Check metrics endpoint
curl http://localhost:3000/health/metrics
```

## Related Files

- [`../server.ts`](../server.ts) - Logger setup and middleware
- [`../routes/index.ts`](../routes/index.ts) - Request logging usage
- [`../docs/06-logging.md`](../../docs/06-logging.md) - Full lesson on logging

## Best Practices

### ✅ DO

- Use structured logging (JSON)
- Include request IDs in all logs
- Use appropriate log levels
- Redact sensitive data
- Log performance metrics
- Track errors separately
- Use log aggregators in production

### ❌ DON'T

- Use console.log in production
- Log sensitive information
- Use wrong log levels
- Forget to log errors
- Log too verbosely in production
- Include full request bodies

---

**💡 Tip**: Good logs are the difference between "I have no idea what's wrong" and "I see the problem immediately"!
