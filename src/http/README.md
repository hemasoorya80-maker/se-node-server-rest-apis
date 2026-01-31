# HTTP Response Utilities Module

## What This Module Teaches

This module demonstrates **consistent API response design**, **HTTP status codes**, and **error formatting** for REST APIs.

## Key Concepts

### 1. Standard Response Format

All responses follow a consistent structure:

**Success Response**:
```json
{
  "ok": true,
  "data": { ... },
  "meta": { ... }  // optional
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... },
    "requestId": "uuid"
  }
}
```

### 2. HTTP Status Codes

Use appropriate status codes:

| Code | Name | Usage |
|------|------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE with no body |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | State conflict (out of stock, etc.) |
| 422 | Unprocessable Entity | Valid but semantically incorrect |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Server Error | Unexpected error |
| 503 | Service Unavailable | Service down |

### 3. Response Helper Functions

Type-safe functions for common responses:

```typescript
// Success responses
ok(res, data, 200);
created(res, data);
noContent(res);
accepted(res, data);

// Error responses
badRequest(res, req, code, message, details);
unauthorized(res, req, message);
forbidden(res, req, message);
notFound(res, req, code, message, details);
conflict(res, req, code, message, details);
unprocessable(res, req, code, message, details);
tooManyRequests(res, req, code, message, details);
internalError(res, req, code, message, details);
```

## Files in This Directory

### [`index.ts`](index.ts)

Response helpers and utilities:
- **Success helpers** - ok(), created(), noContent()
- **Error helpers** - badRequest(), notFound(), conflict(), etc.
- **Response builder** - Chainable response building
- **Status utilities** - Check status code categories

## Success Response Examples

### 200 OK - GET Request

```typescript
app.get('/items/:id', (req, res) => {
  const item = getItem(req.params.id);

  if (!item) {
    return notFound(res, req, 'ITEM_NOT_FOUND', 'Item not found');
  }

  return ok(res, item);
});
```

Response:
```json
{
  "ok": true,
  "data": {
    "id": "item_1",
    "name": "Wireless Mouse",
    "availableQty": 5
  }
}
```

### 201 Created - POST Request

```typescript
app.post('/reserve', (req, res) => {
  const reservation = createReservation(req.body);

  return created(res, reservation);
});
```

Response:
```json
{
  "ok": true,
  "data": {
    "id": "res_abc123",
    "userId": "user_1",
    "itemId": "item_1",
    "qty": 2,
    "status": "reserved"
  }
}
```

### 200 OK with Metadata

```typescript
ok(res, items, 200, {
  page: 1,
  pageSize: 20,
  total: 100
});
```

Response:
```json
{
  "ok": true,
  "data": [...],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

### 204 No Content - DELETE Request

```typescript
app.delete('/items/:id', (req, res) => {
  deleteItem(req.params.id);
  return noContent(res);
});
```

Response: (empty body, status 204)

## Error Response Examples

### 400 Bad Request - Validation Error

```typescript
app.post('/reserve', (req, res) => {
  const result = validateRequest(reserveSchema, req.body);

  if (!result.success) {
    return badRequest(res, req, result.error.code, result.error.message, {
      issues: result.error.details
    });
  }
});
```

Response:
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "issues": [
        { "field": "qty", "message": "Must be at least 1" }
      ]
    }
  }
}
```

### 404 Not Found

```typescript
const item = getItem(itemId);

if (!item) {
  return notFound(res, req, 'ITEM_NOT_FOUND', 'Item not found', {
    itemId
  });
}
```

Response:
```json
{
  "ok": false,
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Item not found",
    "details": {
      "itemId": "item_999"
    }
  }
}
```

### 409 Conflict - Out of Stock

```typescript
if (result.kind === 'OUT_OF_STOCK') {
  return conflict(res, req, 'OUT_OF_STOCK', 'Not enough stock available', {
    itemId,
    requested: 5,
    available: 2
  });
}
```

Response:
```json
{
  "ok": false,
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "Not enough stock available",
    "details": {
      "itemId": "item_1",
      "requested": 5,
      "available": 2
    }
  }
}
```

### 429 Too Many Requests - Rate Limited

