# Complete Postman Testing Guide

This guide shows you how to import and test the entire API using Postman.

## Quick Setup

### 1. Install Postman

Download from: https://www.postman.com/downloads/

### 2. Start the Server

```bash
# Install dependencies
npm install

# Set up database
npm run db:migrate
npm run db:seed

# Start server
npm run dev
```

Server should start at: `http://localhost:3000`

## Import Collection & Environment

### Step 1: Import Collection

1. Open Postman
2. Click **Import** in the top left
3. Drag and drop `postman-collection.json` file
4. Click **Import**

You should see "Reservation System API" in your collections.

### Step 2: Import Environment

1. Click the **gear icon** (top right) → "Manage Environments"
2. Click **Import**
3. Select `postman-environment.json`
4. Click **Import**

### Step 3: Select Environment

In the environment dropdown (top right), select **Reservation API - Local**.

## Collection Structure

The collection is organized into folders:

### 1. Health & Setup
- **Health Check** - Verify server is running
- **Readiness Check** - Check dependencies

### 2. Items
- **List All Items** - Get all items with stock
- **Get Single Item** - Get specific item details

### 3. Reservations
- **Reserve Item** - Create new reservation
- **Confirm Reservation** - Confirm reservation
- **Cancel Reservation** - Cancel reservation
- **Get Reservation** - Get reservation details
- **List User's Reservations** - Get all user's reservations

### 4. Admin
- **Expire Old Reservations** - Manual expiration job

### 5. Feature Tests
Tests for each feature:
- Validation tests (missing fields, invalid values)
- Error tests (404, 409, etc.)
- Idempotency tests
- Rate limiting test

## Testing Features

### Feature 1: Health Check

1. Open **1. Health & Setup** folder
2. Click **Health Check**
3. Click **Send**

**Expected Response** (200):
```json
{
  "ok": true,
  "data": {
    "status": "healthy"
  }
}
```

### Feature 2: List Items

1. Open **2. Items** folder
2. Click **List All Items**
3. Click **Send**

**Expected Response** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "item_1",
      "name": "Wireless Mouse",
      "availableQty": 5
    }
  ]
}
```

### Feature 3: Validation Tests

#### Test 3.1: Missing Field (❌ Should Fail)

1. Open **5. Feature Tests** folder
2. Click **Validation - Missing Field**
3. Click **Send**

**Expected Response** (400):
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

#### Test 3.2: Invalid Quantity (❌ Should Fail)

1. Click **Validation - Invalid Quantity**
2. Click **Send**

**Expected Response** (400):
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "qty",
        "message": "Quantity must be at least 1"
      }
    ]
  }
}
```

#### Test 3.3: Invalid ID Format (❌ Should Fail)

1. Click **Validation - Invalid ID Format**
2. Click **Send**

**Expected Response** (400):
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid user ID format"
  }
}
```

### Feature 4: Reserve Item (✅ Should Succeed)

1. Open **3. Reservations** folder
2. Click **Reserve Item**
3. Click **Send**

**Expected Response** (201):
```json
{
  "ok": true,
  "data": {
    "id": "res_abc123...",
    "userId": "user_1",
    "itemId": "item_1",
    "qty": 1,
    "status": "reserved",
    "expiresAt": 1706720400000
  }
}
```

**Important**: The `reservation_id` is automatically saved to your environment!

### Feature 5: Get Reservation

1. Click **Get Reservation**
2. Click **Send**

Uses the `reservation_id` saved from Feature 4.

**Expected Response** (200):
```json
{
  "ok": true,
  "data": {
    "id": "res_abc123...",
    "status": "reserved"
  }
}
```

### Feature 6: Confirm Reservation

1. Click **Confirm Reservation**
2. Click **Send**

**Expected Response** (200):
```json
{
  "ok": true,
  "data": {
    "status": "confirmed"
  }
}
```

### Feature 7: Idempotency Tests

#### Test 7.1: First Request

1. Open **5. Feature Tests** folder
2. Click **Idempotency Test 1**
3. Note the timestamp in the Idempotency-Key header
4. Click **Send**

Save the `reservation_id` from response.

#### Test 7.2: Duplicate Request

1. Click **Idempotency Test 2**
2. **IMPORTANT**: Edit the Idempotency-Key to use the SAME timestamp as Test 1
3. Click **Send**

**Expected**: Returns the SAME `reservation_id` as Test 1!

### Feature 8: Rate Limiting

1. Click **Rate Limit Test**
2. Click the **...** menu → "Run collection"
3. Select only "Rate Limit Test"
4. Set iterations to **25**
5. Click **Run**

**Expected**:
- Requests 1-20: ✅ Success (201)
- Requests 21-25: ❌ Rate Limited (429)

**Rate Limited Response** (429):
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

### Feature 9: Out of Stock (❌ Should Fail)

1. Click **Conflict - Out of Stock**
2. Click **Send**

**Expected Response** (409):
```json
{
  "ok": false,
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "Not enough stock available",
    "details": {
      "itemId": "item_1",
      "requested": 9999,
      "available": 5
    }
  }
}
```

### Feature 10: Not Found (❌ Should Fail)

1. Click **Not Found - Invalid Item**
2. Click **Send**

**Expected Response** (404):
```json
{
  "ok": false,
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Item not found"
  }
}
```

## Complete Workflow Test

Run through this full workflow:

1. **List Items** - See what's available
2. **Reserve Item** - Create a reservation (saves `reservation_id`)
3. **Get Reservation** - Check the reservation details
4. **Confirm Reservation** - Confirm the reservation
5. **Try to Cancel** - Should fail (already confirmed)

## Environment Variables

The environment uses these variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| `base_url` | `http://localhost:3000` | API base URL |
| `user_id` | `user_1` | Test user ID |
| `item_id` | `item_1` | Test item ID |
| `reservation_id` | Auto-saved | Latest reservation ID |

