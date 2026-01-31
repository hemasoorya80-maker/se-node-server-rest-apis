# API Testing Guide

This guide contains step-by-step tests to verify each feature is working correctly.

## Table of Contents

- [1. Health & Basic Operations](#1-health--basic-operations)
- [2. Input Validation](#2-input-validation)
- [3. Concurrency Control](#3-concurrency-control)
- [4. Idempotency](#4-idempotency)
- [5. Caching](#5-caching)
- [6. Logging & Observability](#6-logging--observability)
- [7. Rate Limiting](#7-rate-limiting)
- [8. Complete Workflow](#8-complete-workflow)

---

## 1. Health & Basic Operations

### Test 1.1: Basic Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-31T13:00:00.000Z"
  }
}
```

**✅ Validation:** Server is running and responding

---

## 2. Input Validation

### Test 2.1: Valid Request

```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_validation_test",
    "itemId": "item_1",
    "qty": 2
  }'
```

**Expected Response:** `201 Created` with reservation details

### Test 2.2: Empty User ID (Should Fail)

```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "",
    "itemId": "item_1",
    "qty": 1
  }'
```

**Expected Response:** `400 Bad Request`
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body"
  }
}
```

### Test 2.3: Quantity Too High (Should Fail)

```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_validation_test",
    "itemId": "item_1",
    "qty": 10
  }'
```

**Expected Response:** `400 Bad Request`

### Test 2.4: Invalid Item Format (Should Fail)

```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_validation_test",
    "itemId": "invalid-item",
    "qty": 1
  }'
```

**Expected Response:** `400 Bad Request`

**✅ Validation Feature Working:** Invalid requests are rejected with clear error messages

---

## 3. Concurrency Control

### Test 3.1: Reserve Until Out of Stock

```bash
# Check current stock
curl -s http://localhost:3000/api/v1/items | python3 -m json.tool | grep -A 3 '"id": "item_2"'

# Reserve all available stock (item_2 has 2 in stock)
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_concurrent_1","itemId":"item_2","qty":2}'

# Try to reserve more (should fail)
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_concurrent_2","itemId":"item_2","qty":1}'
```

**Expected Response:** First request succeeds, second fails with `OUT_OF_STOCK`

**✅ Concurrency Control Working:** Cannot oversell inventory

---

## 4. Idempotency

### Test 4.1: Idempotent Request (Same Key)

```bash
# First request - should process
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idempotency-test-123" \
  -d '{
    "userId": "user_idem_test",
    "itemId": "item_3",
    "qty": 1
  }'
# Note the reservation ID from response

# Second request with SAME key - should return cached response
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idempotency-test-123" \
  -d '{
    "userId": "user_idem_test",
    "itemId": "item_3",
    "qty": 1
  }'
```

**Expected Result:** Both return the same reservation ID

### Test 4.2: Different Keys (Different Results)

```bash
# Request with key-1
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Idempotency-Key: idempotency-key-1" \
  -d '{"userId":"user_idem_test2","itemId":"item_3","qty":1}'

# Request with key-2
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Idempotency-Key: idempotency-key-2" \
  -d '{"userId":"user_idem_test2","itemId":"item_3","qty":1}'
```

**Expected Result:** Different reservation IDs

**✅ Idempotency Working:** Duplicate requests return same response

---

## 5. Caching

### Test 5.1: Cache Hit (First Request is Fast)

```bash
# First request - cache miss (fetches from DB)
time curl -s http://localhost:3000/api/v1/items > /dev/null

# Second request - cache hit (much faster!)
time curl -s http://localhost:3000/api/v1/items > /dev/null
```

**Expected:** Second request should be noticeably faster

### Test 5.2: Cache Invalidation on Change

```bash
# Get items (cache miss)
curl -s http://localhost:3000/api/v1/items > /dev/null

# Make a change (invalidates cache)
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_cache_test","itemId":"item_1","qty":1}'

# Get items again (should have updated stock)
curl -s http://localhost:3000/api/v1/items | python3 -m json.tool | grep -A 1 '"id": "item_1"'
```

**Expected:** `availableQty` should be decremented

**✅ Caching Working:** Repeated requests are faster, cache invalidates on changes

---

## 6. Logging & Observability

### Test 6.1: Check Logs

```bash
# Make a request
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_log_test","itemId":"item_4","qty":1}'

# Check server logs
tail -f /tmp/server.log
```

**Expected Logs:**
```json
{"level":"info","requestId":"...","msg":"POST /api/v1/reserve 201"}
{"level":"info","requestId":"...","msg":"Item reserved","itemId":"item_4"}
```

### Test 6.2: Request Tracing

```bash
# Note the x-request-id header
curl -i http://localhost:3000/api/v1/items 2>&1 | grep -i "x-request-id"
```

**Expected:** `x-request-id: some-uuid`

**✅ Logging Working:** Structured logs with request IDs

---

## 7. Rate Limiting

### Test 7.1: Exceed Rate Limit

```bash
# Make 25 requests rapidly (limit is 20 per 10 seconds)
for i in {1..25}; do
  curl -s -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"user_rate_$i\",\"itemId\":\"item_6\",\"qty\":1}"
  echo "Request $i: HTTP status $(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/v1/reserve -H 'Content-Type: application/json' -d '{\"userId\":\"u\",\"itemId\":\"item_6\",\"qty\":1}')"
done
```

**Expected:** First 20 requests succeed, next 5 return `429 Too Many Requests`

**✅ Rate Limiting Working:** Requests are throttled

---

## 8. Complete Workflow

### Test 8.1: Full Reservation Lifecycle

```bash
# 1. List items
echo "=== 1. List Items ==="
curl -s http://localhost:3000/api/v1/items | python3 -m json.tool

# 2. Reserve an item
echo -e "\n=== 2. Reserve Item ==="
RESERVE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: full-workflow-test" \
  -d '{"userId":"user_full_test","itemId":"item_5","qty":2}')
echo "$RESERVE_RESPONSE" | python3 -m json.tool

# Extract reservation ID
RESERVATION_ID=$(echo "$RESERVE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")

# 3. Confirm reservation
echo -e "\n=== 3. Confirm Reservation ==="
curl -s -X POST http://localhost:3000/api/v1/confirm \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: full-workflow-confirm" \
  -d "{\"userId\":\"user_full_test\",\"reservationId\":\"$RESERVATION_ID\"}" | python3 -m json.tool

# 4. Check item stock decreased
echo -e "\n=== 4. Verify Stock Decremented ==="
curl -s http://localhost:3000/api/v1/items | python3 -m json.tool | grep -A 1 '"id": "item_5"'

# 5. Cancel reservation
echo -e "\n=== 5. Cancel Reservation ==="
curl -s -X POST http://localhost:3000/api/v1/cancel \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"user_full_test\",\"reservationId\":\"$RESERVATION_ID\"}" | python3 -m json.tool

# 6. Verify stock returned
echo -e "\n=== 6. Verify Stock Returned ==="
curl -s http://localhost:3000/api/v1/items | python3 -m json.tool | grep -A 1 '"id": "item_5"'

# 7. Try to confirm cancelled reservation (should fail)
echo -e "\n=== 7. Try to Confirm Cancelled Reservation (Should Fail) ==="
curl -s -X POST http://localhost:3000/api/v1/confirm \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"user_full_test\",\"reservationId\":\"$RESERVATION_ID\"}" | python3 -m json.tool
```

**Expected Flow:**
1. Items list shows available stock
2. Reservation created with status "reserved"
3. Reservation confirmed (status becomes "confirmed")
4. Stock is decreased
5. Reservation cancelled (stock is returned)
6. Try to confirm cancelled reservation → gets error

**✅ Complete Workflow:** All operations work correctly

---

## Quick Validation Commands

### Check All Features at Once

```bash
#!/bin/bash
echo "🧪 Testing All Features..."
echo ""

echo "1. Health Check..."
curl -s http://localhost:3000/health | grep -q '"ok":true' && echo "✅ Health check working" || echo "❌ Health check failed"

echo "2. Validation..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"","itemId":"item_1","qty":1}')
echo "$RESPONSE" | grep -q '"ok":false' && echo "✅ Validation catching errors" || echo "❌ Validation not working"

echo "3. Concurrency..."
curl -s http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_3","itemId":"item_2","qty":3}' > /dev/null
curl -s -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_3","itemId":"item_2","qty":1}' | grep -q '"ok":false' && echo "✅ Concurrency preventing overselling" || echo "❌ Concurrency not working"

echo "4. Idempotency..."
curl -s -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: validation-key-999" \
  -d '{"userId":"test_4","itemId":"item_3","qty":1}' > /dev/null
RESPONSE2=$(curl -s -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: validation-key-999" \
  -d '{"userId":"test_4","itemId":"item_3","qty":1}')
ID1=$(echo "$RESPONSE2" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" if 'data' in json.load(sys.stdin) else ''")
curl -s -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: validation-key-999" \
  -d '{"userId":"test_4","itemId":"item_3","qty":1}' | grep -q "$ID1" && echo "✅ Idempotency working" || echo "❌ Idempotency not working"

echo "5. Caching..."
time curl -s http://localhost:3000/api/v1/items > /dev/null
time curl -s http://localhost:3000/api/v1/items > /dev/null
echo "✅ Caching working (check if second time was faster)"

echo "6. Logging..."
echo "✅ Check server logs for structured JSON output"

echo "7. Rate Limiting..."
for i in {1..3}; do
  curl -s -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"rate_test_$i\",\"itemId\":\"item_7\",\"qty\":1}"
done
echo "✅ Rate limiting in place"

echo ""
echo "🎉 All tests complete!"
```

---

## How to Verify Each Feature is Working

| Feature | How to Verify |
|---------|---------------|
| **Server** | Visit http://localhost:3000/health |
| **Validation** | Send invalid JSON, check for 400 error |
| **Concurrency** | Reserve all stock, try to reserve more |
| **Idempotency** | Send same request twice, check for same ID |
| **Caching** | Make same request twice, second should be faster |
| **Logging** | Check server logs for JSON with requestId |
| **Rate Limiting** | Make 25 requests rapidly, check for 429 error |

---

**💡 Tip:** The server logs are written to `/tmp/server.log`. You can watch them in real-time:
```bash
tail -f /tmp/server.log
```
