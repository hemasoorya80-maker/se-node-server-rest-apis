# Services Module

## What This Module Teaches

This module demonstrates **business logic**, **database operations**, and **transaction management** for a reservation system. It implements atomic operations to prevent race conditions.

## Key Concepts

### 1. Race Condition Problem

Without atomic operations:

```
Time  | Request A              | Request B
------+-----------------------+-----------------------
t1    | Read: qty = 3         |
t2    |                       | Read: qty = 3
t3    | Reserve 2             |
t4    | Write: qty = 1        |
t5    |                       | Reserve 2
t6    |                       | Write: qty = 1
t7    | Success!              | Success!

Result: Both reserved, but we oversold by 1!
```

### 2. Solution: Conditional Updates

Use atomic database operations:

```sql
UPDATE items
SET availableQty = availableQty - ?
WHERE id = ? AND availableQty >= ?
```

This UPDATE only succeeds if there's enough stock. If not, `changes === 0`.

### 3. Transactions

Use ACID transactions for multi-step operations:

```typescript
export function transaction<T>(fn: () => T): T {
  const tx = db.transaction(fn);
  return tx();
}
```

All operations succeed or all rollback together.

## Files in This Directory

### [`reservations.ts`](reservations.ts)

Reservation business logic:
- **Reserve** - Create reservation with atomic stock decrement
- **Confirm** - Confirm reservation (status transition)
- **Cancel** - Cancel reservation and restore stock
- **Expire** - Expire old reservations
- **Query** - List/get items and reservations

## Operations

### Reserve Operation

Creates a reservation and atomically decrements stock:

```typescript
export function reserveItem(request: ReserveRequest): ReserveResult {
  return transaction(() => {
    // 1. Check if item exists
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);

    if (!item) {
      return { kind: 'NOT_FOUND' };
    }

    // 2. Atomically decrement stock (only if enough available)
    const updateResult = db.prepare(
      'UPDATE items SET availableQty = availableQty - ? WHERE id = ? AND availableQty >= ?'
    ).run(qty, itemId, qty);

    if (updateResult.changes === 0) {
      // Conditional update failed = not enough stock
      return { kind: 'OUT_OF_STOCK', available: item.availableQty };
    }

    // 3. Create reservation
    const reservation = {
      id: `res_${crypto.randomUUID()}`,
      userId,
      itemId,
      qty,
      status: 'reserved',
      expiresAt: Date.now() + timeout,
      createdAt: Date.now()
    };

    db.prepare('INSERT INTO reservations ...').run(reservation);

    return { kind: 'OK', reservation };
  });
}
```

**Result types**:
- `OK` - Reservation created
- `NOT_FOUND` - Item doesn't exist
- `OUT_OF_STOCK` - Not enough stock available
- `INVALID_QUANTITY` - Invalid quantity (too small/large)

### Confirm Operation

Confirms a reservation (status transition: `reserved` → `confirmed`):

```typescript
export function confirmReservation(request: ConfirmRequest): ConfirmResult {
  return transaction(() => {
    // 1. Find reservation
    const reservation = db.prepare(
      'SELECT * FROM reservations WHERE id = ? AND userId = ?'
    ).get(reservationId, userId);

    if (!reservation) {
      return { kind: 'NOT_FOUND' };
    }

    // 2. Check status transitions
    if (reservation.status === 'confirmed') {
      return { kind: 'ALREADY_CONFIRMED' };
    }

    if (reservation.status === 'cancelled') {
      return { kind: 'CANCELLED' };
    }

    // 3. Check if expired
    if (now > reservation.expiresAt) {
      // Restore stock and mark as expired
      db.prepare('UPDATE items SET availableQty = availableQty + ? WHERE id = ?').run(qty, itemId);
      db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run('expired', reservationId);
      return { kind: 'EXPIRED' };
    }

    // 4. Confirm reservation
    db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run('confirmed', reservationId);

    return { kind: 'OK' };
  });
}
```

**Result types**:
- `OK` - Confirmed
- `NOT_FOUND` - Reservation doesn't exist
- `ALREADY_CONFIRMED` - Already confirmed (idempotent)
- `CANCELLED` - Reservation was cancelled
- `EXPIRED` - Reservation has expired

### Cancel Operation

Cancels a reservation and restores stock:

```typescript
export function cancelReservation(request: CancelRequest): CancelResult {
  return transaction(() => {
    // 1. Find reservation
    const reservation = db.prepare(
      'SELECT * FROM reservations WHERE id = ? AND userId = ?'
    ).get(reservationId, userId);

    if (!reservation) {
      return { kind: 'NOT_FOUND' };
    }

    // 2. Check status
    if (reservation.status === 'cancelled') {
      return { kind: 'ALREADY_CANCELLED' };
    }

    if (reservation.status === 'confirmed') {
      return { kind: 'ALREADY_CONFIRMED' };
    }

    // 3. Restore stock (if not already expired)
    if (reservation.status !== 'expired') {
      db.prepare('UPDATE items SET availableQty = availableQty + ? WHERE id = ?').run(qty, itemId);
    }

    // 4. Update status
    db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run('cancelled', reservationId);

    return { kind: 'OK' };
  });
}
```

**Result types**:
- `OK` - Cancelled
- `NOT_FOUND` - Reservation doesn't exist
- `ALREADY_CANCELLED` - Already cancelled (idempotent)
- `ALREADY_CONFIRMED` - Can't cancel confirmed reservations

### Expire Operation

Expires old reservations and restores stock:

