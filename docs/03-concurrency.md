# Lesson 3: Concurrency Control & Atomic Operations

## Learning Objectives

By the end of this lesson, you will understand:
1. What race conditions are and why they're dangerous
2. How to use database transactions for atomicity
3. Conditional updates to prevent overselling
4. How to implement safe stock management

## The Problem: Race Conditions

### Scenario: Overselling Inventory

Imagine you have **1 item** in stock. Two users try to reserve it at the exact same time:

```
Timeline:
Time    Request A                          Request B
───────────────────────────────────────────────────────────
0ms      Read: availableQty = 3           Read: availableQty = 3
1ms      Check: 3 >= 2 ✓                   Check: 3 >= 2 ✓
2ms      Write: availableQty = 1           Write: availableQty = 1
3ms      Return: Success                   Return: Success
```

**Result**: Both requests succeed, but you only had 3 items. Now you've oversold by 1!

### The Root Cause

1. Request A reads the value
2. Request B reads the **same** value (before A writes)
3. Both write based on stale data

This is called a **race condition** - the timing of requests affects correctness.

## The Solution: Atomic Operations

### Key Insight: Check and Update Must Be Atomic

Instead of:
```typescript
// ❌ NOT ATOMIC - Two separate operations
const item = db.getItem(itemId);
if (item.availableQty >= requested) {
  item.availableQty -= requested;  // Another request might sneak in here!
  db.update(item);
}
```

Do this:
```typescript
// ✅ ATOMIC - Single database operation
db.execute(`
  UPDATE items
  SET availableQty = availableQty - ?
  WHERE id = ?
    AND availableQty >= ?
`, [requested, itemId, requested]);
```

### How It Works

The `WHERE availableQty >= ?` condition ensures the update **only succeeds** if there's enough stock.

```
Attempt 1: UPDATE items SET availableQty = 2 WHERE id = 'item_1' AND availableQty >= 3
  → Changes 1 row (success)

Attempt 2: UPDATE items SET availableQty = 2 WHERE id = 'item_1' AND availableQty >= 3
  → Changes 0 rows (fails - only 2 left)
```

### File: [`src/services/reservations.ts`](../src/services/reservations.ts)

```typescript
export function reserveItem(request: ReserveRequest): ReserveResult {
  return transaction(() => {
    // Step 1: Check if item exists
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    if (!item) return { kind: 'NOT_FOUND' };

    // Step 2: Atomically decrement stock
    const updated = db.prepare(`
      UPDATE items
      SET availableQty = availableQty - ?
      WHERE id = ? AND availableQty >= ?
    `).run(qty, itemId, qty);

    if (updated.changes === 0) {
      return { kind: 'OUT_OF_STOCK', available: item.availableQty };
    }

    // Step 3: Create reservation (only if stock update succeeded)
    db.prepare(`INSERT INTO reservations ...`).run(...);

    return { kind: 'OK', reservation };
  });
}
```

## Database Transactions

Transactions ensure **all-or-nothing** execution:

```typescript
transaction(() => {
  // All these operations succeed or none do
  step1();
  step2();
  step3();
});
```

If any step fails:
1. All changes are rolled back
2. Database returns to previous state
3. No partial updates occur

## Concurrency Control Patterns

### 1. Compare-and-Set (CAS)
```sql
UPDATE items
SET availableQty = availableQty - 1, version = version + 1
WHERE id = ? AND version = ?
```

### 2. Pessimistic Locking
```typescript
db.transaction(() => {
  db.execute('SELECT * FROM items WHERE id = ? FOR UPDATE', [id]);
  // No one can modify this row until transaction commits
});
```

### 3. Optimistic Locking (What we use)
```typescript
UPDATE items
SET availableQty = availableQty - ?
WHERE id = ? AND availableQty >= ?
```

## Testing Race Conditions

### Simulate Concurrent Requests

```bash
# Terminal 1: Reserve 2 items
curl -X POST http://localhost:3000/api/v1/reserve \
  -d '{"userId":"user_1","itemId":"item_1","qty":2}'

# Terminal 2: At the same time, reserve 2 items
curl -X POST http://localhost:3000/api/v1/reserve \
  -d '{"userId":"user_2","itemId":"item_1","qty":2}'
```

### Expected Result
- First request: Success (reserves 2)
- Second request: Fails (OUT_OF_STOCK)

## In This Repository

| File | Purpose |
|------|---------|
| [`src/services/reservations.ts`](../src/services/reservations.ts) | Atomic business logic |
| [`src/database/index.ts`](../src/database/index.ts) | Transaction helper |
| [`src/routes/index.ts`](../src/routes/index.ts) | Usage in endpoints |

## Real-World Examples

### E-Commerce: Inventory Management
```sql
UPDATE products
SET stock = stock - ?
WHERE id = ? AND stock >= ?
```

### Banking: Account Balance
```sql
UPDATE accounts
SET balance = balance - ?
WHERE id = ? AND balance >= ?
```

### Ticket Booking: Seat Selection
```sql
UPDATE seats
SET status = 'reserved'
WHERE event_id = ? AND seat_number = ? AND status = 'available'
```

## Common Pitfalls

### ❌ DON'T: Check Then Act
```typescript
const stock = getItemStock(itemId);
if (stock >= qty) {
  reserveItem(itemId, qty);  // Race condition!
}
```

### ✅ DO: Atomic Check-and-Set
```typescript
const result = db.prepare(`
  UPDATE items
  SET availableQty = availableQty - ?
  WHERE id = ? AND availableQty >= ?
`).run(qty, itemId, qty);

if (result.changes === 0) {
  return { error: 'OUT_OF_STOCK' };
}
```

### ❌ DON'T: Use Application Locks
```typescript
// Bad: Doesn't work across multiple server instances
let lock = false;
if (!lock) {
  lock = true;
  // ... do work ...
  lock = false;
}
```

### ✅ DO: Use Database Transactions
```typescript
// Good: Database handles locking correctly
db.transaction(() => {
  // ... do work ...
});
```

## Key Takeaways

1. **Race conditions** = timing affects correctness
2. **Atomic operations** = check and update together
3. **Transactions** = all-or-nothing execution
4. **Conditional updates** = `WHERE` clause prevents invalid states
5. **Test concurrent requests** = verify no overselling

## Exercise

**Task**: What happens if you remove the `AND availableQty >= ?` condition?

1. Edit [`src/services/reservations.ts`](../src/services/reservations.ts)
2. Change the UPDATE to:
   ```sql
   UPDATE items SET availableQty = availableQty - ? WHERE id = ?
   ```
3. Run two concurrent reserve requests
4. Check `availableQty` - it will likely be negative!

## Next Lesson

Continue to [Lesson 4: Idempotency](04-idempotency.md) to learn how to handle duplicate requests safely.

---

**💡 Tip**: Use `transaction()` from [`src/database/index.ts`](../src/database/index.ts) to wrap multi-step operations!