```typescript
return tooManyRequests(res, req, 'RATE_LIMITED',
  'Too many requests. Please retry later.', {
    retryAfter: 30,
    resetTime: 1706716800000
  }
);
```

Response:
```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please retry later.",
    "details": {
      "retryAfter": 30,
      "resetTime": 1706716800000
    }
  }
}
```

## Response Builder Pattern

For complex responses, use the builder pattern:

```typescript
return ResponseBuilder.success(res, req)
  .data({ id: 'res_123', status: 'reserved' })
  .status(201)
  .meta({ version: '1' })
  .send();
```

Or for errors:

```typescript
return ResponseBuilder.error(res, req)
  .code('OUT_OF_STOCK')
  .message('Not enough stock')
  .details({ available: 2, requested: 5 })
  .status(409)
  .send();
```

## Specialized Error Helpers

### Validation Error

Format Zod validation errors consistently:

```typescript
import { validationError } from '../http/index.js';

return validationError(res, req, [
  { field: 'email', message: 'Invalid email format' },
  { field: 'qty', message: 'Must be positive' }
]);
```

### Database Error

Log internally, return generic message to client:

```typescript
import { databaseError } from '../http/index.js';

try {
  const result = db.query(...).run();
} catch (error) {
  return databaseError(res, req, error, 'Failed to create reservation');
}
```

## Request ID Tracking

All error responses automatically include request ID if available:

```typescript
export function fail(res, req, code, message, status, details) {
  const responseBody = {
    ok: false,
    error: {
      code,
      message,
      ...(details && { details }),
    }
  };

  // Add request ID if available
  if (req.requestId) {
    responseBody.error.requestId = req.requestId;
  }

  return res.status(status).json(responseBody);
}
```

Response:
```json
{
  "ok": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong",
    "requestId": "req-abc-123"
  }
}
```

## Status Code Utilities

Check status code categories:

```typescript
import { isSuccess, isClientError, isServerError } from '../http/index.js';

if (isSuccess(status)) {
  console.log('Request succeeded');
}

if (isClientError(status)) {
  console.log('Client made a mistake');
}

if (isServerError(status)) {
  console.log('Server failed');
}
```

Get status code name:

```typescript
import { getStatusName } from '../http/index.js';

getStatusName(200);  // "OK"
getStatusName(404);  // "Not Found"
getStatusName(500);  // "Internal Server Error"
```

## Common Response Patterns

### Pagination

```typescript
ok(res, items, 200, {
  page: 1,
  pageSize: 20,
  total: 100,
  totalPages: Math.ceil(100 / 20)
});
```

### Filtering

```typescript
ok(res, filteredItems, 200, {
  filters: { status: 'reserved' },
  matched: 15,
  total: 100
});
```

### Sorting

```typescript
ok(res, items, 200, {
  sort: {
    field: 'name',
    order: 'asc'
  }
});
```

### Rate Limit Info

Headers are added automatically:
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706716800000
```

## Related Files

- [`../routes/index.ts`](../routes/index.ts) - Usage of response helpers
- [`../validation/schemas.ts`](../validation/schemas.ts) - Validation error format
- [`../types/index.ts`](../types/index.ts) - Response type definitions

## Best Practices

### ✅ DO

- Use consistent response format
- Include request ID in errors
- Provide helpful error messages
- Use appropriate HTTP status codes
- Include details for debugging (but not secrets)

### ❌ DON'T

- Expose stack traces to clients
- Return different formats for different endpoints
- Use 200 for errors
- Include sensitive data in error details
- Return raw errors from libraries

## Testing Responses

### With curl

```bash
# Success response
curl http://localhost:3000/api/v1/items

# Error response
curl http://localhost:3000/api/v1/items/nonexistent

# With headers
curl -i http://localhost:3000/api/v1/items
```

### Check Response Format

```bash
# Pretty print JSON
curl http://localhost:3000/api/v1/items | jq

# Check status code
curl -w "%{http_code}" -o /dev/null -s http://localhost:3000/api/v1/items

# Check headers
curl -I http://localhost:3000/api/v1/items
```

---

**💡 Tip**: Consistent response format makes frontend code much simpler - always check `response.ok` first!
