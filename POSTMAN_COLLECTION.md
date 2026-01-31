# API Testing Guide

Complete guide to testing all features of the reservation system API.

## Base URL

```
http://localhost:3000
```

## Quick Setup

```bash
# Install dependencies
npm install

# Set up database
npm run db:migrate
npm run db:seed

# Start server
npm run dev
```

## Testing Tools

- **curl** - Command line (pre-installed)
- **HTTP files** - VSCode extension "REST Client"
- **Insomnia** - https://insomnia.rest/
- **Postman** - https://www.postman.com/downloads/

## Health Check

### Check Server is Running

```bash
curl http://localhost:3000/health
```

**Response** (200):
```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "timestamp": 1706716800000
  }
}
```

### Check Dependencies

```bash
curl http://localhost:3000/health/ready
```

**Response** (200):
```json
{
  "ok": true,
  "data": {
    "status": "ready",
    "database": {
      "healthy": true,
      "latency": 2
    }
  }
}
```

## Feature 1: List Items

### Test Validation

**Valid request**:
```bash
curl "http://localhost:3000/api/v1/items"
```

**With sorting**:
```bash
curl "http://localhost:3000/api/v1/items?sortBy=availableQty&sortOrder=desc"
```

**Response** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "item_1",
      "name": "Wireless Mouse",
      "availableQty": 5
    },
    {
      "id": "item_2",
      "name": "Mechanical Keyboard",
      "availableQty": 3
    }
  ]
}
```

### What to Verify

✅ Response contains items
✅ `availableQty` shows current stock
✅ Sorting works with query parameters
✅ Response format is consistent (`ok: true`)

## Feature 2: Input Validation

### Test Validation Errors

**Missing required field**:
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"itemId":"item_1","qty":1}'
```

**Response** (400):
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "userId",
        "message": "User ID is required"
      }
    ]
  }
}
```

**Invalid quantity (too small)**:
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_1","itemId":"item_1","qty":0}'
```

**Invalid quantity (not a number)**:
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_1","itemId":"item_1","qty":"five"}'
```

**Invalid ID format**:
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"invalid","itemId":"item_1","qty":1}'
```

### What to Verify

✅ 400 status code for validation errors
✅ Error response includes `VALIDATION_ERROR` code
✅ `details` array shows specific field errors
✅ Helpful error messages

## Feature 3: Concurrency (Race Conditions)

### Setup Two Terminals

**Terminal 1** - Reserve 3 items (should succeed):
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_1","itemId":"item_1","qty":3}'
```

**Terminal 2** - Reserve 3 more items (should fail):
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_2","itemId":"item_1","qty":3}'
```

### Check Results

```bash
# Check remaining stock
curl "http://localhost:3000/api/v1/items"
```

**Expected**: `item_1` has 2 available (5 - 3 = 2)

### Simultaneous Requests Test

```bash
# Run these at the same time in different terminals
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_1","itemId":"item_2","qty":3}' &

curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_2","itemId":"item_2","qty":3}' &

wait
```

### What to Verify

✅ Only one request succeeds
✅ Other request gets `OUT_OF_STOCK` error
✅ No overselling occurs
✅ Stock is accurate

## Feature 4: Idempotency

### Test Duplicate Requests

**First request** - Creates reservation:
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-idempotency-001" \
  -d '{"userId":"user_1","itemId":"item_1","qty":1}'
```

**Response** (201):
```json
{
  "ok": true,
  "data": {
    "id": "res_abc123",
    "status": "reserved",
    ...
  }
}
```

**Second request with SAME key** - Returns cached response:
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-idempotency-001" \
  -d '{"userId":"user_1","itemId":"item_1","qty":1}'
```

**Response**: Same reservation ID (`res_abc123`)

**Third request with NEW key** - Creates new reservation:
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-idempotency-002" \
  -d '{"userId":"user_1","itemId":"item_1","qty":1}'
```

**Response**: Different reservation ID

### What to Verify

✅ Same key = same reservation ID
✅ Different key = new reservation
✅ Stock only deducted once for same key
✅ Works for confirm and cancel too

## Feature 5: Caching

### Test Cache Hit

**First request** - Cache miss (slower):
```bash
time curl "http://localhost:3000/api/v1/items"
```

**Second request** - Cache hit (much faster):
```bash
time curl "http://localhost:3000/api/v1/items"
```

### Invalidate Cache on Change

**Reserve an item**:
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_cache","itemId":"item_1","qty":1}'
```

**Next GET** - Fetches fresh data (cache was invalidated):
```bash
curl "http://localhost:3000/api/v1/items"
```

Check `availableQty` decreased.

### What to Verify

✅ Second request is faster
✅ Stock changes after reservation
✅ Cache invalidation works
✅ Response time improves