## Changing Test Data

### Use Different User

1. Click the environment dropdown (top right)
2. Click **Edit** next to "Reservation API - Local"
3. Change `user_id` to `user_2`
4. Click **Save**
5. Click **Send** on any request

### Use Different Item

1. Edit environment
2. Change `item_id` to `item_2`
3. Save

## Collection Runner (Automated Testing)

### Run All Tests

1. Click **...** on "Reservation System API" collection
2. Select **Run collection**
3. Choose which requests to run (or "Run all")
4. Set iteration count (usually 1)
5. Click **Run**

### Run Feature Tests Only

1. Expand **5. Feature Tests** folder
2. Click **...** on the folder
3. Select **Run collection**
4. All feature tests will run

## Response Validation

The collection includes test scripts that:
- ✅ Auto-save `reservation_id` after successful reservation
- ✅ Verify response status codes
- ✅ Check response format

View test results:
1. Click the **Test Results** tab
2. See which tests passed/failed

## Tips

### Tips for Idempotency Test

The idempotency test uses `{{$timestamp}}` which generates a timestamp.

To make it work:
1. Run **Idempotency Test 1**
2. **Quickly** copy the Idempotency-Key from the headers
3. Paste it into **Idempotency Test 2**
4. Run Test 2 within a few seconds

Or edit the keys manually:
1. Test 1: `test-idempotency-123`
2. Test 2: `test-idempotency-123` (same!)

### Tips for Rate Limiting

- Use Collection Runner for rate limit test
- Don't wait too long between requests (10 second window)
- Check response headers for `X-RateLimit-Remaining`

### Viewing Server Logs

While testing, watch the server logs:
```bash
npm run dev
```

You'll see structured logs for each request with:
- Request ID
- Method and path
- Status code
- Duration

## Troubleshooting

### "Cannot GET /api/v1/items"

**Problem**: Server not running

**Solution**:
```bash
npm run dev
```

### "Database is locked"

**Problem**: Multiple server instances running

**Solution**:
```bash
# Kill all node processes
pkill -9 node

# Restart
npm run dev
```

### "reservation_id" Not Saving

**Problem**: Request failed or didn't return 201

**Solution**:
1. Check response body
2. Fix the error
3. Try again

### Rate Limit Not Working

**Problem**: Requests not hitting rate limit

**Solution**:
- Make sure you're using the same IP
- Check `X-RateLimit-Limit` header in response
- Don't wait too long between requests (10 second window)

## What Each Test Validates

| Test | Validates | Expected Status |
|------|-----------|-----------------|
| Health Check | Server running | 200 |
| List Items | Data retrieval | 200 |
| Reserve Item | Create resource | 201 |
| Validation - Missing Field | Input validation | 400 |
| Validation - Invalid Qty | Input validation | 400 |
| Not Found | Error handling | 404 |
| Out of Stock | Business logic | 409 |
| Idempotency Test 1 | First request | 201 |
| Idempotency Test 2 | Duplicate key | 201 (same ID) |
| Rate Limit (1-20) | Under limit | 201 |
| Rate Limit (21+) | Over limit | 429 |

## Success Criteria

You've successfully tested everything when:

✅ Health check returns 200
✅ Can list items
✅ Can reserve item (reservation_id saved)
✅ Validation errors return 400
✅ Not found returns 404
✅ Out of stock returns 409
✅ Idempotency returns same ID
✅ Rate limited after 20 requests
✅ Can confirm reservation
✅ Can get reservation details

---

**💡 Tip**: Use Postman's "History" tab to see all your requests and their responses!
