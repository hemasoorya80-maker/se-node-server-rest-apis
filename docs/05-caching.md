# Lesson 5: Caching with Automatic Invalidation

## Learning Objectives

By the end of this lesson, you will understand:
1. Why caching matters for API performance
2. How to implement time-based expiration (TTL)
3. How to invalidate cache when data changes
4. Common caching patterns and pitfalls

## The Problem: Repeated Database Queries

### Scenario: Frequent Reads, Infrequent Writes

Imagine 100 users request the items list at the same time:

```
Request 1: SELECT * FROM items (100ms)
Request 2: SELECT * FROM items (100ms)
Request 3: SELECT * FROM items (100ms)
...
Request 100: SELECT * FROM items (100ms)
```

**Problem**:
- Database does the same work 100 times
- Response time is slow (100ms each)
- Database CPU is wasted

## The Solution: In-Memory Cache

### Key Idea: Store Frequently Accessed Data in Memory

```
First request:
  → Cache miss
  → Query database
  → Store in cache (30 second TTL)
  → Return response

Next 99 requests:
  → Cache hit!
  → Return cached data immediately
```

### File: [`src/cache/index.ts`](../src/cache/index.ts)

```typescript
const cache = new Map();

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check expiration
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
    createdAt: Date.now(),
    hits: 0
  });
}
```

## TTL (Time To Live)

### Why Expiration Matters

1. **Freshness** - Data changes, cache should reflect that
2. **Memory** - Unlimited cache = memory leak
3. **Staleness** - Old data eventually expires

### Choosing TTL Values

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Items list | 30 seconds | Changes on reserve/confirm |
| Single item | 30 seconds | Changes on reserve/confirm |
| User profile | 5 minutes | Infrequent changes |
| Configuration | 1 hour | Rarely changes |

### File: [`src/routes/index.ts`](../src/routes/index.ts)

```typescript
app.get('/items', async (req, res) => {
  const cached = getCache('items');
  if (cached) {
    logger.debug('Cache hit for items');
    return ok(res, cached);
  }

  const items = listItems();
  setCache('items', items, 30_000); // 30 seconds

  return ok(res, items);
});
```

## Cache Invalidation

### The Golden Rule: Invalidate on Change

When data changes, remove it from cache:

```typescript
// After reserving an item
function reserveItem(...) {
  // ... reserve logic ...
  db.prepare('UPDATE items SET availableQty = ...').run();

  // Invalidate cache
  invalidate('items');
  invalidate('item:item_1');
}
```

### File: [`src/cache/index.ts`](../src/cache/index.ts)

```typescript
export function invalidate(key: string): void {
  cache.delete(key);
  logger.debug('Cache invalidated', { key });
}

export function invalidatePattern(pattern: string): void {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}
```

## Caching Patterns

### Pattern 1: Cache-Aside
```typescript
const cached = getCache('items');
if (cached) return cached;

const data = fetchFromDatabase();
setCache('items', data, TTL);
return data;
```

### Pattern 2: Write-Through
```typescript
function updateItem(id, data) {
  db.update(id, data);        // Write to DB
  setCache('item:' + id, data); // Update cache
}
```

### Pattern 3: Write-Behind
```typescript
function getItem(id) {
  const cached = getCache('item:' + id);
  if (cached) {
    // Update cache asynchronously
    fetchFromDatabase(id).then(data => {
      setCache('item:' + id, data);
    });
    return cached;
  }
  return fetchFromDatabase(id);
}
```

## What NOT to Cache

### ❌ Don't Cache

1. **User-specific data** (without scoping)
   ```typescript
   // Bad: Shared across users
   cache.set('user', currentUser);

   // Good: User-scoped
   cache.set(`user:${userId}`, currentUser);
   ```

2. **Frequently changing data**
   ```typescript
   // Bad: Stock changes often
   cache.set('stock:item_1', item.stock);

   // Good: Use short TTL
   cache.set('stock:item_1', item.stock, 5_000); // 5 seconds
   ```

3. **Large responses**
   ```typescript
   // Bad: Cache huge lists
   cache.set('all-reservations', hugeArray);

   // Good: Paginate
   cache.set('reservations:page:1', page1);
   ```

## Cache Statistics

### Monitor Hit Rate

```typescript
export function getCacheStats() {
  return {
    size: cache.size,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits / (stats.hits + stats.misses)
  };
}
```

### What's a Good Hit Rate?

- **90%+** = Excellent
- **70-90%** = Good
- **50-70%** = Fair
- **< 50%** = Consider not caching

## Testing Caching

```bash
# First request - cache miss (slower)
time curl http://localhost:3000/api/v1/items

# Second request - cache hit (much faster!)
time curl http://localhost:3000/api/v1/items

# After reserve - cache invalidated
curl -X POST http://localhost:3000/api/v1/reserve \
  -d '{"userId":"user_1","itemId":"item_1","qty":1}'

# Next get fetches fresh data
time curl http://localhost:3000/api/v1/items
```

## In This Repository

| File | Purpose |
|------|---------|
| [`src/cache/index.ts`](../src/cache/index.ts) | Cache implementation |
| [`src/routes/index.ts`](../src/routes/index.ts) | Cache usage in endpoints |
| [`src/services/reservations.ts`](../src/services/reservations.ts) | Cache invalidation |

## Real-World Examples

### Database Query Caching
```typescript
const users = getCache('all-users') ??
  db.query('SELECT * FROM users').all();
```

### API Response Caching
```typescript
const products = getCache(`products:${page}`) ??
  fetchProductsFromAPI(page);
```

### Computed Value Caching
```typescript
const stats = getCache('user:stats:123') ??
  calculateUserStats('user_123');
```

## Common Pitfalls

### ❌ DON'T: Forget Invalidation
```typescript
// Bad: Cache never invalidated
setCache('items', items, 30_000);

// Later: Items change but cache still has old data
db.update('items', ...);
```

### ✅ DO: Invalidate on Change
```typescript
// Good: Always invalidate
db.update('items', ...);
invalidate('items');
```

### ❌ DON'T: Cache Everything
```typescript
// Bad: Wastes memory
setCache('request-1', response);
setCache('request-2', response);
// ... 1000 more
```

### ✅ DO: Cache Smart
```typescript
// Good: Only cache expensive operations
const result = expensiveQuery();
if (result.duration > 100) {
  setCache(key, result, TTL);
}
```

## Production Considerations

### For Production, Use Redis

```typescript
// In-memory cache (this project)
const cache = new Map();

// Production cache (Redis)
const redis = new Redis();
await redis.set(key, value, 'EX', 30);
```

### Why Redis?

- **Shared** across multiple server instances
- **Persistent** (survives restarts)
- **Distributed** locking
- **Advanced features** (pub/sub, streams)

## Key Takeaways

1. **Cache frequently accessed data** - Reduce database load
2. **Set appropriate TTL** - Balance freshness and performance
3. **Invalidate on change** - Stale data is worse than no cache
4. **Monitor hit rate** - Know if caching is helping
5. **Don't over-cache** - Memory is finite

## Exercise

**Task**: Add caching to a new endpoint

1. Create a `/stats` endpoint that returns reservation statistics
2. Cache the result for 1 minute
3. Invalidate the cache when a new reservation is created
4. Test with `curl -w "@-"`
   ```bash
   curl -w "\nTime: %{time_total}s\n" http://localhost:3000/api/v1/stats
   ```

## Next Lesson

Continue to [Lesson 6: Logging & Observability](06-logging.md) to learn how to make your API debuggable in production.

---

**💡 Tip**: Cache hit rate > 80% is good. Below 50%, consider whether caching is worth it!
