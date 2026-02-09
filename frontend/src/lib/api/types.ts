/**
 * API Type Definitions
 * 
 * This module contains all TypeScript types that define the contract between
 * the frontend and backend. Keeping types in a single location ensures
 * consistency and makes it easier to update when the API changes.
 * 
 * Learning Objectives:
 * 1. Understanding TypeScript interfaces vs types
 * 2. Defining API contracts with types
 * 3. Using type guards for runtime validation
 * 4. Creating maintainable type hierarchies
 * 
 * TypeScript Best Practices Demonstrated:
 * - Use interfaces for object shapes that might be extended
 * - Use type aliases for unions, tuples, and mapped types
 * - Export all types for use across the application
 * - Document complex types with JSDoc comments
 * 
 * @module api/types
 */

// ============================================
// Domain Entity Types
// ============================================

/**
 * Represents an inventory item that can be reserved.
 * 
 * This type mirrors the database schema for the items table.
 * The availableQty field changes dynamically as reservations
 * are made and confirmed.
 * 
 * @interface Item
 */
export interface Item {
  /** Unique identifier in format "item_N" (e.g., "item_1", "item_42") */
  id: string;
  
  /** Human-readable name displayed in the UI */
  name: string;
  
  /** 
   * Current available quantity for reservation.
   * 
   * This is a computed value that accounts for:
   * - Initial stock
   * - Confirmed reservations (permanently reduce stock)
   * - Active reservations (temporarily hold stock)
   * 
   * When this reaches 0, no new reservations can be made.
   */
  availableQty: number;
}

/**
 * All possible states for a reservation.
 * 
 * The status follows a state machine:
 * reserved → confirmed (user completes checkout)
 * reserved → cancelled (user cancels)
 * reserved → expired (10-minute timeout)
 * 
 * Once confirmed, a reservation cannot be cancelled or expire.
 */
export type ReservationStatus =
  | 'reserved'   // Initial state, stock is held but not permanently allocated
  | 'confirmed'  // User completed checkout, stock permanently allocated
  | 'cancelled'  // User cancelled, stock returned to pool
  | 'expired';   // 10-minute timeout reached, stock returned

/**
 * Represents a reservation of an item by a user.
 * 
 * Reservations are time-limited (10 minutes by default) to prevent
 * stock from being held indefinitely by users who don't complete
 * their purchase.
 * 
 * @interface Reservation
 */
export interface Reservation {
  /** 
   * Unique reservation identifier in format "res_UUID"
   * Example: "res_550e8400-e29b-41d4-a716-446655440000"
   */
  id: string;
  
  /** 
   * Identifier of the user who made the reservation.
   * In a real app, this would come from authentication.
   */
  userId: string;
  
  /** 
   * Identifier of the reserved item.
   * References the Item.id field.
   */
  itemId: string;
  
  /** 
   * Quantity reserved.
   * Must be between 1 and 5 (enforced by backend validation).
   */
  qty: number;
  
  /** Current state in the reservation lifecycle */
  status: ReservationStatus;
  
  /** 
   * Unix timestamp (milliseconds) when the reservation expires.
   * 
   * If the reservation is not confirmed by this time, it automatically
   * transitions to 'expired' status and the stock is returned.
   */
  expiresAt: number;
  
  /** Unix timestamp (milliseconds) when the reservation was created */
  createdAt: number;
  
  /** 
   * Unix timestamp (milliseconds) when the reservation was last updated.
   * Optional because not all status changes update this field.
   */
  updatedAt?: number;
}

// ============================================
// API Response Types
// ============================================

/**
 * Standard success response wrapper from the API.
 * 
 * All successful API responses follow this structure, making it easy
 * to handle responses consistently across the application.
 * 
 * @template T - Type of the data payload
 * 
 * @example API Response
 * ```json
 * {
 *   "ok": true,
 *   "data": {
 *     "id": "item_1",
 *     "name": "Wireless Mouse",
 *     "availableQty": 5
 *   }
 * }
 * ```
 */
export interface SuccessResponse<T> {
  /** Always true for successful responses */
  ok: true;
  
  /** The actual response payload */
  data: T;
  
  /** 
   * Optional metadata, typically for paginated responses.
   * Not used in this simple API but included for future expansion.
   */
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

/**
 * Standard error response wrapper from the API.
 * 
 * All error responses follow this structure, allowing the frontend
 * to display meaningful error messages and debugging information.
 * 
 * @example API Error Response
 * ```json
 * {
 *   "ok": false,
 *   "error": {
 *     "code": "OUT_OF_STOCK",
 *     "message": "Not enough items available",
 *     "details": { "available": 2, "requested": 5 },
 *     "requestId": "req_abc123"
 *   }
 * }
 * ```
 */
export interface ErrorResponse {
  /** Always false for error responses */
  ok: false;
  
