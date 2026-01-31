# Cache Module

## What This Module Teaches

This module demonstrates how to implement **in-memory caching** with automatic invalidation.

## Key Concepts

### 1. Cache with TTL (Time-To-Live)

Data is stored for a limited time before expiring:
```typescript
setCache('key', data, 30000); // Expires after 30 seconds
```

### 2. Cache Invalidation

Remove cached data when it changes:
```typescript
invalidate('items'); // Cache miss next request
```

### 3. Cache Hit vs Miss

- **Hit**: Data returned from cache (fast)
- **Miss**: Data fetched from source (slower), then cached

## Files in This Directory

### [`index.ts`](index.ts)

Main cache implementation with:

- **getCache()** - Retrieve cached value (returns null if expired)
- **setCache()** - Store value with TTL
- **invalidate()** - Remove specific cache entry
- **invalidatePattern()** - Remove matching entries (wildcards)

## Learning Exercises

### Exercise 1: Add a New Cache Entry

```typescript
// Cache user profile for 5 minutes
setCache(`user:${userId}`, userProfile, 5 * 60 * 1000);
```

### Exercise 2: Check Cache Statistics

```typescript
const stats = getCacheStats();
console.log(`Hit rate: ${stats.hitRate * 100}%`);
```

### Exercise 3: Cache Warming

Pre-populate cache on startup:
```typescript
await warmupCache([
  { key: 'items', fn: fetchItems, ttl: 30_000 },
  { key: 'stats', fn: fetchStats, ttl: 60_000 }
]);
```

## Key Functions to Study

| Function | Purpose |
|----------|---------|
| `getCache<T>(key)` | Get cached value or null |
| `setCache<T>(key, value, ttl)` | Store value with expiration |
| `invalidate(key)` | Remove specific cache entry |
| `invalidatePattern(pattern)` | Remove matching entries (e.g., `"item_*"`) |
| `getOrSet(key, fn, ttl)` | Get cached or compute and store |
| `getCacheStats()` | Get hit rate, size, etc. |

## Cache Key Patterns

```typescript
// Items list
CacheKeys.items()           // "items"
CacheKeys.item('item_1')      // "item:item_1"

// Reservations
CacheKeys.userReservations('user_1')  // "reservations:user_1"
CacheKeys.reservation('res_abc')        // "reservation:res_abc"

// Counters
CacheKeys.count('items')      // "items:count"
```

## Testing the Cache

### 1. Cache Miss (Cold Cache)

```bash
# Reset database to clear cache
curl http://localhost:3000/api/v1/items
# First request is slow (DB query)
```

### 2. Cache Hit (Warm Cache)

```bash
# Second request is fast (from cache)
curl http://localhost:3000/api/v1/items
```

### 3. Cache Invalidation

```bash
# Reserve an item
curl -X POST http://localhost:3000/api/v1/reserve \
  -d '{"userId":"user_1","itemId":"item_1","qty":1}'

# Next /items request fetches fresh data (cache invalidated)
curl http://localhost:3000/api/v1/items
```

## Production Considerations

### For Larger Systems, Use Redis

This in-memory cache is perfect for:
- Single-server applications
- Development and testing
- Learning how caching works

For production with multiple servers, use:
- **Redis** - Distributed cache
- **Memcached** - Distributed key-value store

## Related Documentation

- [docs/05-caching.md](../docs/05-caching.md) - Complete caching guide
- [`../routes/index.ts`](../routes/index.ts) - Cache usage in endpoints
- [`../services/reservations.ts`](../services/reservations.ts) - Cache invalidation examples