```typescript
export function expireReservations(): ExpireResult {
  return transaction(() => {
    // 1. Find all expired reservations
    const expiredReservations = db.prepare(`
      SELECT id, itemId, qty
      FROM reservations
      WHERE status = 'reserved' AND expiresAt < ?
    `).all(now);

    if (expiredReservations.length === 0) {
      return { kind: 'OK', expired: 0 };
    }

    // 2. Process each expired reservation
    for (const resv of expiredReservations) {
      // Restore stock
      db.prepare('UPDATE items SET availableQty = availableQty + ? WHERE id = ?').run(
        resv.qty,
        resv.itemId
      );

      // Mark as expired
      db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run('expired', resv.id);
    }

    return { kind: 'OK', expired: expiredReservations.length };
  });
}
```

## Query Operations

### List Items

```typescript
export function listItems(options: {
  sortBy?: 'name' | 'availableQty';
  sortOrder?: 'asc' | 'desc';
} = {}): Item[] {
  const { sortBy = 'name', sortOrder = 'asc' } = options;

  const items = db.prepare(`
    SELECT id, name, availableQty FROM items
    ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
  `).all();

  return items;
}
```

### Get Item

```typescript
export function getItem(itemId: string): Item | null {
  const item = db.prepare(
    'SELECT id, name, availableQty FROM items WHERE id = ?'
  ).get(itemId);

  return item || null;
}
```

### List User's Reservations

```typescript
export function listReservationsForUser(
  userId: string,
  options: { status?: string } = {}
): Reservation[] {
  const { status } = options;

  let query = 'SELECT * FROM reservations WHERE userId = ?';
  const params = [userId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY createdAt DESC';

  return db.prepare(query).all(...params);
}
```

## Discriminated Unions

All operations return discriminated unions for type safety:

```typescript
type ReserveResult =
  | { kind: 'OK'; reservation: Reservation }
  | { kind: 'NOT_FOUND' }
  | { kind: 'OUT_OF_STOCK'; available: number }
  | { kind: 'INVALID_QUANTITY'; min: number; max: number };

// Usage with type narrowing
const result = reserveItem(request);

if (result.kind === 'OK') {
  console.log(result.reservation.id);
} else if (result.kind === 'OUT_OF_STOCK') {
  console.log(`Only ${result.available} available`);
}
```

## Status Transitions

Valid status transitions:

```
reserved ────────→ confirmed
   │                    │
   ↓                    │
expired               (can't go back)
   │
   ↓
cancelled
```

Rules:
- `reserved` → `confirmed`: OK
- `reserved` → `cancelled`: OK
- `reserved` → `expired`: OK (automatic)
- `cancelled` → `reserved`: Not allowed
- `confirmed` → `cancelled`: Not allowed
- `expired` → `confirmed`: Not allowed

## Batch Operations

### Reserve Multiple Items

All succeed or all fail together:

```typescript
export function reserveMultipleItems(
  userId: string,
  items: Array<{ itemId: string; qty: number }>
): { kind: 'OK'; reservations: Reservation[] } | { kind: 'ERROR'; message: string } {
  return transaction(() => {
    const reservations: Reservation[] = [];

    for (const item of items) {
      const result = reserveItem({ userId, itemId: item.itemId, qty: item.qty });

      if (result.kind !== 'OK') {
        return {
          kind: 'ERROR',
          message: `Failed to reserve item ${item.itemId}`
        };
      }

      if ('reservation' in result) {
        reservations.push(result.reservation);
      }
    }

    return { kind: 'OK', reservations };
  });
}
```

## Cache Invalidation

After modifying data, invalidate cache:

```typescript
// After reserving
invalidateItemCaches(itemId);

// After confirming
invalidateReservationCaches(reservationId, userId);
```

## Statistics

### Get Reservation Statistics

```typescript
export function getReservationStats(): {
  total: number;
  byStatus: Record<string, number>;
  expiredCount: number;
  expiringSoon: number;
} {
  const total = db.prepare('SELECT COUNT(*) as count FROM reservations').get().count;

  const byStatus = {};
  const statusRows = db.prepare(
    'SELECT status, COUNT(*) as count FROM reservations GROUP BY status'
  ).all();

  for (const row of statusRows) {
    byStatus[row.status] = row.count;
  }

  const now = Date.now();
  const expiredCount = db.prepare(
    'SELECT COUNT(*) as count FROM reservations WHERE status = ? AND expiresAt < ?'
  ).get('reserved', now).count;

  const expiringSoon = db.prepare(
    'SELECT COUNT(*) as count FROM reservations WHERE status = ? AND expiresAt >= ? AND expiresAt < ?'
  ).get('reserved', now, now + 5 * 60 * 1000).count;

  return { total, byStatus, expiredCount, expiringSoon };
}
```

## Related Files

- [`../database/index.ts`](../database/index.ts) - Database connection and transactions
- [`../types/index.ts`](../types/index.ts) - Result type definitions
- [`../routes/index.ts`](../routes/index.ts) - API endpoint handlers
- [`../cache/index.ts`](../cache/index.ts) - Cache invalidation

## Best Practices

### ✅ DO

- Use transactions for multi-step operations
- Use conditional updates to prevent race conditions
- Return discriminated unions for type safety
- Restore stock on expiry/cancellation
- Validate status transitions
- Log all state changes

### ❌ DON'T

- Read-then-write (race condition)
- Forget transaction rollback
- Allow invalid status transitions
- Forget to restore stock
- Ignore edge cases

---

**💡 Tip**: The `WHERE availableQty >= ?` condition is what prevents overselling - it's all about atomicity!
