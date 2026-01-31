# Database Module

## What This Module Teaches

This module demonstrates **database design**, **connection management**, and **SQL operations** using SQLite with better-sqlite3.

## Key Concepts

### 1. SQLite Database Setup

SQLite is a file-based database perfect for learning and small applications:

```bash
# Database is created automatically at configured path
./app.db
```

### 2. Connection Configuration

Optimize SQLite for performance:

```typescript
const db = new Database('app.db', {
  verbose: console.log,        // Log SQL in development
  fileMustExist: false,        // Create if doesn't exist
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Set busy timeout
db.pragma('busy_timeout = 5000');
```

### 3. Schema Design

Design tables with proper constraints:

```sql
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  availableQty INTEGER NOT NULL CHECK(availableQty >= 0),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX idx_items_name ON items(name);
```

### 4. Prepared Statements

Always use prepared statements to prevent SQL injection:

```typescript
// ❌ BAD - SQL injection risk
const query = `SELECT * FROM items WHERE id = '${itemId}'`;

// ✅ GOOD - Prepared statement
const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
```

### 5. Transactions

Use transactions for atomic operations:

```typescript
export function transaction<T>(fn: () => T): T {
  const tx = db.transaction(fn);
  return tx();
}

// Usage
transaction(() => {
  db.prepare('UPDATE items SET availableQty = ...').run();
  db.prepare('INSERT INTO reservations ...').run();
  // Both succeed or both rollback
});
```

## Files in This Directory

### [`index.ts`](index.ts)

Database connection, schema, and health check:
- **Connection management** - Singleton database instance
- **Schema initialization** - Creates tables and indexes
- **Health check** - Verify database connectivity
- **Graceful shutdown** - Close connection properly

### [`seed.ts`](seed.ts)

Database seeding with sample data for testing.

### [`migrate.ts`](migrate.ts)

Migration system for schema versioning.

## Database Schema

### Items Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key |
| `name` | TEXT | Item name |
| `availableQty` | INTEGER | Available quantity |
| `createdAt` | INTEGER | Creation timestamp |
| `updatedAt` | INTEGER | Last update timestamp |

### Reservations Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key |
| `userId` | TEXT | User who reserved |
| `itemId` | TEXT | Item being reserved |
| `qty` | INTEGER | Quantity reserved |
| `status` | TEXT | reserved/confirmed/cancelled/expired |
| `expiresAt` | INTEGER | Expiration timestamp |
| `createdAt` | INTEGER | Creation timestamp |
| `updatedAt` | INTEGER | Last update timestamp |

### Idempotency Keys Table

| Column | Type | Description |
|--------|------|-------------|
| `key` | TEXT | Idempotency key |
| `route` | TEXT | Route identifier |
| `userId` | TEXT | User who made request |
| `responseJson` | TEXT | Stored response |
| `createdAt` | INTEGER | Creation timestamp |

## Important Pragma Settings

### WAL Mode (Write-Ahead Logging)

```typescript
db.pragma('journal_mode = WAL');
```

**Benefits**:
- Better concurrent read/write performance
- Readers don't block writers
- Faster commits

### Foreign Keys

```typescript
db.pragma('foreign_keys = ON');
```

**Benefits**:
- Referential integrity
- Prevents orphaned records

### Performance Optimizations

```typescript
db.pragma('synchronous = NORMAL');    // Faster writes, still safe
db.pragma('cache_size = -64000');     // 64MB cache
db.pragma('temp_store = MEMORY');     // In-memory temp tables
```

## Health Check

Verify database is responsive:

```typescript
export function checkDatabaseHealth(): {
  healthy: boolean;
  latency: number;
} {
  const start = Date.now();
  try {
    db.prepare('SELECT 1').get();
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    return { healthy: false, latency: Date.now() - start };
  }
}
```

## Graceful Shutdown

Close database properly before exit:

```typescript
export function closeDatabase(): void {
  // Finalize WAL
  db.pragma('wal_checkpoint(TRUNCATE)');

  // Close connection
  db.close();
}
```

Handle shutdown signals:

```typescript
process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});
```

## Learning Exercises

### Exercise 1: Add a New Column

```sql
ALTER TABLE items ADD COLUMN description TEXT;
```

### Exercise 2: Create an Index

```sql
CREATE INDEX idx_items_availableQty ON items(availableQty);
```

### Exercise 3: Query with Join

```typescript
const result = db.prepare(`
  SELECT
    r.id,
    i.name as itemName,
    r.qty,
    r.status
  FROM reservations r
  JOIN items i ON r.itemId = i.id
  WHERE r.userId = ?
`).get(userId);
```

## SQLite vs Other Databases

| Feature | SQLite | PostgreSQL | MySQL |
|---------|--------|------------|-------|
| Setup | Zero config | Requires server | Requires server |
| Scalability | Single file | Distributed | Distributed |
| Concurrency | Good (WAL) | Excellent | Excellent |
| Best For | Learning, small apps | Production | Production |
| SQL Support | Most SQL | Full SQL | Most SQL |

## Common SQL Operations

### SELECT - Query Data

```typescript
const items = db.prepare('SELECT * FROM items').all();
const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
```

### INSERT - Create Data

```typescript
db.prepare('INSERT INTO items (id, name, availableQty) VALUES (?, ?, ?)').run(id, name, qty);
```

### UPDATE - Modify Data

```typescript
db.prepare('UPDATE items SET availableQty = ? WHERE id = ?').run(newQty, id);
```

### DELETE - Remove Data

```typescript
db.prepare('DELETE FROM items WHERE id = ?').run(id);
```

### Conditional Update - Prevent Race Conditions

```typescript
// Only updates if condition is met
db.prepare('UPDATE items SET availableQty = availableQty - ? WHERE id = ? AND availableQty >= ?')
  .run(qty, id, qty);
```

## Related Files

- [`../types/index.ts`](../types/index.ts) - Database row types
- [`../services/reservations.ts`](../services/reservations.ts) - Business logic using database
- [`../config/index.ts`](../config/index.ts) - Database path configuration

## Best Practices

### ✅ DO

- Always use prepared statements
- Use transactions for multi-step operations
- Create indexes on frequently queried columns
- Use CHECK constraints for data validation
- Close connections on shutdown

### ❌ DON'T

- Concatenate SQL strings (SQL injection risk)
- Forget to handle transaction errors
- Ignore foreign key constraints
- Store large blobs in SQLite (use file system)
- Use SQLite for high-concurrency production apps

## Testing Database Operations

### View Database Contents

```bash
# Using sqlite3 CLI
sqlite3 app.db "SELECT * FROM items;"
sqlite3 app.db "SELECT * FROM reservations;"

# Check table schema
sqlite3 app.db ".schema items"
```

### Run Queries

```bash
# Check item stock
sqlite3 app.db "SELECT id, name, availableQty FROM items;"

# Find expired reservations
sqlite3 app.db "SELECT * FROM reservations WHERE expiresAt < $(date +%s000);"
```

---

**💡 Tip**: Use `db.verbose(console.log)` in development to see all SQL queries being executed!
