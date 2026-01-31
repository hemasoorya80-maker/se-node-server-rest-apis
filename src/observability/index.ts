/**
 * Observability Module
 *
 * This module provides structured logging, request tracing, and metrics collection.
 * It uses Pino for high-performance structured logging.
 *
 * Best Practices Implemented:
 * - Structured JSON logging (machine-readable)
 * - Request ID tracking for distributed tracing
 * - Request duration logging
 * - Error tracking with context
 * - Log levels (trace, debug, info, warn, error, fatal)
 * - Safe logging (no secrets/credentials)
 * - Performance metrics
 *
 * Why Structured Logging?
 * - Easy to parse and query in log aggregators (ELK, Splunk, etc.)
 * - Consistent format across all logs
 * - Rich context for debugging
 * - Better filtering and searching
 */

import pino from 'pino';
import crypto from 'node:crypto';
import { appConfig } from '../config/index.js';
import type { Request, Response, NextFunction } from 'express';
import type { LogLevel, LogEntry, HttpLogEntry } from '../types/index.js';

/**
 * ============================================
 * Logger Configuration
 * ============================================
 */

/**
 * Pino logger configuration
 * Uses pretty print in development, JSON in production
 */
const logConfig: pino.LoggerOptions = {
  level: appConfig.LOG_LEVEL,
  // Redact sensitive fields from logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.apiKey',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
  // Add timestamp to all logs
  timestamp: pino.stdTimeFunctions.isoTime,
  // Formatters
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

/**
 * Create base logger instance
 * Export this for use throughout the application
 */
export const logger = pino(logConfig);

/**
 * Create a child logger with additional context
 *
 * @example
 * ```ts
 * const log = createLogger({ component: 'reservations', action: 'confirm' });
 * log.info('Confirming reservation');
 * ```
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * ============================================
 * Structured Logging Functions
 * ============================================
 */

/**
 * Log a trace message (most verbose)
 * Use for detailed debugging information
 */
export function logTrace(msg: string, context?: Record<string, unknown>): void {
  logger.trace({ ...context }, msg);
}

/**
 * Log a debug message
 * Use for debugging information during development
 */
export function logDebug(msg: string, context?: Record<string, unknown>): void {
  logger.debug({ ...context }, msg);
}

/**
 * Log an info message
 * Use for general informational messages
 */
export function logInfo(msg: string, context?: Record<string, unknown>): void {
  logger.info({ ...context }, msg);
}

/**
 * Log a warning message
 * Use for unexpected but non-critical issues
 */
export function logWarn(msg: string, context?: Record<string, unknown>): void {
  logger.warn({ ...context }, msg);
}

/**
 * Log an error message
 * Use for errors that need attention
 */
export function logError(msg: string, error?: Error | unknown, context?: Record<string, unknown>): void {
  const errorContext = {
    ...context,
    ...(error instanceof Error && {
      err: pino.stdSerializers.err(error),
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
    }),
  };
  logger.error(errorContext, msg);
}

/**
 * Log a fatal message
 * Use for critical errors that require immediate attention
 */
export function logFatal(msg: string, error?: Error | unknown, context?: Record<string, unknown>): void {
  const errorContext = {
    ...context,
    ...(error instanceof Error && {
      err: pino.stdSerializers.err(error),
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
    }),
  };
  logger.fatal(errorContext, msg);
}

/**
 * ============================================
 * HTTP Request Logging
 * ============================================
 */

/**
 * Log HTTP request with timing information
 * Call this when the request finishes
 */
export function logHttpRequest(context: HttpLogEntry): void {
  const logLevel = getHttpLogLevel(context.status);
  logger[logLevel](
    {
      method: context.method,
      path: context.path,
      status: context.status,
      durationMs: context.durationMs,
      requestId: context.requestId,
      userId: context.userId,
      ip: context.ip,
      userAgent: context.userAgent,
    },
    `${context.method} ${context.path} ${context.status} - ${context.durationMs}ms`
  );
}

/**
 * Determine log level based on HTTP status code
 */
function getHttpLogLevel(status: number): LogLevel {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  if (status >= 300) return 'info';
  if (status >= 200) return 'info';
  return 'warn';
}

/**
 * ============================================
 * Request ID Middleware
 * ============================================
 */

/**
 * Extended Express Request with request ID
 */
export interface RequestWithRequestId extends Request {
  requestId: string;
  startTime?: number;
  log?: pino.Logger;
}

/**
 * Request ID middleware
 * Generates or extracts a unique request ID for tracing
 *
 * - Checks for existing "x-request-id" header
 * - Generates new UUID if not present
 * - Adds to response header for client-side tracking
 */
export function requestIdMiddleware(
  req: RequestWithRequestId,
  res: Response,
  next: NextFunction
): void {
  // Check for incoming request ID header
  const incomingId = req.headers['x-request-id'];

  // Generate or use existing ID
  req.requestId = (typeof incomingId === 'string' ? incomingId : null) || crypto.randomUUID();

  // Add to response headers for client-side tracking
  res.setHeader('x-request-id', req.requestId);

  // Store start time for duration tracking
  req.startTime = Date.now();

  // Add request ID to logger context for this request
  req.log = logger.child({ requestId: req.requestId });

  next();
}

/**
 * ============================================
 * Request Logging Middleware
 * ============================================
 */

/**
 * Request logging middleware
 * Logs HTTP requests with duration, status, and metadata
 */
export function requestLoggingMiddleware(
  req: RequestWithRequestId,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const durationMs = Date.now() - start;

    // Extract user agent
    const userAgent = req.headers['user-agent'];
    // Extract IP (considering proxy headers)
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';

    logHttpRequest({
      timestamp: new Date().toISOString(),
      level: "info",
      msg: `${req.method} ${req.path} ${res.statusCode}`,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
      requestId: req.requestId,
      userId: (req as any).userId,
      ip,
      userAgent,
    } as HttpLogEntry);
  });

  next();
}

