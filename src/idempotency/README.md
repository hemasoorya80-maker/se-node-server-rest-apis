# Idempotency Module

## What This Module Teaches

This module demonstrates **idempotency** - making operations safe to retry without side effects. This is critical for handling network failures, retries, and duplicate requests.

## Key Concepts

### 1. What is Idempotency?

An operation is **idempotent** if making the same request multiple times has the same effect as making it once.

**Idempotent operations**:
- `x = 5` (setting x to 5 always gives same result)
- `DELETE /items/123` (deleting twice = already deleted)

**Non-idempotent operations**:
- `x++` (incrementing changes state each time)
- `POST /reserve` (creates new reservation each time)

### 2. The Problem: Duplicate Requests

Network issues cause duplicates:

```
Client → Server: POST /reserve
Timeout... (no response)
Client → Server: POST /reserve (retry)
Both requests succeed!
```

**Result**: User gets charged twice, double reservations created.

### 3. The Solution: Idempotency Keys

```
First Request:
POST /reserve
Idempotency-Key: abc-123
→ Process request
→ Store response with key "abc-123"
→ Return response

Second Request (same key):
POST /reserve
Idempotency-Key: abc-123
→ Look up stored response
→ Return cached response (skip processing)
```

## Files in This Directory

### [`index.ts`](index.ts)

Idempotency implementation:
- **Key validation** - Check key format
- **Response storage** - Store successful responses
- **Response lookup** - Find cached responses
- **Middleware** - Automatic response caching
- **Cleanup** - Expire old keys

## How It Works

### 1. Client Provides Key

```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Idempotency-Key: my-unique-key-123" \
  -d '{"userId":"user_1","itemId":"item_1","qty":2}'
```

### 2. Server Checks for Cached Response

```typescript
const previous = findStoredResponse(key, route, userId);

if (previous) {
  // Return cached response immediately
  return res.status(previous.status).json(previous.body);
}
```

### 3. Server Processes and Stores Response

```typescript
// Process request...
const result = reserveItem(requestBody);

// Store response for future requests
storeResponse(key, route, userId, 201, {
  ok: true,
  data: result.reservation
});
```

### 4. Second Request Returns Cached Response

```bash
# Same key - returns cached response
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Idempotency-Key: my-unique-key-123" \
  -d '{"userId":"user_1","itemId":"item_1","qty":2}'

# Returns same reservation ID as first request
```

## Idempotency Key Design

### ✅ Good Keys

```typescript
// UUID v4 (recommended)
"550e8400-e29b-41d4-a716-446655440000"

// Client-generated with context
"user_123-reserve-item_456-1706720400"

// ULID (time-ordered)
"01ARZ3NDEKTSV4RRFFQ69G5FAV"
```

### ❌ Bad Keys

```typescript
// Too short (likely to collide)
"abc"

// Not unique per request
"user_123"  // Same key for all user's requests

// Predictable (security risk)
"timestamp-123"
```

### Validation Rules

```typescript
export function isValidIdempotencyKey(key: string): boolean {
  // Minimum 8 characters
  if (key.length < 8) return false;

  // Maximum 255 characters
  if (key.length > 255) return false;

  // URL-safe characters only
  return /^[a-zA-Z0-9\-_]+$/.test(key);
}
```

## Middleware Implementation

The middleware automatically handles idempotency:

```typescript
export function idempotencyMiddleware(route: string) {
  return (req, res, next) => {
    const key = getIdempotencyKey(req);
    const userId = req.body.userId;

    // No key? Proceed normally
    if (!key) return next();

    // Invalid key? Return error
    if (!isValidIdempotencyKey(key)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_IDEMPOTENCY_KEY',
          message: 'Invalid key format'
        }
      });
    }

    // Check for cached response
    const previous = findStoredResponse(key, route, userId);
    if (previous) {
      return res.status(previous.status).json(previous.body);
    }

    // Hook into response to store successful responses
    const originalJson = res.json.bind(res);
    res.json = function(body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        storeResponse(key, route, userId, res.statusCode, body);
      }
      return originalJson(body);
    };

    next();
  };
}
```

### Usage in Routes

```typescript
app.post('/reserve',
  idempotencyMiddleware('/reserve'),
  validateBody(reserveSchema),
  async (req, res) => {
    const result = reserveItem(req.body);
    return created(res, result.reservation);
    // Response is automatically stored!
  }
);
```

## Key Uniqueness Scope

Keys are unique per **user + route**:

```typescript
// Primary key: (key, route, userId)
PRIMARY KEY (key, route, userId)
```

This means:
- Same user can use same key for different routes
- Different users can use same key
- Same user cannot reuse key on same route

## Expiration Strategy

Keys expire after 24 hours:

