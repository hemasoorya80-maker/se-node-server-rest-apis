/**
 * Type Definitions
 *
 * This file contains all TypeScript types, interfaces, and enums used
 * throughout the application. Having types centralized promotes consistency
 * and makes the codebase easier to understand and maintain.
 */

/**
 * ============================================
 * Domain Entity Types
 * ============================================
 */

/**
 * Item Entity
 * Represents an inventory item that can be reserved
 */
export interface Item {
  /** Unique identifier (e.g., "item_1") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Current available quantity for reservation */
  availableQty: number;
}

/**
 * Reservation Status
 * All possible states for a reservation
 */
export type ReservationStatus =
  | 'reserved' // Item is reserved (initial state)
  | 'confirmed' // Reservation was confirmed (stock permanently allocated)
  | 'cancelled' // Reservation was cancelled (stock returned)
  | 'expired'; // Reservation expired (stock returned, 10 min timeout)

/**
 * Reservation Entity
 * Represents a reservation of an item by a user
 */
export interface Reservation {
  /** Unique reservation identifier (e.g., "res_12345") */
  id: string;
  /** User who made the reservation */
  userId: string;
  /** Item being reserved */
  itemId: string;
  /** Quantity reserved */
  qty: number;
  /** Current status of the reservation */
  status: ReservationStatus;
  /** Unix timestamp when reservation expires (ms) */
  expiresAt: number;
  /** Unix timestamp when reservation was created (ms) */
  createdAt: number;
  /** Unix timestamp when reservation was last updated (ms) - optional */
  updatedAt?: number;
}

/**
 * Idempotency Key Entity
 * Ensures that duplicate requests don't create duplicates
 */
export interface IdempotencyKey {
  /** The idempotency key from request header */
  key: string;
  /** The route/method this key is for (e.g., "/reserve") */
  route: string;
  /** User who made the request */
  userId: string;
  /** Stored JSON response (cached for replay) */
  responseJson: string;
  /** Unix timestamp when this key was created (ms) */
  createdAt: number;
}

/**
 * ============================================
 * API Request/Response Types
 * ============================================
 */

/**
 * Standard Success Response
 * All successful API responses follow this structure
 */
export interface SuccessResponse<T> {
  /** Indicates success */
  ok: true;
  /** Response payload */
  data: T;
  /** Optional metadata (pagination, etc.) */
  meta?: ResponseMeta;
}

/**
 * Standard Error Response
 * All error API responses follow this structure
 */
export interface ErrorResponse {
  /** Indicates failure */
  ok: false;
  /** Error details */
  error: {
    /** Machine-readable error code */
    code: ErrorCode;
    /** Human-readable error message */
    message: string;
    /** Optional additional error details */
    details?: Record<string, unknown>;
    /** Request ID for tracing */
    requestId?: string;
  };
}

/**
 * Combined API Response Type
 * Used for type-safe response handling
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Response Metadata
 * Used for pagination and additional response information
 */
export interface ResponseMeta {
  /** Current page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Total number of items */
  total?: number;
  /** Total number of pages */
  totalPages?: number;
  /** Has next page? */
  hasNext?: boolean;
  /** Has previous page? */
  hasPrev?: boolean;
}

/**
 * ============================================
 * HTTP Error Codes
 * ============================================
 */

/**
 * Application-specific error codes
 * These provide machine-readable error classifications
 */
export type ErrorCode =
  // Validation Errors (400)
  | 'VALIDATION_ERROR' // Request validation failed
  | 'INVALID_BODY' // Request body is malformed
  | 'INVALID_PARAMS' // URL/query parameters are invalid
  | 'MISSING_FIELD' // Required field is missing
  | 'INVALID_FORMAT' // Field format is incorrect (e.g., email)

  // Authentication Errors (401)
  | 'UNAUTHORIZED' // Authentication required

  // Authorization Errors (403)
  | 'FORBIDDEN' // Insufficient permissions

  // Not Found Errors (404)
  | 'NOT_FOUND' // Resource not found
  | 'ITEM_NOT_FOUND' // Item doesn't exist
  | 'RESERVATION_NOT_FOUND' // Reservation doesn't exist
  | 'USER_NOT_FOUND' // User doesn't exist
  | 'ROUTE_NOT_FOUND' // API endpoint doesn't exist

  // Conflict Errors (409)
  | 'CONFLICT' // Request conflicts with current state
  | 'OUT_OF_STOCK' // Not enough inventory
  | 'RESERVATION_EXPIRED' // Reservation has expired
  | 'EXPIRED' // Resource has expired
  | 'CANCELLED' // Resource has been cancelled
  | 'ALREADY_CONFIRMED' // Reservation already confirmed
  | 'ALREADY_CANCELLED' // Reservation already cancelled
  | 'IDEMPOTENCY_KEY_CONFLICT' // Idempotency key already used with different params

  // Validation Errors (422)
  | 'UNPROCESSABLE_ENTITY' // Valid request but semantically incorrect

  // Rate Limiting (429)
  | 'RATE_LIMITED' // Too many requests
  | 'SLOW_DOWN' // Gradual rate limiting

  // Server Errors (500)
  | 'INTERNAL_ERROR' // Unexpected server error
  | 'DATABASE_ERROR' // Database operation failed
  | 'CACHE_ERROR' // Cache operation failed
  | 'IDEMPOTENCY_ERROR' // Idempotency check failed
  | 'SERVICE_UNAVAILABLE'; // Service is down

