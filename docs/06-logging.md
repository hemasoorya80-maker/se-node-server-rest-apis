# Lesson 6: Logging & Observability

## Learning Objectives

By the end of this lesson, you will understand:
1. Why console.log is bad for production
2. How structured logging helps debugging
3. How request tracing works
4. Best practices for log levels and messages

## The Problem: Debugging Production

### Scenario: "It works on my machine..."

A user reports: "I got an error when trying to reserve"

**Without good logs**:
```
[2024-01-31] Error: undefined is not a function
```

**With good logs**:
```json
{
  "timestamp": "2024-01-31T12:00:00.000Z",
  "level": "error",
  "requestId": "abc-123",
  "method": "POST",
  "path": "/api/v1/reserve",
  "userId": "user_1",
  "itemId": "item_1",
  "qty": 1,
  "error": "Reservation failed: OUT_OF_STOCK"
}
```

Which one helps you debug faster?

## The Solution: Structured Logging

### Key Idea: Machine-Readable Logs

Instead of:
```typescript
console.log(`User ${userId} reserved ${itemId}`);
```

Do this:
```typescript
logger.info({
  msg: 'Reservation created',
  requestId: req.requestId,
  userId,
  itemId,
  reservationId: res.id
});
```

### File: [`src/observability/index.ts`](../src/observability/index.ts)

```typescript
export const logger = pino({
  level: 'info',
  redact: ['req.headers.authorization'], // Hide secrets
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function logInfo(msg: string, context?: Record<string, unknown>) {
  logger.info({ ...context }, msg);
}
```

## Request Tracing

### Problem: Correlating Logs Across Services

User request flows through:
1. Load balancer
2. API server
3. Database
4. Cache
5. Payment gateway

How do you find all logs for a single request?

### Solution: Request ID

```typescript
export function requestIdMiddleware(req, res, next) {
  // Get or generate request ID
  const incomingId = req.headers['x-request-id'];
  req.requestId = incomingId || crypto.randomUUID();

  // Add to response header
  res.setHeader('x-request-id', req.requestId);

  // Add to logger context
  req.log = logger.child({ requestId: req.requestId });

  next();
}
```

### All Logs Include Request ID

```json
{
  "requestId": "abc-123",
  "msg": "Reservation created",
  ...
}
```

Now you can search logs for `"requestId": "abc-123"` and see the entire request journey!

## Log Levels

### When to Use Each Level

| Level | Usage | Example |
|-------|-------|---------|
| `trace` | Very detailed debugging | Function entry/exit |
| `debug` | Development info | Cache hits, query details |
| `info` | Normal operation | Request received, item reserved |
| `warn` | Unexpected but not critical | Retry attempted, high latency |
| `error` | Error that needs attention | Database connection failed |
| `fatal` | Application can't continue | Out of memory, can't connect to DB |

### File: [`src/observability/index.ts`](../src/observability/index.ts)

```typescript
logger.debug('Cache hit', { key: 'items' });
logger.info('Item reserved', { itemId: 'item_1', qty: 2 });
logger.warn('High latency', { durationMs: 5000 });
logger.error('Database error', error, { query: 'SELECT * FROM items' });
logger.fatal('Out of memory', { maxHeap: 1000000 });
```

## HTTP Request Logging

### Log Every Request

```typescript
export function requestLoggingMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;

    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
      requestId: req.requestId,
      userId: req.userId,
    }, `${req.method} ${req.path} ${res.statusCode}`);
  });

  next();
}
```

### Sample Log Output

```json
{
  "level": "info",
  "time": "2024-01-31T12:00:00.000Z",
  "requestId": "abc-123",
  "method": "POST",
  "path": "/api/v1/reserve",
  "status": 201,
  "durationMs": 45,
  "msg": "POST /api/v1/reserve 201"
}
```

## Structured vs Unstructured Logging

### ❌ Unstructured (console.log)

```
Server starting on port 3000
User user_1 reserved item_1
Database connected
User user_2 reserved item_2
Error: something failed
```

**Problems**:
- Can't search/filter easily
- No consistent format
- Missing context
- Hard to parse

### ✅ Structured (JSON)

```json
{"level":"info","time":"2024-01-31T12:00:00.000Z","msg":"Server started"}
{"level":"info","time":"2024-01-31T12:00:01.000Z","msg":"Item reserved","userId":"user_1","itemId":"item_1"}
{"level":"error","time":"2024-01-31T12:00:02.000Z","msg":"Reservation failed","error":"OUT_OF_STOCK"}
```

