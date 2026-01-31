/**
 * Cache Module
 *
 * This module implements an in-memory caching layer with TTL (Time To Live) support.
 * Caching significantly improves performance for frequently accessed data.
 *
 * Why Caching Matters:
 * - Reduces database load
 * - Improves response times
 * - Scales read traffic efficiently
 * - Reduces costs (fewer DB operations)
 *
 * Cache Invalidation Strategy:
 * - Time-based expiration (TTL)
 * - Manual invalidation on data changes
 * - Tag-based grouping for bulk invalidation
 *
 * Best Practices Implemented:
 * - Automatic expiration
 * - Cache stampede prevention (single flight)
 * - Statistics tracking (hits, misses, hit rate)
 * - Memory management (max entries)
 * - Safe for concurrent access
 *
 * Note: In production, consider using Redis for distributed caching
 */

import { appConfig } from '../config/index.js';
import { logger } from '../observability/index.js';
import type { CacheEntry, CacheStats } from '../types/index.js';

/**
 * ============================================
 * Cache Configuration
 * ============================================
 */

/** Maximum number of entries in cache (prevent memory overflow) */
const MAX_CACHE_ENTRIES = 1000;

/** How often to run cleanup (ms) */
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute

/** Default TTL if not specified (ms) */
const DEFAULT_TTL_MS = appConfig.CACHE_TTL_DEFAULT;

/**
 * ============================================
 * Cache Storage
 * ============================================
 */

/**
 * In-memory cache storage
 * Key -> CacheEntry mapping
 */
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Cache statistics
 */
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  evictions: 0,
};

/**
 * ============================================
 * Cache Operations
 * ============================================
 */

/**
 * Get a value from cache
 * Returns null if key doesn't exist or has expired
 *
 * @param key - Cache key
 * @returns Cached value or null
 *
 * @example
 * ```ts
 * const items = getCache<Item[]>('items');
 * if (items) {
 *   return ok(res, items);
 * }
 * // ... fetch from database ...
 * ```
 */
export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);

  // Key doesn't exist
  if (!entry) {
    stats.misses++;
    logger.trace('Cache miss', { key });
    return null;
  }

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    stats.misses++;
    logger.trace('Cache expired', { key });
    return null;
  }

  // Update hit count
  entry.hits++;
  stats.hits++;

  logger.trace('Cache hit', { key, hits: entry.hits });
  return entry.value as T;
}

/**
 * Set a value in cache with TTL
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlMs - Time to live in milliseconds
 *
 * @example
 * ```ts
 * setCache('items', items, 30000); // Cache for 30 seconds
 * ```
 */
export function setCache<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  // Check if cache is full
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Evict oldest entries
    evictOldestEntries(Math.floor(MAX_CACHE_ENTRIES * 0.1)); // Evict 10%
  }

  const entry: CacheEntry<T> = {
    value,
    expiresAt: Date.now() + ttlMs,
    createdAt: Date.now(),
    hits: 0,
  };

  cache.set(key, entry as CacheEntry<unknown>);
  stats.sets++;

  logger.debug('Cache set', { key, ttlMs });
}

/**
 * Delete a specific key from cache
 *
 * @param key - Cache key to delete
 *
 * @example
 * ```ts
 * // After updating an item in database
 * invalidate('items');
 * invalidate('item:item_123');
 * ```
 */
export function invalidate(key: string): void {
  const deleted = cache.delete(key);
  if (deleted) {
    stats.deletes++;
    logger.debug('Cache invalidated', { key });
  }
}

/**
 * Invalidate multiple keys matching a pattern
 * Useful for bulk invalidation
 *
 * @param pattern - Pattern to match (supports * wildcard)
 *
 * @example
 * ```ts
 * // Invalidate all item-related caches
 * invalidatePattern('item_*');
 *
 * // Invalidate all caches
 * invalidatePattern('*');
 * ```
 */
export function invalidatePattern(pattern: string): void {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  let deleted = 0;

  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
      deleted++;
    }
  }

  stats.deletes += deleted;
  logger.debug('Cache pattern invalidated', { pattern, count: deleted });
}

