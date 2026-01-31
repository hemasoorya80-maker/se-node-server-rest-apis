# Routes Module

## What This Module Teaches

This module demonstrates **REST API endpoint design**, **route handlers**, **middleware composition**, and **request/response handling** with Express.js.

## Key Concepts

### 1. REST API Design

RESTful endpoints follow conventions:

| Operation | HTTP Method | Endpoint | Description |
|-----------|-------------|----------|-------------|
| List items | GET | `/api/v1/items` | Get all items |
| Get item | GET | `/api/v1/items/:id` | Get single item |
| Reserve | POST | `/api/v1/reserve` | Create reservation |
| Confirm | POST | `/api/v1/confirm` | Confirm reservation |
| Cancel | POST | `/api/v1/cancel` | Cancel reservation |
| List reservations | GET | `/api/v1/reservations/user/:userId` | Get user's reservations |

### 2. Route Handler Pattern

Standard route handler structure:

```typescript
app.get('/items', async (req, res) => {
  try {
    // 1. Validate input
    const result = validateRequest(schema, req.query);

    if (!result.success) {
      return badRequest(res, req, result.error.code, result.error.message);
    }

    // 2. Check cache
    const cached = getCache(key);
    if (cached) return ok(res, cached);

    // 3. Execute business logic
    const data = serviceFunction(result.data);

    // 4. Update cache
    setCache(key, data, ttl);

    // 5. Return response
    return ok(res, data);

  } catch (error) {
    logger.error('Operation failed', error);
    return internalError(res, req, 'INTERNAL_ERROR', 'Operation failed');
  }
});
```

### 3. Middleware Composition

Apply middleware in order:

```typescript
app.post('/reserve',
  idempotencyMiddleware('/reserve'),  // Check for duplicate requests
  validateBody(reserveSchema),         // Validate request body
  async (req, res) => {                // Route handler
    // ... handler logic ...
  }
);
```

## Files in This Directory

### [`index.ts`](index.ts)

All API endpoints:
- **GET /items** - List all items
- **GET /items/:id** - Get single item
- **GET /reservations/user/:userId** - List user's reservations
- **GET /reservations/:id** - Get single reservation
- **POST /reserve** - Reserve an item
- **POST /confirm** - Confirm a reservation
- **POST /cancel** - Cancel a reservation
- **POST /expire/run** - Expire old reservations

### [`health.ts`](health.ts)

Health check endpoints:
- **GET /health** - Basic health check
- **GET /health/ready** - Readiness check with dependency status

## API Endpoints

### Items

#### List Items

```http
GET /api/v1/items
```

Query Parameters:
- `sortBy` - Sort field (`name` or `availableQty`)
- `sortOrder` - Sort order (`asc` or `desc`)

Response (200):
```json
{
  "ok": true,
  "data": [
    { "id": "item_1", "name": "Wireless Mouse", "availableQty": 3 },
    { "id": "item_2", "name": "Mechanical Keyboard", "availableQty": 5 }
  ]
}
```

#### Get Single Item

```http
GET /api/v1/items/:id
```

Response (200):
```json
{
  "ok": true,
  "data": {
    "id": "item_1",
    "name": "Wireless Mouse",
    "availableQty": 3
  }
}
```

Error (404):
```json
{
  "ok": false,
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Item not found"
  }
}
```

### Reservations

#### Reserve Item

```http
POST /api/v1/reserve
Idempotency-Key: optional-unique-key
Content-Type: application/json

{
  "userId": "user_1",
  "itemId": "item_1",
  "qty": 2
}
```

Success (201):
```json
{
  "ok": true,
  "data": {
    "id": "res_abc123",
    "userId": "user_1",
    "itemId": "item_1",
    "qty": 2,
    "status": "reserved",
    "expiresAt": 1706720400000,
    "createdAt": 1706716800000
  }
}
```

Errors:
- **400** - Invalid request body
- **404** - Item not found
- **409** - Out of stock

#### Confirm Reservation

```http
POST /api/v1/confirm
Idempotency-Key: optional-unique-key
Content-Type: application/json

{
  "userId": "user_1",
  "reservationId": "res_abc123"
}
```

Success (200):
```json
{
  "ok": true,
  "data": {
    "status": "confirmed"
  }
}
```

Special Cases:
- **200** - Already confirmed (idempotent)
- **409** - Reservation expired or cancelled
- **404** - Reservation not found

#### Cancel Reservation

```http
POST /api/v1/cancel
Content-Type: application/json

{
  "userId": "user_1",
  "reservationId": "res_abc123"
}
```

Success (200):
```json
{
  "ok": true,
  "data": {
    "status": "cancelled"
  }
}
```