```typescript
export function findStoredResponse(key, route, userId) {
  const stored = getFromDatabase(key, route, userId);

  // Check if expired
  const age = Date.now() - stored.createdAt;
  if (age > stored.ttl) {
    deleteIdempotencyKey(key, route, userId);
    return null;  // Key expired, process request
  }

  return stored;
}
```

### Why Expire?

1. **Storage** - Don't store infinite keys
2. **Freshness** - Old keys may not be relevant
3. **Privacy** - Don't keep response data forever

## When to Use Idempotency

### ✅ Use For

- **Mutation operations** (POST, PUT, PATCH)
- **Payment processing**
- **Inventory allocation**
- **Any operation with side effects**

### ❌ Don't Need For

- **GET requests** (already idempotent)
- **Idempotent operations** (setting a value)
- **Pure queries** (no side effects)

## Testing Idempotency

### Test 1: First Request Creates Reservation

```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Idempotency-Key: test-key-001" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_test","itemId":"item_1","qty":1}'
```

Response:
```json
{
  "ok": true,
  "data": {
    "id": "res_abc123",
    "status": "reserved"
  }
}
```

### Test 2: Second Request Returns Same Response

```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Idempotency-Key: test-key-001" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_test","itemId":"item_1","qty":1}'
```

Response: (same ID!)
```json
{
  "ok": true,
  "data": {
    "id": "res_abc123",  // Same ID as first request
    "status": "reserved"
  }
}
```

### Test 3: Different Key Creates New Reservation

```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Idempotency-Key: test-key-002" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_test","itemId":"item_1","qty":1}'
```

Response: (new ID!)
```json
{
  "ok": true,
  "data": {
    "id": "res_def456",  // Different ID
    "status": "reserved"
  }
}
```

## Cleanup Operations

### Periodic Cleanup

Run periodically to remove old keys:

```typescript
// Run daily
const deleted = cleanExpiredKeys(24 * 60 * 60 * 1000);
console.log(`Cleaned ${deleted} expired keys`);
```

### Manual Cleanup

```bash
# Via API endpoint
curl -X POST http://localhost:3000/api/v1/idempotency/cleanup

# Or directly in database
sqlite3 app.db "DELETE FROM idempotency_keys WHERE createdAt < $(date +%s000);"
```

## Statistics

Monitor idempotency usage:

```typescript
const stats = getIdempotencyStats();
// {
//   totalKeys: 1523,
//   keysByRoute: {
//     '/reserve': 1200,
//     '/confirm': 300,
//     '/cancel': 23
//   },
//   oldestKey: 1706630400000,
//   newestKey: 1706716800000
// }
```

## Common Pitfalls

### ❌ DON'T: Use Same Key for Different Data

```typescript
// Bad: Key depends only on user
const key = `user:${userId}`;

// First request: reserve item_1
// Second request: reserve item_2
// Both use same key → second returns wrong response!
```

### ✅ DO: Include Operation Context

```typescript
// Good: Key includes user + operation + timestamp
const key = `user:${userId}:op:reserve:${itemId}:${Date.now()}`;
```

### ❌ DON'T: Store All Responses

```typescript
// Don't cache errors for too long
if (status >= 500) {
  // Don't store 500 errors - let client retry
  return res.status(500).json({ error: 'Server error' });
}
```

### ✅ DO: Store Only Success

```typescript
res.json = function(body) {
  if (res.statusCode >= 200 && res.statusCode < 300) {
    storeResponse(key, route, userId, res.statusCode, body);
  }
  return originalJson(body);
};
```

## Real-World Examples

### Stripe API

```bash
curl https://api.stripe.com/v1/charges \
  -u sk_test_xxx: \
  -d idempotency_key=my-key-123 \
  -d amount=2000 \
  -d currency=usd \
  -d source=tok_visa
```

### AWS S3

```bash
aws s3api put-object \
  --bucket my-bucket \
  --key file.txt \
  --body filecontent \
  --x-amz-idempotency-key my-key-123
```

## Related Files

- [`../routes/index.ts`](../routes/index.ts) - Middleware usage in routes
- [`../database/index.ts`](../database/index.ts) - Idempotency keys table schema
- [`../docs/04-idempotency.md`](../../docs/04-idempotency.md) - Full lesson on idempotency

## Best Practices

### ✅ DO

- Always include idempotency keys in mutation requests
- Use UUIDs or ULIDs for keys
- Expire old keys periodically
- Return cached responses immediately
- Validate key format

### ❌ DON'T

- Use idempotency for GET requests
- Reuse keys for different operations
- Store sensitive data in responses
- Keep keys forever (cleanup needed)
- Use predictable keys

---

**💡 Tip**: Generate idempotency keys on the client side - don't rely on the server!