  /** Error details */
  error: {
    /** 
     * Machine-readable error code.
     * 
     * Common codes:
     * - VALIDATION_ERROR: Input validation failed
     * - NOT_FOUND: Resource doesn't exist
     * - OUT_OF_STOCK: Not enough inventory
     * - CONFLICT: State conflict (e.g., already confirmed)
     * - INTERNAL_ERROR: Unexpected server error
     */
    code: string;
    
    /** Human-readable error message suitable for display */
    message: string;
    
    /** 
     * Additional error context.
     * 
     * For example, OUT_OF_STOCK includes available and requested quantities
     * to help users understand the constraint.
     */
    details?: Record<string, unknown>;
    
    /** 
     * Unique identifier for this error occurrence.
     * 
     * This is included in server logs and can be used for debugging
     * when users report issues. Always display this in error UIs.
     */
    requestId?: string;
  };
}

/**
 * Combined API response type.
 * 
 * This union type represents that any API response is either a success
 * or an error. Using this type enforces that you handle both cases.
 * 
 * @template T - Type of the success data payload
 * 
 * @example Usage in Type Guards
 * ```typescript
 * function handleResponse<T>(response: ApiResponse<T>) {
 *   if (response.ok) {
 *     // TypeScript knows response.data exists here
 *     return response.data;
 *   } else {
 *     // TypeScript knows response.error exists here
 *     throw response.error;
 *   }
 * }
 * ```
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// ============================================
// Error Type
// ============================================

/**
 * Normalized API error for frontend consumption.
 * 
 * This type represents errors after they've been processed by our
 * error handling layer. It provides a consistent structure regardless
 * of the original error source (HTTP error, network error, parsing error).
 * 
 * @interface ApiError
 */
export interface ApiError {
  /** HTTP status code (0 for network errors that never reached the server) */
  status: number;
  
  /** Application-specific error code from the backend */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Additional context from the backend */
  details?: Record<string, unknown>;
  
  /** Request ID for debugging ( correlates with server logs ) */
  requestId?: string;
}

/**
 * Type guard to check if a value is an ApiError.
 * 
 * Type guards are runtime checks that help TypeScript narrow types.
 * This is useful when catching errors from unknown sources.
 * 
 * @param error - Value to check
 * @returns True if the value matches ApiError structure
 * 
 * @example
 * ```typescript
 * try {
 *   await reserveItem(data);
 * } catch (error) {
 *   if (isApiError(error)) {
 *     // TypeScript knows error has .status, .code, .message
 *     console.log(`Error ${error.code}: ${error.message}`);
 *   } else {
 *     // Unknown error type
 *     console.log('Unexpected error:', error);
 *   }
 * }
 * ```
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    'message' in error
  );
}

// ============================================
// Request Types
// ============================================

/**
 * Request body for creating a reservation.
 * 
 * This is what you send to POST /api/v1/reserve
 * 
 * @interface ReserveRequest
 */
export interface ReserveRequest {
  /** User making the reservation */
  userId: string;
  
  /** Item to reserve */
  itemId: string;
  
  /** 
   * Quantity to reserve (1-5)
   * 
   * Backend validation ensures:
   * - Minimum 1 (can't reserve 0 items)
   * - Maximum 5 (prevent hoarding)
   * - Not more than available stock
   */
  qty: number;
}

/**
 * Request body for confirming a reservation.
 * 
 * This is what you send to POST /api/v1/confirm
 * 
 * @interface ConfirmRequest
 */
export interface ConfirmRequest {
  /** User who made the reservation */
  userId: string;
  
  /** Reservation to confirm */
  reservationId: string;
}

/**
 * Request body for cancelling a reservation.
 * 
 * This is what you send to POST /api/v1/cancel
 * 
 * @interface CancelRequest
 */
export interface CancelRequest {
  /** User who made the reservation */
  userId: string;
  
  /** Reservation to cancel */
  reservationId: string;
}

// ============================================
// Health Check Types
// ============================================

/**
 * Health status values.
 * 
 * - healthy: All systems operational
 * - degraded: Some issues but service is functional
 * - unhealthy: Service is down or major issues
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Health check response from the API.
 * 
 * Used for monitoring and status dashboards.
 * 
 * @interface HealthCheck
 */
export interface HealthCheck {
  /** Overall health status */
  status: HealthStatus;
  
  /** ISO timestamp of the health check */
  timestamp: string;
  
  /** 
   * Uptime in seconds (if available)
   * Only present when status is healthy
   */
  uptime?: number;
  
  /** 
   * Component-specific health checks
   */
  checks?: {
    /** Database connection health */
    database: { 
      status: HealthStatus; 
      /** Response time in milliseconds */
      latency?: number; 
    };
    /** Cache system health */
    cache: { 
      status: HealthStatus; 
    };
  };
}

// ============================================
// Utility Types
// ============================================

/**
 * Helper type for status labels.
 * 
 * Maps ReservationStatus to human-readable labels for UI display.
 * Use this with the statusLabels constant below.
 */
export type StatusLabelMap = Record<ReservationStatus, string>;

/**
 * Human-readable labels for reservation statuses.
 * 
 * Use these for display in the UI instead of the raw status values.
 * 
 * @example
 * ```tsx
 * <Badge>{statusLabels[reservation.status]}</Badge>
 * // Displays: "Reserved", "Confirmed", etc.
 * ```
 */
export const statusLabels: StatusLabelMap = {
  reserved: 'Reserved',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/**
 * Badge color variants for reservation statuses.
 * 
 * Maps statuses to shadcn/ui Badge component variants for consistent
 * visual representation.
 * 
 * @example
 * ```tsx
 * <Badge variant={statusColors[reservation.status]}>
 *   {statusLabels[reservation.status]}
 * </Badge>
 * ```
 */
export const statusColors: Record<ReservationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  reserved: 'default',
  confirmed: 'secondary',
  cancelled: 'outline',
  expired: 'destructive',
};