/**
 * ============================================
 * HTTP Status Codes
 * ============================================
 */

/**
 * HTTP Status Code Enumeration
 * Provides type-safe status codes
 */
export enum HttpStatus {
  // Success
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,

  // Redirection
  NOT_MODIFIED = 304,

  // Client Errors
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,

  // Server Errors
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/**
 * ============================================
 * API Request DTOs (Data Transfer Objects)
 * ============================================
 */

/**
 * Reserve Item Request
 */
export interface ReserveRequest {
  userId: string;
  itemId: string;
  qty: number;
}

/**
 * Confirm Reservation Request
 */
export interface ConfirmRequest {
  userId: string;
  reservationId: string;
}

/**
 * Cancel Reservation Request
 */
export interface CancelRequest {
  userId: string;
  reservationId: string;
}

/**
 * ============================================
 * Pagination & Filtering Types
 * ============================================
 */

/**
 * Pagination Parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Sorting Parameters
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter Parameters
 * Generic filter structure
 */
export interface FilterParams {
  status?: ReservationStatus;
  itemId?: string;
  userId?: string;
}

/**
 * ============================================
 * Result Types for Domain Logic
 * ============================================
 */

/**
 * Result type for reserve operation
 */
export type ReserveResult =
  | { kind: 'OK'; reservation: Reservation }
  | { kind: 'NOT_FOUND' }
  | { kind: 'OUT_OF_STOCK'; available: number }
  | { kind: 'INVALID_QUANTITY'; min: number; max: number };

/**
 * Result type for confirm operation
 */
export type ConfirmResult =
  | { kind: 'OK' }
  | { kind: 'NOT_FOUND' }
  | { kind: 'EXPIRED' }
  | { kind: 'ALREADY_CONFIRMED' }
  | { kind: 'CANCELLED' };

/**
 * Result type for cancel operation
 */
export type CancelResult =
  | { kind: 'OK' }
  | { kind: 'NOT_FOUND' }
  | { kind: 'ALREADY_CANCELLED' }
  | { kind: 'ALREADY_CONFIRMED' };

/**
 * Result type for expire operation
 */
export type ExpireResult =
  | { kind: 'OK'; expired: number }
  | { kind: 'ERROR'; message: string };

/**
 * ============================================
 * Express Extension Types
 * ============================================
 */

/**
 * Extended Request with custom properties
 * These are added by middleware
 */
export interface ExtendedRequest {
  /** Unique request ID for tracing */
  requestId: string;
  /** Request start time for duration tracking */
  startTime?: number;
  /** User ID extracted from auth (future) */
  userId?: string;
}

/**
 * ============================================
 * Database Types
 * ============================================
 */

/**
 * Database row types
 * These match the SQLite schema exactly
 */
export type ItemRow = {
  id: string;
  name: string;
  availableQty: number;
};

export type ReservationRow = {
  id: string;
  userId: string;
  itemId: string;
  qty: number;
  status: string;
  expiresAt: number;
  createdAt: number;
  updatedAt?: number;
};

export type IdempotencyKeyRow = {
  key: string;
  route: string;
  userId: string;
  responseJson: string;
  createdAt: number;
};

/**
 * ============================================
 * Cache Types
 * ============================================
 */

/**
 * Cache entry structure
 */
export interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Expiration timestamp (Unix ms) */
  expiresAt: number;
  /** When this entry was created */
  createdAt: number;
  /** Number of times this entry was accessed */
  hits: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of entries */
  size: number;
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate (0-1) */
  hitRate: number;
}

/**
 * ============================================
 * Logging Types
 * ============================================
 */

/**
 * Log levels
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Structured log entry
 */
export interface LogEntry {
  /** ISO timestamp */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Request ID for tracing */
  requestId?: string;
  /** Log message */
  msg: string;
  /** Additional context */
  [key: string]: unknown;
}

/**
 * HTTP-specific log entry
 */
export interface HttpLogEntry extends LogEntry {
  /** HTTP method */
  method: string;
  /** Request path */
  path: string;
  /** HTTP status code */
  status: number;
  /** Request duration in ms */
  durationMs: number;
  /** User ID if authenticated */
  userId?: string;
  /** IP address */
  ip?: string;
  /** User agent */
  userAgent?: string;
}

/**
 * ============================================
 * Health Check Types
 * ============================================
 */

/**
 * Health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Health check response
 */
export interface HealthCheckResponse {
  /** Overall health status */
  status: HealthStatus;
  /** Current timestamp (ISO) */
  timestamp: string;
  /** Service uptime in seconds */
  uptime: number;
  /** Individual component health */
  checks: {
    database: { status: HealthStatus; latency?: number };
    cache: { status: HealthStatus };
  };
  /** Version info */
  version: string;
}

/**
 * ============================================
 * Metrics Types
 * ============================================
 */

/**
 * API metrics
 */
export interface ApiMetrics {
  /** Total requests */
  totalRequests: number;
  /** Requests by status code */
  requestsByStatus: Record<number, number>;
  /** Requests by route */
  requestsByRoute: Record<string, number>;
  /** Average response time (ms) */
  avgResponseTime: number;
  /** P95 response time (ms) */
  p95ResponseTime: number;
  /** Error rate (0-1) */
  errorRate: number;
}

/**
 * ============================================
 * Utility Types
 * ============================================

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract promise return type
 */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  Awaited<ReturnType<T>>;