Special Cases:
- **200** - Already cancelled (idempotent)
- **409** - Already confirmed (can't cancel)
- **404** - Reservation not found

#### List User's Reservations

```http
GET /api/v1/reservations/user/:userId?status=reserved
```

Query Parameters:
- `status` - Filter by status (`reserved`, `confirmed`, `cancelled`, `expired`)

Response (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "res_abc123",
      "itemId": "item_1",
      "qty": 2,
      "status": "reserved",
      "expiresAt": 1706720400000
    }
  ]
}
```

#### Get Single Reservation

```http
GET /api/v1/reservations/:id
```

Response (200):
```json
{
  "ok": true,
  "data": {
    "id": "res_abc123",
    "userId": "user_1",
    "itemId": "item_1",
    "qty": 2,
    "status": "reserved",
    "expiresAt": 1706720400000,
    "createdAt": 1706716800000
  }
}
```

### Admin

#### Expire Old Reservations

```http
POST /api/v1/expire/run
```

Success (200):
```json
{
  "ok": true,
  "data": {
    "expired": 5,
    "message": "Expired 5 reservations"
  }
}
```

## Route Handler Pattern Breakdown

### 1. Input Validation

```typescript
// Validate query parameters
const queryResult = validateRequest(getItemsQuerySchema, req.query);
if (!queryResult.success) {
  return badRequest(res, req, queryResult.error.code, queryResult.error.message, {
    issues: queryResult.error.details
  });
}
```

### 2. Cache Check

```typescript
// Check cache
const cacheKey = CacheKeys.items();
const cached = getCache(cacheKey);
if (cached) {
  logger.debug('Cache hit for items list');
  return ok(res, cached);
}
```

### 3. Business Logic

```typescript
// Fetch from database
const items = listItems({ sortBy, sortOrder });
```

### 4. Cache Update

```typescript
// Cache for 30 seconds
setCache(cacheKey, items, appConfig.CACHE_TTL_ITEMS);
```

### 5. Metrics

```typescript
// Record metrics
const duration = Date.now() - start;
incrementCounter('requests.getItems.success');
recordHistogram('request_duration', duration, { endpoint: '/items' });
```

### 6. Response

```typescript
return ok(res, items);
```

## Error Handling

### Try-Catch Pattern

```typescript
router.get('/items', async (req, res) => {
  try {
    // ... handler logic ...
  } catch (error) {
    logger.error('Failed to list items', error);
    incrementCounter('requests.getItems.error');
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve items'
      }
    });
  }
});
```

### Discriminated Union Results

```typescript
const result = reserveItem({ userId, itemId, qty });

if (result.kind === 'NOT_FOUND') {
  return notFound(res, req, 'ITEM_NOT_FOUND', 'Item not found', { itemId });
}

if (result.kind === 'OUT_OF_STOCK') {
  return conflict(res, req, 'OUT_OF_STOCK', 'Not enough stock available', {
    itemId,
    requested: qty,
    available: result.available
  });
}

if (result.kind === 'OK') {
  return created(res, result.reservation);
}
```

## Idempotency in Routes

```typescript
router.post('/reserve',
  idempotencyMiddleware('/reserve'),
  async (req, res) => {
    // If same Idempotency-Key used, returns cached response
    // automatically without executing handler
  }
);
```

## Cache Invalidation

```typescript
// After modifying data, invalidate cache
invalidate(CacheKeys.items());
invalidate(CacheKeys.item(itemId));
```

## Query Parameters

### Validation

```typescript
const getItemsQuerySchema = z.object({
  sortBy: z.enum(['name', 'availableQty']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
```

### Usage

```typescript
const { sortBy, sortOrder } = queryResult.data;

const items = listItems({ sortBy, sortOrder });
```

## Path Parameters

### Extraction

```typescript
router.get('/items/:id', (req, res) => {
  const { id } = req.params;
  const item = getItem(id);
  // ...
});
```

### Validation

```typescript
// Validate ID format
if (!/^[a-z]+_\d+$/.test(id)) {
  return badRequest(res, req, 'INVALID_ID', 'Invalid item ID format');
}
```

## Request Body

### Validation

```typescript
router.post('/reserve', async (req, res) => {
  const bodyResult = validateRequest(reserveRequestSchema, req.body);
  if (!bodyResult.success) {
    return badRequest(res, req, bodyResult.error.code, bodyResult.error.message);
  }

  const { userId, itemId, qty } = bodyResult.data;
  // ...
});
```

## Response Headers

### Set Custom Headers

```typescript
router.get('/items', (req, res) => {
  res.setHeader('X-Custom-Header', 'value');
  res.setHeader('X-API-Version', 'v1');
  return ok(res, items);
});
```

### Rate Limit Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706716800000
```

## Testing Endpoints

### With curl

```bash
# List items
curl http://localhost:3000/api/v1/items

# Get single item
curl http://localhost:3000/api/v1/items/item_1

# Reserve item
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_1","itemId":"item_1","qty":2}'

# With idempotency key
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-123" \
  -d '{"userId":"user_1","itemId":"item_1","qty":2}'

# Confirm reservation
curl -X POST http://localhost:3000/api/v1/confirm \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_1","reservationId":"res_abc123"}'

# Cancel reservation
curl -X POST http://localhost:3000/api/v1/cancel \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_1","reservationId":"res_abc123"}'
```

## Related Files

- [`../services/reservations.ts`](../services/reservations.ts) - Business logic
- [`../validation/schemas.ts`](../validation/schemas.ts) - Request validation
- [`../http/index.ts`](../http/index.ts) - Response helpers
- [`../server.ts`](../server.ts) - Router setup

## Best Practices

### ✅ DO

- Use RESTful conventions
- Validate all input
- Handle errors gracefully
- Use appropriate status codes
- Return consistent response format
- Include request IDs
- Log all requests
- Apply security middleware

### ❌ DON'T

- Mix concerns (validation in handler)
- Forget error handling
- Use wrong HTTP methods
- Return inconsistent formats
- Expose internal errors
- Skip authentication/authorization

---

**💡 Tip**: Use tools like Postman, Insomnia, or HTTP files in VSCode to test endpoints efficiently!