/**
 * ============================================
 * Performance Monitoring
 * ============================================
 */

/**
 * Simple performance timer
 * Use to measure execution time of operations
 *
 * @example
 * ```ts
 * const timer = createTimer();
 * // ... do some work ...
 * const duration = timer.end();
 * logInfo('Operation completed', { duration });
 * ```
 */
export function createTimer() {
  const start = Date.now();
  return {
    /** Get elapsed time in milliseconds */
    elapsed(): number {
      return Date.now() - start;
    },
    /** End timer and return duration */
    end(): number {
      return Date.now() - start;
    },
  };
}

/**
 * Measure async function execution time
 *
 * @example
 * ```ts
 * const result = await measure(() => someAsyncOperation(), 'database query');
 * // Logs: "database query completed in 45ms"
 * ```
 */
export async function measure<T>(
  fn: () => Promise<T>,
  label: string,
  context: Record<string, unknown> = {}
): Promise<T> {
  const timer = createTimer();
  try {
    const result = await fn();
    logDebug(`${label} completed`, { ...context, duration: timer.end() });
    return result;
  } catch (error) {
    logError(`${label} failed`, error, { ...context, duration: timer.end() });
    throw error;
  }
}

/**
 * ============================================
 * Metrics Collection
 * ============================================
 */

/**
 * Simple in-memory metrics store
 * In production, use a proper metrics system (Prometheus, DataDog, etc.)
 */
interface Metrics {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, number[]>;
}

const metrics: Metrics = {
  counters: {},
  gauges: {},
  histograms: {},
};

/**
 * Increment a counter metric
 *
 * @example
 * ```ts
 * incrementCounter('requests.total');
 * incrementCounter('requests.post', { route: '/reserve' });
 * ```
 */
export function incrementCounter(
  name: string,
  tags: Record<string, string | number> = {}
): void {
  const key = Object.keys(tags).length > 0 ? `${name}:${JSON.stringify(tags)}` : name;
  metrics.counters[key] = (metrics.counters[key] || 0) + 1;
}

/**
 * Set a gauge metric (current value)
 *
 * @example
 * ```ts
 * setGauge('active_connections', 42);
 * setGauge('memory_usage', process.memoryUsage().heapUsed, { unit: 'bytes' });
 * ```
 */
export function setGauge(
  name: string,
  value: number,
  tags: Record<string, string | number> = {}
): void {
  const key = Object.keys(tags).length > 0 ? `${name}:${JSON.stringify(tags)}` : name;
  metrics.gauges[key] = value;
}

/**
 * Record a value in a histogram metric
 *
 * @example
 * ```ts
 * recordHistogram('request_duration', 123);
 * recordHistogram('response_size', 4567, { endpoint: '/items' });
 * ```
 */
export function recordHistogram(
  name: string,
  value: number,
  tags: Record<string, string | number> = {}
): void {
  const key = Object.keys(tags).length > 0 ? `${name}:${JSON.stringify(tags)}` : name;
  if (!metrics.histograms[key]) {
    metrics.histograms[key] = [];
  }
  metrics.histograms[key].push(value);
}

/**
 * Get current metrics
 * Useful for health endpoints and monitoring
 */
export function getMetrics(): Metrics {
  return metrics;
}

/**
 * Reset all metrics
 * Useful for testing or periodic reset
 */
export function resetMetrics(): void {
  metrics.counters = {};
  metrics.gauges = {};
  metrics.histograms = {};
}

/**
 * Calculate histogram statistics
 */
export function calculateHistogramStats(values: number[]): {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
} {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);

  const percentile = (p: number) => {
    const index = Math.floor((p / 100) * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)];
  };

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
  };
}

/**
 * ============================================
 * Error Tracking
 * ============================================
 */

/**
 * Track error occurrences
 * Useful for monitoring and alerting
 */
interface ErrorTracker {
  [errorCode: string]: {
    count: number;
    lastSeen: number;
    lastMessage: string;
  };
}

const errorTracker: ErrorTracker = {};

/**
 * Track an error occurrence
 * Automatically called by error response helpers
 */
export function trackError(code: string, message: string): void {
  if (!errorTracker[code]) {
    errorTracker[code] = {
      count: 0,
      lastSeen: 0,
      lastMessage: '',
    };
  }

  errorTracker[code].count++;
  errorTracker[code].lastSeen = Date.now();
  errorTracker[code].lastMessage = message;
}

/**
 * Get error tracking data
 */
export function getErrorTracker(): ErrorTracker {
  return { ...errorTracker };
}

/**
 * Reset error tracker
 */
export function resetErrorTracker(): void {
  Object.keys(errorTracker).forEach((key) => {
    delete errorTracker[key];
  });
}

/**
 * ============================================
 * Health Check Metrics
 * ============================================
 */

/**
 * Application health metrics
 * Updated periodically for monitoring
 */
export interface HealthMetrics {
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  metrics: Metrics;
  errors: ErrorTracker;
}

/**
 * Get current health metrics
 */
export function getHealthMetrics(): HealthMetrics {
  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    metrics: getMetrics(),
    errors: getErrorTracker(),
  };
}
