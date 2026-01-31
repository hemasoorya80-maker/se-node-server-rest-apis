# Learning Checklist & Feature Validation

Use this checklist to verify each feature is working correctly as you learn.

## How to Use This Checklist

1. ✅ Mark items as you complete them
2. 📝 Take notes about what you learned
3. 🐛 Record any issues or bugs you find
4. 💡 Add your own insights and tips

---

## Setup

- [ ] Install dependencies: `npm install`
- [ ] Set up database: `npm run db:migrate && npm run db:seed`
- [ ] Start server: `npm run dev`
- [ ] Verify server starts without errors
- [ ] Check health endpoint: `curl http://localhost:3000/health`

**Notes**: _______________


---

## Feature 1: Configuration

### Learning Goals
- [ ] Understand environment variables
- [ ] Learn how configuration is loaded
- [ ] Know how to override defaults

### Validation
- [ ] Check `.env.example` file exists
- [ ] Copy to `.env` and customize
- [ ] Change port: `PORT=4000 npm run dev`
- [ ] Verify server starts on new port

### Files to Study
- [ ] [`src/config/index.ts`](src/config/index.ts) - Read and understand
- [ ] [src/config/README.md](src/config/README.md) - Read the learning guide

**Notes**: _______________


---

## Feature 2: Input Validation

### Learning Goals
- [ ] Understand why validation matters
- [ ] Learn Zod schema syntax
- [ ] Know how to validate request bodies

### Validation Tests
- [ ] ✅ Valid request accepted:
  ```bash
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -d '{"userId":"user_1","itemId":"item_1","qty":1}'
  ```

- [ ] ❌ Missing field rejected (400):
  ```bash
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -d '{"itemId":"item_1","qty":1}'
  ```

- [ ] ❌ Invalid quantity rejected (400):
  ```bash
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -d '{"userId":"user_1","itemId":"item_1","qty":0}'
  ```

- [ ] ❌ Invalid ID format rejected (400):
  ```bash
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -d '{"userId":"invalid","itemId":"item_1","qty":1}'
  ```

### Files to Study
- [ ] [`src/validation/schemas.ts`](src/validation/schemas.ts)
- [ ] [`src/validation/README.md`](src/validation/README.md)
- [ ] [docs/02-validation.md](docs/02-validation.md)

**Notes**: _______________


---

## Feature 3: Concurrency Control

### Learning Goals
- [ ] Understand race conditions
- [ ] Learn conditional updates
- [ ] Know how transactions work

### Validation Tests
- [ ] Check initial stock: `curl http://localhost:3000/api/v1/items`

- [ ] Reserve 3 items (should succeed):
  ```bash
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -d '{"userId":"user_1","itemId":"item_1","qty":3}'
  ```

- [ ] Try to reserve 3 more (should fail - OUT_OF_STOCK):
  ```bash
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -d '{"userId":"user_2","itemId":"item_1","qty":3}'
  ```

- [ ] Verify stock is accurate (no overselling)
- [ ] Run simultaneous requests (see POSTMAN_COLLECTION.md)

### Files to Study
- [ ] [`src/services/reservations.ts`](src/services/reservations.ts)
- [ ] [`src/database/index.ts`](src/database/index.ts)
- [ ] [docs/03-concurrency.md](docs/03-concurrency.md)
- [ ] [src/services/README.md](src/services/README.md)

**Notes**: _______________


---

## Feature 4: Idempotency

### Learning Goals
- [ ] Understand idempotency concept
- [ ] Learn how idempotency keys work
- [ ] Know when to use idempotency

### Validation Tests
- [ ] First request with key creates reservation:
  ```bash
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: test-001" \
    -d '{"userId":"user_test","itemId":"item_1","qty":1}'
  ```
  Save the reservation ID.

- [ ] Second request with SAME key returns same ID:
  ```bash
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: test-001" \
    -d '{"userId":"user_test","itemId":"item_1","qty":1}'
  ```
  Should return same reservation ID.