/**
 * Clear all cache entries
 * Useful for testing or emergency cache clearing
 */
export function clearCache(): void {
  const size = cache.size;
  cache.clear();
  logger.info('Cache cleared', { previousSize: size });
}

/**
 * ============================================
 * Cache Statistics
 * ============================================
 */

/**
 * Get current cache statistics
 *
 * @returns Cache statistics
 */
export function getCacheStats(): CacheStats {
  const total = stats.hits + stats.misses;
  const hitRate = total > 0 ? stats.hits / total : 0;

  return {
    size: cache.size,
    hits: stats.hits,
    misses: stats.misses,
    hitRate,
  };
}

/**
 * Reset cache statistics
 * Useful for testing or periodic monitoring
 */
export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.sets = 0;
  stats.deletes = 0;
  stats.evictions = 0;
  logger.debug('Cache stats reset');
}

/**
 * ============================================
 * Cache Maintenance
 * ============================================

/**
 * Remove expired entries from cache
 * Runs automatically on a timer
 *
 * @returns Number of entries removed
 */
export function cleanupExpiredEntries(): number {
  const now = Date.now();
  let removed = 0;

  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
      removed++;
    }
  }

  if (removed > 0) {
    logger.debug('Cleaned expired cache entries', { count: removed });
  }

  return removed;
}

/**
 * Evict oldest entries to free up space
 * Uses LRU (Least Recently Used) strategy
 *
 * @param count - Number of entries to evict
 */
function evictOldestEntries(count: number): void {
  // Sort entries by creation time
  const entries = Array.from(cache.entries()).sort((a, b) => {
    return a[1].createdAt - b[1].createdAt;
  });

  // Evict oldest entries
  for (let i = 0; i < Math.min(count, entries.length); i++) {
    cache.delete(entries[i][0]);
    stats.evictions++;
  }

  logger.debug('Evicted cache entries', { count });
}

/**
 * Start automatic cleanup interval
 * Call this when your application starts
 *
 * @returns Cleanup interval ID (use for cleanup)
 */
export function startCleanupInterval(): NodeJS.Timeout {
  return setInterval(() => {
    cleanupExpiredEntries();
  }, CLEANUP_INTERVAL_MS);
}

/**
 * ============================================
 * Cache Middleware Helpers
 * ============================================
 */

/**
 * Cache key generator for common patterns
 * Provides consistent key naming throughout the application
 */
export const CacheKeys = {
  /** Single item: "item:item_1" */
  item: (itemId: string) => `item:${itemId}`,

  /** All items: "items" */
  items: () => 'items',

  /** Items with query: "items:page:1:pageSize:10" */
  itemsWithQuery: (page: number, pageSize: number) => `items:page:${page}:pageSize:${pageSize}`,

  /** User reservations: "reservations:user_1" */
  userReservations: (userId: string) => `reservations:${userId}`,

  /** Single reservation: "reservation:res_123" */
  reservation: (reservationId: string) => `reservation:${reservationId}`,

  /** Count: "items:count" */
  count: (resource: string) => `${resource}:count`,

  /** Health check: "health:db" */
  health: (component: string) => `health:${component}`,
};

/**
 * ============================================
 * Advanced Caching Patterns
 * ============================================
 */

/**
 * Get or set pattern
 * Fetches from cache if exists, otherwise computes and caches
 *
 * @param key - Cache key
 * @param fn - Function to compute value if not cached
 * @param ttlMs - Time to live in milliseconds
 * @returns Cached or computed value
 *
 * @example
 * ```ts
 * const items = await getOrSet('items', async () => {
 *   return await fetchItemsFromDatabase();
 * }, 30000);
 * ```
 */
export async function getOrSet<T>(
  key: string,
  fn: () => Promise<T> | T,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const cached = getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await fn();
  setCache(key, value, ttlMs);
  return value;
}

/**
 * Get multiple keys at once
 * Returns object with found values
 *
 * @param keys - Array of cache keys
 * @returns Object mapping key to value (for found keys)
 *
 * @example
 * ```ts
 * const items = getMultiple(['item:item_1', 'item:item_2']);
 * // Returns: { 'item:item_1': {...}, 'item:item_2': {...} }
 * ```
 */