**Benefits**:
- Searchable (ELK, Splunk, CloudWatch)
- Filterable by level, requestId, userId
- Parseable by log aggregators
- Rich context

## What to Log

### ✅ DO Log

| Information | Example |
|--------------|---------|
| Request entry | `{ requestId, method, path }` |
| Errors with context | `{ error, stack, requestId, userId }` |
| Business events | `{ action: 'reserved', itemId, qty }` |
| Performance metrics | `{ durationMs, queryTime, cacheHit }` |
| State changes | `{ from: 'reserved', to: 'confirmed' }` |

### ❌ DON'T Log

| Information | Reason |
|--------------|--------|
| Passwords | Security risk |
| API keys | Security risk |
| Credit card numbers | Security risk (PCI compliance) |
| Full request body | Too large, may contain PII |
| Binary data | Not readable |

### Redaction

```typescript
const logger = pino({
  redact: [
    'req.headers.authorization',
    'req.body.password',
    'req.body.apiKey',
    'req.body.creditCard'
  ]
});
```

## Metrics Collection

### Track Important Events

```typescript
// Counters
incrementCounter('requests.reserve.success');
incrementCounter('requests.reserve.error');

// Histograms
recordHistogram('request.duration', durationMs);
recordHistogram('database.query.latency', queryTime);

// Gauges
setGauge('active.connections', db.getActiveConnections());
```

## Testing Logs

### Run the Server

```bash
npm run dev
```

### Make Requests

```bash
curl http://localhost:3000/api/v1/items
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_test","itemId":"item_1","qty":1}'
```

### Check Logs

Logs will appear in console with request IDs:

```json
{"level":"info","requestId":"req-abc","msg":"GET /api/v1/items 200","durationMs":12}
{"level":"info","requestId":"req-abc","msg":"Item reserved","itemId":"item_1"}
```

## Production Logging

### In Production, Use a Log Aggregator

1. **Collect** - Ship logs to central service
2. **Index** - Make logs searchable
3. **Visualize** - Dashboards and alerts

Popular options:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **CloudWatch** (AWS)
- **Splunk**
- **Datadog**
- **Google Cloud Logging**

### Configure Pino for Production

```typescript
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Don't use pretty print in production
  // Logs go to stdout, collected by container/runtime
});
```

## Real-World Debugging Story

### Issue: Intermittent failures

**Report**: "Some reservations fail with OUT_OF_STOCK even though items show in stock"

**With structured logs**:
```json
// Request 1
{"requestId":"abc","itemId":"item_1","available":3,"requested":2}
{"requestId":"abc","kind":"OUT_OF_STOCK"}  // Wait, what?

// Request 2 (10ms later)
{"requestId":"def","itemId":"item_1","available":3,"requested":2}
{"requestId":"def","kind":"OK"}  // This one worked!
```

**Root cause**: Race condition! Both requests saw availableQty=3 before either wrote.

**Solution**: See Lesson 3 on Concurrency

## In This Repository

| File | Purpose |
|------|---------|
| [`src/observability/index.ts`](../src/observability/index.ts) | Logging & metrics |
| [`src/server.ts`](../src/server.ts) | Middleware setup |
| [`src/middleware/security.ts`](../src/middleware/security.ts) | Security logging |

## Key Takeaways

1. **Structured logs** = Machine-readable JSON
2. **Request tracing** = requestId ties logs together
3. **Log levels** = Use appropriate severity
4. **No secrets** = Redact sensitive data
5. **Context matters** = Include userId, action, result

## Exercise

**Task**: Add custom logging

1. Add a log when a reservation expires
2. Include: reservationId, userId, how long it was held
3. Log at `warn` level (business event)
4. Test by waiting 10 minutes or manually expiring

## Summary: Complete Learning Path

Congratulations! You've completed all 6 lessons:

1. ✅ **Validation** - Never trust client input
2. ✅ **Concurrency** - Atomic operations prevent race conditions
3. ✅ **Idempotency** - Handle duplicate requests safely
4. ✅ **Caching** - Improve performance with TTL
5. ✅ **Logging** - Debug with structured logs and tracing

You're now ready to build production-ready REST APIs!

## What's Next?

- Explore the source code in `src/`
- Add new features to the API
- Implement the exercise in each lesson
- Deploy to production (AWS, Heroku, Railway)

---

**💡 Tip**: Good logs are the difference between "I have no idea what's wrong" and "I see the problem immediately!"