- [ ] Third request with NEW key creates new reservation:
  ```bash
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: test-002" \
    -d '{"userId":"user_test","itemId":"item_1","qty":1}'
  ```
  Should return different reservation ID.

- [ ] Verify only 1 stock deducted per unique key

### Files to Study
- [ ] [`src/idempotency/index.ts`](src/idempotency/index.ts)
- [ ] [`src/idempotency/README.md`](src/idempotency/README.md)
- [ ] [docs/04-idempotency.md](docs/04-idempotency.md)

**Notes**: _______________


---

## Feature 5: Caching

### Learning Goals
- [ ] Understand caching benefits
- [ ] Learn TTL (time-to-live)
- [ ] Know cache invalidation strategies

### Validation Tests
- [ ] First request is slower (cache miss):
  ```bash
  time curl "http://localhost:3000/api/v1/items"
  ```

- [ ] Second request is faster (cache hit):
  ```bash
  time curl "http://localhost:3000/api/v1/items"
  ```

- [ ] Reserve an item to invalidate cache:
  ```bash
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -d '{"userId":"user_cache","itemId":"item_1","qty":1}'
  ```

- [ ] Next request shows updated stock (cache invalidated):
  ```bash
  curl "http://localhost:3000/api/v1/items"
  ```

### Files to Study
- [ ] [`src/cache/index.ts`](src/cache/index.ts)
- [ ] [`src/cache/README.md`](src/cache/README.md)
- [ ] [docs/05-caching.md](docs/05-caching.md)

**Notes**: _______________


---

## Feature 6: Logging & Observability

### Learning Goals
- [ ] Understand structured logging
- [ ] Learn request tracing
- [ ] Know log levels

### Validation Tests
- [ ] Make request with custom request ID:
  ```bash
  curl -H "X-Request-ID: my-test-123" \
    "http://localhost:3000/api/v1/items"
  ```

- [ ] Check response headers include `X-Request-ID`
- [ ] Find request ID in server logs
- [ ] Verify logs are JSON format
- [ ] Check logs include: requestId, method, path, status, durationMs

### Files to Study
- [ ] [`src/observability/index.ts`](src/observability/index.ts)
- [ ] [`src/observability/README.md`](src/observability/README.md)
- [ ] [docs/06-logging.md](docs/06-logging.md)

**Notes**: _______________


---

## Feature 7: Rate Limiting

### Learning Goals
- [ ] Understand rate limiting
- [ ] Learn token bucket algorithm
- [ ] Know how to configure limits

### Validation Tests
- [ ] Make 20 requests quickly (all should succeed):
  ```bash
  for i in {1..20}; do
    curl -X POST http://localhost:3000/api/v1/reserve \
      -H "Content-Type: application/json" \
      -d '{"userId":"user_rl","itemId":"item_1","qty":1}'
    echo "Request $i: $(date +%H:%M:%S)"
  done
  ```

- [ ] Make 21st request (should be rate limited with 429)
- [ ] Check response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- [ ] Check `Retry-After` header

### Files to Study
- [ ] [`src/middleware/rateLimit.ts`](src/middleware/rateLimit.ts)
- [ ] [`src/middleware/README.md`](src/middleware/README.md)

**Notes**: _______________


---

## Feature 8: Security

### Learning Goals
- [ ] Understand security headers
- [ ] Learn CORS configuration
- [ ] Know how to validate input

### Validation Tests
- [ ] Check security headers:
  ```bash
  curl -I http://localhost:3000/api/v1/items
  ```

- [ ] Verify headers present:
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `X-XSS-Protection: 1; mode=block`
  - [ ] `Strict-Transport-Security` (in production)

- [ ] Test XSS in query string (should be blocked):
  ```bash
  curl "http://localhost:3000/api/v1/items?search=<script>alert('xss')</script>"
  ```

- [ ] Test SQL injection (should be blocked):
  ```bash
  curl "http://localhost:3000/api/v1/items?search=' OR '1'='1"
  ```

### Files to Study
- [ ] [`src/middleware/security.ts`](src/middleware/security.ts)
- [ ] [`src/middleware/README.md`](src/middleware/README.md)