## Feature 6: Logging

### Check Request ID

Make a request with custom request ID:
```bash
curl -H "X-Request-ID: my-custom-request-123" \
  "http://localhost:3000/api/v1/items"
```

**Response headers**:
```
X-Request-ID: my-custom-request-123
```

**Server logs** show:
```json
{
  "requestId": "my-custom-request-123",
  "msg": "GET /api/v1/items 200"
}
```

### Search Logs by Request ID

```bash
# In server logs, search for the request ID
grep "my-custom-request-123" logs/app.log
```

### What to Verify

✅ All logs include `requestId`
✅ Response header includes `X-Request-ID`
✅ Can trace entire request in logs
✅ Logs are structured JSON

## Feature 7: Rate Limiting

### Test Rate Limit

**Make 25 requests quickly**:
```bash
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -d '{"userId":"user_rl","itemId":"item_1","qty":1}'
  echo "Request $i"
done
```

### Expected Behavior

**First 20 requests** - Success (201)

**After 20 requests** - Rate limited (429):
```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "details": {
      "retryAfter": 5
    }
  }
}
```

**Response headers**:
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706716805000
Retry-After: 5
```

### What to Verify

✅ First 20 succeed
✅ Request 21+ get 429 status
✅ `Retry-After` header is present
✅ Rate limit resets after window

## Feature 8: Security Headers

### Check Security Headers

```bash
curl -I http://localhost:3000/api/v1/items
```

**Expected headers**:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
X-API-Version: v1
```

### Test CORS

**Preflight request**:
```bash
curl -X OPTIONS http://localhost:3000/api/v1/items \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

### What to Verify

✅ Security headers are present
✅ CORS allows allowed origins
✅ Blocks disallowed origins
✅ X-Powered-By header is hidden

## Complete Workflow Test

### Full Reservation Flow

**1. List items**:
```bash
curl "http://localhost:3000/api/v1/items"
```

**2. Reserve an item**:
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: workflow-001" \
  -d '{"userId":"user_workflow","itemId":"item_1","qty":2}'
```

Save the `reservationId` from response.

**3. Check reservation**:
```bash
curl "http://localhost:3000/api/v1/reservations/RESERVATION_ID"
```

**4. Confirm reservation**:
```bash
curl -X POST http://localhost:3000/api/v1/confirm \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: workflow-002" \
  -d '{"userId":"user_workflow","reservationId":"RESERVATION_ID"}'
```

**5. List user's reservations**:
```bash
curl "http://localhost:3000/api/v1/reservations/user/user_workflow"
```

**6. Cancel (if needed)**:
```bash
curl -X POST http://localhost:3000/api/v1/cancel \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_workflow","reservationId":"RESERVATION_ID"}'
```

## Error Scenarios

### Test All Error Codes

**400 Bad Request** - Invalid input:
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"","itemId":"item_1","qty":1}'
```

**404 Not Found** - Item doesn't exist:
```bash
curl "http://localhost:3000/api/v1/items/nonexistent"
```

**409 Conflict** - Out of stock:
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_test","itemId":"item_1","qty":999}'
```

**422 Unprocessable** - Invalid state:
```bash
# Try to cancel already confirmed reservation
curl -X POST http://localhost:3000/api/v1/cancel \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_test","reservationId":"confirmed_res_id"}'
```

## Postman Import

### Import as cURL

1. Copy any curl command from this guide
2. In Postman: Import > Paste Raw Text
3. Paste the curl command
4. Click Import

### Manual Collection Setup

Create a collection with these environments:

**Variables**:
```
base_url = http://localhost:3000
user_id = user_test
item_id = item_1
reservation_id = {{reservation_id}}
```

**Requests**:
1. `{{base_url}}/health` - Health Check
2. `{{base_url}}/api/v1/items` - List Items
3. `{{base_url}}/api/v1/reserve` - Reserve (POST)
4. `{{base_url}}/api/v1/confirm` - Confirm (POST)
5. `{{base_url}}/api/v1/cancel` - Cancel (POST)

## VSCode REST Client

Install "REST Client" extension, then create `test.http`:

```http
### Health Check
GET http://localhost:3000/health

### List Items
GET http://localhost:3000/api/v1/items

### Reserve Item
POST http://localhost:3000/api/v1/reserve
Content-Type: application/json
Idempotency-Key: test-001

{
  "userId": "user_test",
  "itemId": "item_1",
  "qty": 2
}

### Confirm Reservation
POST http://localhost:3000/api/v1/confirm
Content-Type: application/json

{
  "userId": "user_test",
  "reservationId": "res_abc123"
}
```

Click "Send Request" above each request.

---

**💡 Tip**: Use the request ID from response headers to trace requests in server logs!
