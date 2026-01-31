/**
 * Rate Limiting Middleware Module
 *
 * This module implements rate limiting to prevent abuse and ensure fair usage.
 * It uses the token bucket algorithm for accurate rate limiting.
 *
 * Why Rate Limiting Matters:
 * - Prevents API abuse and DDoS attacks
 * - Ensures fair resource allocation
 * - Protects against brute force attacks
 * - Manages server load during traffic spikes
 * - Controls costs (cloud computing, database, etc.)
 *
 * Token Bucket Algorithm:
 * - Each user has a bucket of tokens
 * - Tokens refill at a constant rate
 * - Each request consumes tokens
 * - Request is denied if bucket is empty
 *
 * Best Practices Implemented:
 * - Per-user rate limiting
 * - Configurable windows and limits
 * - Gradual slowdown before hard limit
 * - Whitelist support for trusted users
 * - Distributed-friendly (can use Redis)
 *
 * Note: For production, consider using Redis-backed rate limiting for distributed systems
 */

import type { Request, Response, NextFunction } from 'express';
import { appConfig } from '../config/index.js';
import { logger } from '../observability/index.js';
import { tooManyRequests } from '../http/index.js';

/**
 * ============================================
 * Rate Limit Data Structures
 * ============================================
 */

/**
 * Token bucket state for a single identifier
 */
interface TokenBucket {
  /** Current number of tokens in bucket */
  tokens: number;
  /** When the bucket was last updated (timestamp) */
  lastUpdate: number;
}

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum number of requests per window */
  maxRequests: number;
  /** Key generator function (default: by IP) */
  keyGenerator?: (req: Request) => string;
  /** Skip function (return true to bypass rate limit) */
  skip?: (req: Request) => boolean;
  /** Custom handler when limit is exceeded */
  handler?: (req: Request, res: Response) => void;
  /** Include rate limit info in headers? */
  standardHeaders?: boolean;
  /** Trust proxy? (for X-Forwarded-For) */
  trustProxy?: boolean;
}

/**
 * Rate limit information for headers
 */
interface RateLimitInfo {
  /** How many requests remaining */
  remaining: number;
  /** When the limit resets (Unix timestamp) */
  resetTime: number;
}

/**
 * ============================================
 * In-Memory Storage
 * ============================================
 */

/**
 * Rate limit storage
 * In production, use Redis for distributed systems
 */
const rateLimitStore = new Map<string, TokenBucket>();

/**
 * Cleanup interval reference
 */
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * ============================================
 * Token Bucket Algorithm
 * ============================================
 */

/**
 * Calculate new token count based on time elapsed
 *
 * @param bucket - Current bucket state
 * @param maxTokens - Maximum tokens (capacity)
 * @param refillRate - Tokens per millisecond
 * @returns Updated token count
 */
function refillTokens(bucket: TokenBucket, maxTokens: number, refillRate: number): number {
  const now = Date.now();
  const elapsed = now - bucket.lastUpdate;

  // Calculate how many tokens to add
  const tokensToAdd = elapsed * refillRate;

  // Refill tokens up to max capacity
  bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
  bucket.lastUpdate = now;

  return bucket.tokens;
}

/**
 * Check and consume tokens
 *
 * @param key - Rate limit key
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum requests per window
 * @returns Rate limit info
 */
function consumeTokens(
  key: string,
  windowMs: number,
  maxRequests: number
): { allowed: boolean } & RateLimitInfo {
  const now = Date.now();
  const refillRate = maxRequests / windowMs; // Tokens per millisecond

  // Get or create bucket
  let bucket = rateLimitStore.get(key);
  if (!bucket) {
    bucket = {
      tokens: maxRequests,
      lastUpdate: now,
    };
    rateLimitStore.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  refillTokens(bucket, maxRequests, refillRate);

  // Check if tokens available
  if (bucket.tokens < 1) {
    // Calculate reset time
    const timeUntilReset = Math.ceil((1 - bucket.tokens) / refillRate);
    const resetTime = now + timeUntilReset;

    return {
      allowed: false,
      remaining: 0,
      resetTime,
    };
  }

  // Consume one token
  bucket.tokens -= 1;

  return {
    allowed: true,
    remaining: Math.floor(bucket.tokens),
    resetTime: now + windowMs,
  };
}

/**
 * ============================================
 * Default Key Generator
 * ============================================
 */

/**
 * Generate rate limit key from request
 * Uses IP address by default
 *
 * @param req - Express request
 * @param trustProxy - Whether to trust proxy headers
 * @returns Rate limit key
 */
function getDefaultKey(req: Request, trustProxy: boolean = false): string {
  // Try to get real IP from proxy headers
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string') {
      return realIp;
    }
  }

  // Fall back to socket address
  return req.socket.remoteAddress || 'unknown';
}

/**
 * ============================================
 * Rate Limit Middleware Factory
 * ============================================
 */

/**
 * Create a rate limiting middleware
 *
 * @param config - Rate limit configuration
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * // Strict rate limit for mutations
 * const mutationLimit = createRateLimiter({
 *   windowMs: 10_000,  // 10 seconds
 *   maxRequests: 20,    // 20 requests per window
 * });
 *
 * app.post('/reserve', mutationLimit, handler);
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs = appConfig.RATE_LIMIT_WINDOW_MS,
    maxRequests = appConfig.RATE_LIMIT_MAX_REQUESTS,
    keyGenerator = (req: Request) => getDefaultKey(req, config.trustProxy),
    skip = () => false,
    handler,
    standardHeaders = true,
    trustProxy = false,
  } = config;

  return (req: Request, res: any, next: NextFunction): void => {
    // Skip if configured
    if (skip(req)) {
      return next();
    }

    // Generate key for this request
    const key = keyGenerator(req);

    // Check rate limit
    const result = consumeTokens(key, windowMs, maxRequests);

    // Add rate limit headers
    if (standardHeaders) {
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    }

    // Store rate limit info for later use
    (req as any).rateLimit = {
      limit: maxRequests,
      remaining: result.remaining,
      reset: result.resetTime,
    };

    // Check if allowed
    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        key,
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      // Use custom handler or default
      if (handler) {
        return handler(req, res);
      }

      // Default handler
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      tooManyRequests(
        res,
        req,
        'RATE_LIMITED',
        `Too many requests. Please retry after ${retryAfter} seconds.`,
        { retryAfter, resetTime: result.resetTime }
      );
    }

    next();
  };
}

/**
 * ============================================
 * Slow Down Middleware (Gradual Rate Limiting)
 * ============================================
 */