**Notes**: _______________


---

## Complete Workflow Test

### End-to-End Reservation Flow

- [ ] 1. List all items:
  ```bash
  curl "http://localhost:3000/api/v1/items"
  ```

- [ ] 2. Reserve an item:
  ```bash
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: workflow-001" \
    -d '{"userId":"user_workflow","itemId":"item_1","qty":2}'
  ```
  Save the reservation ID.

- [ ] 3. Get reservation details:
  ```bash
  curl "http://localhost:3000/api/v1/reservations/RESERVATION_ID"
  ```

- [ ] 4. List user's reservations:
  ```bash
  curl "http://localhost:3000/api/v1/reservations/user/user_workflow"
  ```

- [ ] 5. Confirm reservation:
  ```bash
  curl -X POST http://localhost:3000/api/v1/confirm \
    -H "Content-Type: application/json" \
    -d '{"userId":"user_workflow","reservationId":"RESERVATION_ID"}'
  ```

- [ ] 6. Try to cancel confirmed reservation (should fail):
  ```bash
  curl -X POST http://localhost:3000/api/v1/cancel \
    -H "Content-Type: application/json" \
    -d '{"userId":"user_workflow","reservationId":"RESERVATION_ID"}'
  ```

**Notes**: _______________


---

## Error Handling Validation

Verify all error scenarios return proper responses:

- [ ] 400 Bad Request - Validation errors
- [ ] 401 Unauthorized - Missing auth (when implemented)
- [ ] 403 Forbidden - Insufficient permissions
- [ ] 404 Not Found - Resource doesn't exist
- [ ] 409 Conflict - Out of stock, invalid state
- [ ] 422 Unprocessable Entity - Semantic errors
- [ ] 429 Too Many Requests - Rate limited
- [ ] 500 Internal Server Error - Server errors

**Notes**: _______________


---

## Documentation Study

Track which documentation you've read:

- [ ] [README.md](README.md) - Project overview
- [ ] [docs/README.md](docs/README.md) - Learning guide index
- [ ] [docs/01-introduction.md](docs/01-introduction.md) - Introduction
- [ ] [docs/02-validation.md](docs/02-validation.md) - Input validation
- [ ] [docs/03-concurrency.md](docs/03-concurrency.md) - Race conditions
- [ ] [docs/04-idempotency.md](docs/04-idempotency.md) - Duplicate requests
- [ ] [docs/05-caching.md](docs/05-caching.md) - Performance
- [ ] [docs/06-logging.md](docs/06-logging.md) - Observability
- [ ] [docs/07-validation-guide.md](docs/07-validation-guide.md) - Testing guide
- [ ] [POSTMAN_COLLECTION.md](POSTMAN_COLLECTION.md) - API testing

**Notes**: _______________


---

## Module READMEs

Track which module READMEs you've read:

- [ ] [src/config/README.md](src/config/README.md)
- [ ] [src/cache/README.md](src/cache/README.md)
- [ ] [src/database/README.md](src/database/README.md)
- [ ] [src/http/README.md](src/http/README.md)
- [ ] [src/idempotency/README.md](src/idempotency/README.md)
- [ ] [src/middleware/README.md](src/middleware/README.md)
- [ ] [src/observability/README.md](src/observability/README.md)
- [ ] [src/routes/README.md](src/routes/README.md)
- [ ] [src/services/README.md](src/services/README.md)
- [ ] [src/types/README.md](src/types/README.md)
- [ ] [src/validation/README.md](src/validation/README.md)

**Notes**: _______________


---

## Reflection

### What I Learned

1. Most important concept: _______________
2. Most surprising thing: _______________
3. Most difficult to understand: _______________
4. Want to learn more about: _______________

### Questions I Still Have

1. _______________
2. _______________
3. _______________

### Next Steps

- [ ] Build my own feature
- [ ] Add authentication
- [ ] Deploy to production
- [ ] Add more tests
- [ ] Contribute to this project

---

**💡 Tip**: Keep this checklist as reference. Come back to review concepts whenever you need a refresher!
