# Lesson 4: Idempotency - Handling Duplicate Requests

## Learning Objectives

By the end of this lesson, you will understand:
1. Why duplicate requests happen in real systems
2. How idempotency keys prevent duplicate processing
3. How to store and replay responses
4. When to use idempotency (and when not to)

## The Problem: Duplicate Requests

### Scenario: Network Retries

A client tries to reserve an item:

```
Client → Server: POST /reserve
Timeout... (no response)
Client → Server: POST /reserve (retry)
Both requests succeed!
```

**Result**: User gets charged twice, double reservations created.

### Real-World Causes

1. **Network timeouts** - Request sent but response lost
2. **Browser refresh** - User refreshes page after POST
3. **Mobile app retry** - Background job retries on failure
4. **Load balancer retries** - Gateway retries upstream
5. **User double-click** - Submit button clicked twice

## The Solution: Idempotency Keys

### Key Insight: Make Requests Repeatable

**Idempotent operation** = Can be applied multiple times with the same result

- ✅ Idempotent: `x = 5` (setting x to 5 always gives same result)
- ✅ Idempotent: `DELETE /items/123` (deleting twice = already deleted)
- ❌ Not idempotent: `x++` (incrementing changes state each time)

### How It Works

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

### File: [`src/idempotency/index.ts`](../src/idempotency/index.ts)

```typescript
export function findStoredResponse(
  key: string,
  route: string,
  userId: string
): StoredResponse | null {
  const row = db.prepare(`
    SELECT responseJson FROM idempotency_keys
    WHERE key = ? AND route = ? AND userId = ?
  `).get(key, route, userId);

  return row ? JSON.parse(row.responseJson) : null;
}

export function storeResponse(
  key: string,
  route: string,
  userId: string,
  status: number,
  body: ApiResponse
): void {
  db.prepare(`
    INSERT INTO idempotency_keys (key, route, userId, responseJson, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(key, route, userId, JSON.stringify(body), Date.now());
}
```

### File: [`src/routes/index.ts`](../src/routes/index.ts)

```typescript
app.post('/reserve',
  idempotencyMiddleware('/reserve'),
  async (req, res) => {
    const result = reserveItem(req.body);

    if (result.kind === 'OK') {
      // Store response for future requests with same key
      storeResponse(key, '/reserve', userId, 201, {
        ok: true,
        data: result.reservation
      });
    }

    return res.status(201).json(result);
  }
);
```

## Idempotency Middleware

### Automatic Response Storage

```typescript
export function idempotencyMiddleware(route: string) {
  return (req, res, next) => {
    const key = req.headers['idempotency-key'];
    const userId = req.body.userId;

    // Check for cached response
    const previous = findStoredResponse(key, route, userId);
    if (previous) {
      return res.status(previous.status).json(previous.body);
    }

    // Hook into response.json() to store successful responses
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

## Idempotency Key Design

### ✅ Good Keys

```typescript
// UUID v4 (recommended)
"550e8400-e29b-41d4-a716-446655440000"

// Client-generated
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

// Predictable
"timestamp-123"  // Attacker can guess
```

### Validation Rules

```typescript
export function isValidIdempotencyKey(key: string): boolean {
  return key.length >= 8 && key.length <= 255 &&
         /^[a-zA-Z0-9\-_]+$/.test(key);
}
```

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

```bash
# First request - creates reservation
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Idempotency-Key: test-key-456" \
  -d '{"userId":"user_1","itemId":"item_1","qty":1}'

# Second request with SAME key - returns cached response
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Idempotency-Key: test-key-456" \
  -d '{"userId":"user_1","itemId":"item_1","qty":1}'

# Both return the same reservation ID!
```

## Expiration Strategy

### Time-Based Expiration

```typescript
// Keys expire after 24 hours
if (Date.now() - stored.createdAt > 24 * 60 * 60 * 1000) {
  deleteIdempotencyKey(key);
  return null;  // Key expired, process request
}
```

### Why Exire?

1. **Storage** - Don't store infinite keys
2. **Freshness** - Old keys may not be relevant
3. **Privacy** - Don't keep response data forever

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
// Good: Key includes user + operation
const key = `user:${userId}:op:reserve:${itemId}:${timestamp}`;
```

### ❌ DON'T: Store All Responses
```typescript
// Don't cache errors for too long
if (status >= 500) {
  // Don't store 500 errors
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

### Stripe API (Payments)
```bash
curl https://api.stripe.com/v1/charges \
  -u sk_test_xxx: \
  -d idempotency_key=my-key-123 \
  -d amount=2000 \
  -d currency=usd \
  -d source=tok_visa
```

### AWS S3 (Idempotent Writes)
```bash
aws s3api put-object \
  --bucket my-bucket \
  --key file.txt \
  --body filecontent \
  --x-amz-request-payer requester \
  --x-amz-idempotency-key my-key-123
```

## Key Takeaways

1. **Duplicate requests happen** - Network failures, retries, UI bugs
2. **Idempotency keys** = unique identifier per request
3. **Store response** = Return cached response on duplicate
4. **Expire keys** = Don't store forever (24 hours is typical)
5. **Include context** = Key should include user + operation

## Exercise

**Task**: Test idempotency failure

1. Send a reserve request with key "test-key-789"
2. Try to confirm a different reservation with the same key
3. What happens? (Hint: Routes are scoped, so it should process normally)

## Next Lesson

Continue to [Lesson 5: Caching](05-caching.md) to learn how to improve performance with intelligent caching.

---

**💡 Tip**: Always include `Idempotency-Key` in mutation requests for production APIs!