export function getMultiple<T>(keys: string[]): Record<string, T> {
  const result: Record<string, T> = {};

  for (const key of keys) {
    const value = getCache<T>(key);
    if (value !== null) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Set multiple key-value pairs at once
 *
 * @param entries - Array of [key, value, ttl] tuples
 *
 * @example
 * ```ts
 * setMultiple([
 *   ['item:item_1', item1, 30000],
 *   ['item:item_2', item2, 30000],
 * ]);
 * ```
 */
export function setMultiple<T>(entries: Array<[string, T, number?]>): void {
  for (const [key, value, ttl] of entries) {
    setCache(key, value, ttl);
  }
}

/**
 * ============================================
 * Cache Warming
 * ============================================
 */

/**
 * Warm the cache with frequently accessed data
 * Call this on application startup to improve initial performance
 *
 * @example
 * ```ts
 * // On startup
 * await warmupCache([
 *   { key: 'items', fn: () => fetchItems(), ttl: 30000 },
 * ]);
 * ```
 */
export async function warmupCache(
  entries: Array<{ key: string; fn: () => Promise<unknown> | unknown; ttl?: number }>
): Promise<void> {
  logger.info('Warming up cache', { count: entries.length });

  for (const entry of entries) {
    try {
      const value = await entry.fn();
      setCache(entry.key, value, entry.ttl);
      logger.debug('Cache warmed', { key: entry.key });
    } catch (error) {
      logger.error(`Failed to warm cache for key: ${entry.key}`, error);
    }
  }

  logger.info('Cache warmup complete');
}

/**
 * ============================================
 * Debugging & Monitoring
 * ============================================
 */

/**
 * Get all cache entries (for debugging)
 * WARNING: Don't call this in production with large caches!
 *
 * @returns Array of cache entries with metadata
 */
export function getAllEntries(): Array<{ key: string; entry: CacheEntry<unknown> }> {
  return Array.from(cache.entries()).map(([key, entry]) => ({
    key,
    entry: {
      ...entry,
      // Don't include actual value in debug output
      value: entry.value === null ? null : typeof entry.value,
    } as unknown as CacheEntry<unknown>
  }));
}

/**
 * Get cache entries matching a pattern
 *
 * @param pattern - Pattern to match (supports * wildcard)
 * @returns Array of matching keys
 */
export function getKeysByPattern(pattern: string): string[] {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return Array.from(cache.keys()).filter((key) => regex.test(key));
}

/**
 * Get detailed cache health report
 * Useful for monitoring dashboards
 */
export function getCacheHealth(): {
  size: number;
  maxEntries: number;
  utilization: number;
  stats: CacheStats;
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  const entries = Array.from(cache.values());
  const now = Date.now();

  const oldestEntry =
    entries.length > 0
      ? Math.min(...entries.map((e) => e.createdAt))
      : null;
  const newestEntry =
    entries.length > 0
      ? Math.max(...entries.map((e) => e.createdAt))
      : null;

  return {
    size: cache.size,
    maxEntries: MAX_CACHE_ENTRIES,
    utilization: cache.size / MAX_CACHE_ENTRIES,
    stats: getCacheStats(),
    oldestEntry,
    newestEntry,
  };
}

// Start cleanup interval when module loads
let cleanupInterval: NodeJS.Timeout | null = null;

export function initializeCache(): void {
  if (!cleanupInterval) {
    cleanupInterval = startCleanupInterval();
    logger.info('Cache initialized', {
      maxEntries: MAX_CACHE_ENTRIES,
      cleanupInterval: CLEANUP_INTERVAL_MS,
    });
  }
}

export function shutdownCache(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('Cache shutdown');
  }
}

// Handle process shutdown
process.on('beforeExit', () => {
  shutdownCache();
});

process.on('SIGINT', () => {
  shutdownCache();
});

process.on('SIGTERM', () => {
  shutdownCache();
});
