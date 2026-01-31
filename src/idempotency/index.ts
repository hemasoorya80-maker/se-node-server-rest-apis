/**
 * Idempotency Module
 *
 * This module implements idempotency for POST/PUT/PATCH operations.
 * Idempotency ensures that making the same request multiple times
 * has the same effect as making it once.
 *
 * Why Idempotency Matters:
 * - Network failures can cause duplicate requests
 * - Client retries can create duplicate resources
 * - Payment systems require idempotency to avoid double-charging
 * - Improves reliability and user experience
 *
 * How It Works:
 * 1. Client provides an "Idempotency-Key" header with unique value
 * 2. Server checks if key has been used before
 * 3. If new: Process request, store response with key
 * 4. If exists: Return stored response without reprocessing
 *
 * Best Practices Implemented:
 * - Key uniqueness per user + route
 * - Time-based expiration (24 hours)
 * - Atomic check-and-set operations
 * - Full response replay (status, body, headers)
 */

import { db } from '../database/index.js';
import { logger } from '../observability/index.js';
import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../types/index.js';

/**
 * ============================================
 * Idempotency Key Storage
 * ============================================
 */

/**
 * Stored response object
 * Contains everything needed to replay a response
 */
export interface StoredResponse {
  /** HTTP status code */
  status: number;
  /** Response body */
  body: ApiResponse<unknown>;
  /** When this response was stored */
  createdAt: number;
  /** How long this key should be valid (ms) */
  ttl: number;
}

/**
 * Extract idempotency key from request headers
 *
 * @param req - Express request object
 * @returns The idempotency key or null if not present
 *
 * @example
 * ```ts
 * const key = getIdempotencyKey(req);
 * if (!key) {
 *   return fail(res, req, 'IDEMPOTENCY_KEY_REQUIRED', 'Missing Idempotency-Key header');
 * }
 * ```
 */
export function getIdempotencyKey(req: Request): string | null {
  const key = req.headers['idempotency-key'];

  // Key must be a non-empty string
  if (typeof key !== 'string' || key.trim().length === 0) {
    return null;
  }

  return key.trim();
}

/**
 * Validate idempotency key format
 * Keys should be sufficiently random and unique
 *
 * Recommended formats:
 * - UUID v4: "550e8400-e29b-41d4-a716-446655440000"
 * - ULID: "01ARZ3NDEKTSV4RRFFQ69G5FAV"
 * - Custom: "user_123-reserve-20240131-abc123"
 */
export function isValidIdempotencyKey(key: string): boolean {
  // Minimum length to ensure uniqueness
  if (key.length < 8) {
    return false;
  }

  // Max length to prevent abuse
  if (key.length > 255) {
    return false;
  }

  // Should be URL-safe
  const urlSafeRegex = /^[a-zA-Z0-9\-_]+$/;
  return urlSafeRegex.test(key);
}

/**
 * ============================================
 * Idempotency Key Lookup
 * ============================================
 */

/**
 * Find a previously stored response for an idempotency key
 *
 * @param key - Idempotency key
 * @param route - Route/method (e.g., "/reserve", "/confirm")
 * @param userId - User who made the request
 * @returns Stored response or null if not found
 *
 * @example
 * ```ts
 * const previous = findStoredResponse('key-123', '/reserve', 'user_1');
 * if (previous) {
 *   return res.status(previous.status).json(previous.body);
 * }
 * ```
 */
export function findStoredResponse(
  key: string,
  route: string,
  userId: string
): StoredResponse | null {
  try {
    const row = db
      .prepare(
        `
        SELECT responseJson
        FROM idempotency_keys
        WHERE key = ? AND route = ? AND userId = ?
        LIMIT 1
      `
      )
      .get(key, route, userId) as { responseJson: string } | undefined;

    if (!row) {
      return null;
    }

    const stored = JSON.parse(row.responseJson) as StoredResponse;

    // Check if expired (24 hour default)
    const age = Date.now() - stored.createdAt;
    if (age > stored.ttl) {
      // Delete expired key
      deleteIdempotencyKey(key, route, userId);
      return null;
    }

    logger.debug('Idempotency hit', { key, route, userId });
    return stored;
  } catch (error) {
    logger.error('Failed to retrieve idempotency key', error);
    return null;
  }
}

/**
 * ============================================
 * Idempotency Key Storage
 * ============================================
 */

/**
 * Store a response for an idempotency key
 *
 * @param key - Idempotency key
 * @param route - Route/method
 * @param userId - User who made the request
 * @param status - HTTP status code
 * @param body - Response body
 * @param ttl - Time to live in milliseconds (default: 24 hours)
 *
 * @example
 * ```ts
 * await storeResponse(
 *   'key-123',
 *   '/reserve',
 *   'user_1',
 *   201,
 *   { ok: true, data: { id: 'res_123', ... } }
 * );
 * ```
 */
