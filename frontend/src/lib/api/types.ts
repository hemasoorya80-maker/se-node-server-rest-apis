/**
 * API Types
 * 
 * TypeScript types that mirror the backend API contract.
 * These types represent the data structures returned by the reservation API.
 */

// ============================================
// Domain Entity Types
// ============================================

/**
 * Item entity - represents an inventory item
 */
export interface Item {
  id: string;
  name: string;
  availableQty: number;
}

/**
 * Reservation status values
 */
export type ReservationStatus = 'reserved' | 'confirmed' | 'cancelled' | 'expired';

/**
 * Reservation entity - represents a reservation of an item
 */
export interface Reservation {
  id: string;
  userId: string;
  itemId: string;
  qty: number;
  status: ReservationStatus;
  expiresAt: number;
  createdAt: number;
  updatedAt?: number;
}

// ============================================
// API Response Types
// ============================================

/**
 * Standard success response wrapper
 */
export interface SuccessResponse<T> {
  ok: true;
  data: T;
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
 * Standard error response wrapper
 */
export interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

/**
 * Combined API response type
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// ============================================
// API Error Type
// ============================================

/**
 * Normalized API error for frontend consumption
 */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Check if a value is an ApiError
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
 * Reserve item request body
 */
export interface ReserveRequest {
  userId: string;
  itemId: string;
  qty: number;
}

/**
 * Confirm reservation request body
 */
export interface ConfirmRequest {
  userId: string;
  reservationId: string;
}

/**
 * Cancel reservation request body
 */
export interface CancelRequest {
  userId: string;
  reservationId: string;
}

// ============================================
// Health Check Types
// ============================================

/**
 * Health check response
 */
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime?: number;
  checks?: {
    database: { status: 'healthy' | 'unhealthy'; latency?: number };
    cache: { status: 'healthy' | 'unhealthy' };
  };
}

// ============================================
// Utility Types
// ============================================

/**
 * Status label mapping for UI
 */
export const statusLabels: Record<ReservationStatus, string> = {
  reserved: 'Reserved',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/**
 * Status color mapping for badges
 */
export const statusColors: Record<ReservationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  reserved: 'default',
  confirmed: 'secondary',
  cancelled: 'outline',
  expired: 'destructive',
};