/**
 * Create a gradual slowdown middleware
 * Delays responses progressively as limit approaches
 * More user-friendly than hard rate limiting
 *
 * @param config - Slow down configuration
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * const slowDown = createSlowDown({
 *   windowMs: 10_000,
 *   delayAfter: 10,    // Start delaying after 10 requests
 *   delayMs: 500,      // Delay by 500ms
 * });
 *
 * app.use(slowDown);
 * ```
 */
export interface SlowDownConfig {
  /** Time window in milliseconds */
  windowMs?: number;
  /** Number of requests before delaying starts */
  delayAfter?: number;
  /** Delay duration in milliseconds */
  delayMs?: number;
  /** Maximum delay cap (optional) */
  maxDelayMs?: number;
  /** Key generator function */
  keyGenerator?: (req: Request) => string;
  /** Skip function */
  skip?: (req: Request) => boolean;
  /** Trust proxy? */
  trustProxy?: boolean;
}

interface SlowDownCounter {
  count: number;
  windowStart: number;
}

const slowDownStore = new Map<string, SlowDownCounter>();

export function createSlowDown(config: SlowDownConfig = {}) {
  const {
    windowMs = appConfig.SLOW_DOWN_WINDOW_MS,
    delayAfter = appConfig.SLOW_DOWN_DELAY_AFTER,
    delayMs = appConfig.SLOW_DOWN_DELAY_MS,
    maxDelayMs,
    keyGenerator = (req: Request) => getDefaultKey(req, config.trustProxy),
    skip = () => false,
    trustProxy = false,
  } = config;

  return (req: Request, res: any, next: NextFunction): void => {
    // Skip if configured
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create counter
    let counter = slowDownStore.get(key);
    if (!counter || now - counter.windowStart > windowMs) {
      counter = {
        count: 0,
        windowStart: now,
      };
      slowDownStore.set(key, counter);
    }

    // Increment counter
    counter.count++;

    // Calculate delay
    if (counter.count > delayAfter) {
      const excessRequests = counter.count - delayAfter;
      const calculatedDelay = excessRequests * delayMs;
      const finalDelay = maxDelayMs ? Math.min(calculatedDelay, maxDelayMs) : calculatedDelay;

      if (finalDelay > 0) {
        logger.debug('Slowing down request', {
          key,
          count: counter.count,
          delay: finalDelay,
        });

        // Delay before proceeding
        setTimeout(() => next(), finalDelay);
        return;
      }
    }

    next();
  };
}

/**
 * ============================================
 * Predefined Rate Limiters
 * ============================================
 */

/**
 * Strict rate limiter for mutation endpoints
 * 20 requests per 10 seconds
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 10_000,
  maxRequests: 20,
  standardHeaders: true,
});

/**
 * Moderate rate limiter for general API
 * 100 requests per minute
 */
export const moderateRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 100,
  standardHeaders: true,
});

/**
 * Lenient rate limiter for read operations
 * 1000 requests per minute
 */
export const lenientRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 1000,
  standardHeaders: true,
});

/**
 * Slow down middleware
 * Starts delaying after 10 requests
 */
export const slowDown = createSlowDown({
  windowMs: 10_000,
  delayAfter: 10,
  delayMs: 500,
  maxDelayMs: 2000,
});

/**
 * ============================================
 * Store Management
 * ============================================
 */

/**
 * Clean up old entries from rate limit store
 * Run this periodically to free memory
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const maxAge = appConfig.RATE_LIMIT_WINDOW_MS * 2; // Keep entries for 2x window time

  let cleaned = 0;
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (now - bucket.lastUpdate > maxAge) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('Cleaned up rate limit entries', { count: cleaned });
  }
}

/**
 * Clear all rate limit data
 * Useful for testing
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
  slowDownStore.clear();
  logger.debug('Rate limit store cleared');
}

/**
 * Get rate limit statistics
 * Useful for monitoring
 */
export function getRateLimitStats(): {
  totalKeys: number;
  rateLimitEntries: number;
  slowDownEntries: number;
} {
  return {
    totalKeys: rateLimitStore.size,
    rateLimitEntries: rateLimitStore.size,
    slowDownEntries: slowDownStore.size,
  };
}

/**
 * ============================================
 * Initialization & Cleanup
 * ============================================
 */

/**
 * Initialize rate limiting
 * Starts periodic cleanup of old entries
 */
export function initializeRateLimiting(): void {
  if (!cleanupInterval) {
    // Run cleanup every 5 minutes
    cleanupInterval = setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
    logger.info('Rate limiting initialized');
  }
}

/**
 * Shutdown rate limiting
 * Stops cleanup interval
 */
export function shutdownRateLimiting(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('Rate limiting shutdown');
  }
}

// Auto-initialize on module load
initializeRateLimiting();

// Cleanup on process exit
process.on('beforeExit', shutdownRateLimiting);
process.on('SIGINT', shutdownRateLimiting);
process.on('SIGTERM', shutdownRateLimiting);