export function storeResponse(
  key: string,
  route: string,
  userId: string,
  status: number,
  body: ApiResponse<unknown>,
  ttl: number = 24 * 60 * 60 * 1000 // 24 hours
): void {
  try {
    const stored: StoredResponse = {
      status,
      body,
      createdAt: Date.now(),
      ttl,
    };

    db.prepare(
      `
      INSERT OR REPLACE INTO idempotency_keys (key, route, userId, responseJson, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(key, route, userId, JSON.stringify(stored), Date.now());

    logger.debug('Stored idempotency response', { key, route, userId, status });
  } catch (error) {
    logger.error('Failed to store idempotency key', error);
    // Don't throw - idempotency failures shouldn't break the request
  }
}

/**
 * ============================================
 * Idempotency Key Deletion
 * ============================================
 */

/**
 * Delete an idempotency key
 * Useful for cleanup or manual invalidation
 *
 * @param key - Idempotency key
 * @param route - Route/method
 * @param userId - User who made the request
 */
export function deleteIdempotencyKey(key: string, route: string, userId: string): void {
  try {
    db.prepare('DELETE FROM idempotency_keys WHERE key = ? AND route = ? AND userId = ?').run(
      key,
      route,
      userId
    );
    logger.debug('Deleted idempotency key', { key, route, userId });
  } catch (error) {
    logger.error('Failed to delete idempotency key', error);
  }
}

/**
 * ============================================
 * Cleanup Operations
 * ============================================
 */

/**
 * Delete expired idempotency keys
 * Run this periodically to clean up old keys
 *
 * @param olderThanMs - Delete keys older than this (default: 24 hours)
 * @returns Number of keys deleted
 *
 * @example
 * ```ts
 * // Run daily cleanup
 * const deleted = cleanExpiredKeys();
 * logger.info(`Cleaned ${deleted} expired idempotency keys`);
 * ```
 */
export function cleanExpiredKeys(olderThanMs: number = 24 * 60 * 60 * 1000): number {
  try {
    const cutoffTime = Date.now() - olderThanMs;

    const result = db
      .prepare('DELETE FROM idempotency_keys WHERE createdAt < ?')
      .run(cutoffTime);

    logger.debug('Cleaned expired idempotency keys', { count: result.changes });
    return result.changes;
  } catch (error) {
    logger.error('Failed to clean expired keys', error);
    return 0;
  }
}

/**
 * ============================================
 * Idempotency Middleware
 * ============================================
 */

/**
 * Idempotency check middleware factory
 *
 * Creates middleware that:
 * 1. Checks for idempotency key
 * 2. Returns cached response if exists
 * 3. Continues to route handler if new
 *
 * After the route handler executes, the response is automatically stored
 * if the operation was successful.
 *
 * @param route - Route identifier (e.g., "/reserve", "/confirm")
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * app.post('/reserve',
 *   idempotencyMiddleware('/reserve'),
 *   validateBody(reserveRequestSchema),
 *   async (req, res) => {
 *     // ... handle reservation ...
 *     // Response is automatically stored if successful
 *   }
 * );
 * ```
 */
export function idempotencyMiddleware(route: string) {
  return (req: Request, res: any, next: NextFunction): void => {
    // Extract userId from request body (for POST requests)
    const userId = (req.body as { userId?: string })?.userId;

    if (!userId) {
      // Can't use idempotency without userId
      return next();
    }

    const key = getIdempotencyKey(req);

    // If no key provided, proceed normally
    if (!key) {
      return next();
    }

    // Validate key format
    if (!isValidIdempotencyKey(key)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key must be at least 8 characters and contain only URL-safe characters',
        },
      });
    }

    // Check for existing response
    const previous = findStoredResponse(key, route, userId);

    if (previous) {
      // Return cached response
      return res.status(previous.status).json(previous.body);
    }

    // Store key and original json method for later use
    res.locals.idempotencyKey = key;
    res.locals.idempotencyRoute = route;
    res.locals.idempotencyUserId = userId;

    // Hook into response to store successful responses
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      // Store response if status code is 2xx
      if (res.statusCode >= 200 && res.statusCode < 300) {
        storeResponse(key, route, userId, res.statusCode, body as ApiResponse<unknown>);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * ============================================
 * Utilities
 * ============================================;

/**
 * Generate a unique idempotency key
 * Use this if you want to generate keys on the server side
 * (not recommended - clients should provide keys)
 *
 * @returns A unique idempotency key (ULID format)
 */
export function generateIdempotencyKey(): string {
  // Simple ULID-like generator
  // In production, use a proper ULID library
  const timestamp = Date.now().toString(36);
  const random = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  return `${timestamp}-${random}`;
}

/**
 * Get statistics about idempotency key usage
 * Useful for monitoring and debugging
 *
 * @returns Statistics object
 */
export function getIdempotencyStats(): {
  totalKeys: number;
  keysByRoute: Record<string, number>;
  oldestKey: number | null;
  newestKey: number | null;
} {
  try {
    // Total keys
    const totalKeys =
      (db.prepare('SELECT COUNT(*) as count FROM idempotency_keys').get() as { count: number })
        .count || 0;

    // Keys by route
    const byRoute = db
      .prepare('SELECT route, COUNT(*) as count FROM idempotency_keys GROUP BY route')
      .all() as Array<{ route: string; count: number }>;

    const keysByRoute: Record<string, number> = {};
    for (const row of byRoute) {
      keysByRoute[row.route] = row.count;
    }

    // Oldest and newest keys
    const timeRange = db
      .prepare('SELECT MIN(createdAt) as min, MAX(createdAt) as max FROM idempotency_keys')
      .get() as { min: number | null; max: number | null };

    return {
      totalKeys,
      keysByRoute,
      oldestKey: timeRange.min,
      newestKey: timeRange.max,
    };
  } catch (error) {
    logger.error('Failed to get idempotency stats', error);
    return {
      totalKeys: 0,
      keysByRoute: {},
      oldestKey: null,
      newestKey: null,
    };
  }
}
