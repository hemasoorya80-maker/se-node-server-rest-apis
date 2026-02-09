/**
 * API Endpoints Module
 * 
 * This module provides typed functions for each API endpoint. These functions
 * serve as the bridge between the frontend UI and the backend API, ensuring
 * type safety and consistent data handling.
 * 
 * Learning Objectives:
 * 1. Organizing API calls by domain (items, reservations, etc.)
 * 2. Using TypeScript to enforce API contracts
 * 3. Handling query parameters and request bodies
 * 4. Separating API logic from UI components
 * 
 * Architecture Pattern:
 * We use a "thin client" pattern where these functions do minimal processing.
 * They primarily:
 * - Transform parameters into the format the API expects
 * - Call the appropriate HTTP method
 * - Return the typed response
 * 
 * @module api/endpoints
 * @see {@link ./client.ts} For the underlying HTTP client
 */

import { apiGet, apiPost } from './client';
import type {
  Item,
  Reservation,
  ReserveRequest,
  ConfirmRequest,
  CancelRequest,
  HealthCheck,
} from './types';

// ============================================
// Items Endpoints
// ============================================

/**
 * Fetches all available items from the inventory.
 * 
 * This endpoint returns the current state of all items including their
 * available quantities. The data is suitable for display in a catalog
 * or grid view.
 * 
 * CACHING NOTE:
 * The backend caches this response for 30 seconds. If you call this
 * function multiple times quickly, you might get cached data.
 * 
 * @returns Promise resolving to array of Item objects
 * @throws {ApiError} When the request fails
 * 
 * @example
 * ```typescript
 * // In a React component with TanStack Query
 * const { data: items } = useQuery({
 *   queryKey: ['items'],
 *   queryFn: listItems,
 * });
 * ```
 */
export async function listItems(): Promise<Item[]> {
  return apiGet<Item[]>('/items');
}

/**
 * Fetches details for a single item.
 * 
 * Use this when navigating to an item detail page. It returns the same
 * information as listItems but for a specific item only.
 * 
 * @param itemId - Unique identifier for the item (e.g., "item_1")
 * @returns Promise resolving to Item object
 * @throws {ApiError} With code 'NOT_FOUND' if item doesn't exist
 * 
 * @example
 * ```typescript
 * // In a detail page component
 * const { data: item } = useQuery({
 *   queryKey: ['item', itemId],
 *   queryFn: () => getItem(itemId),
 *   enabled: !!itemId, // Only run when itemId is defined
 * });
 * ```
 */
export async function getItem(itemId: string): Promise<Item> {
  return apiGet<Item>(`/items/${itemId}`);
}

// ============================================
// Reservations Endpoints
// ============================================

/**
 * Creates a new reservation for an item.
 * 
 * This is a critical operation that uses idempotency keys to prevent
 * duplicate reservations. If the request fails due to network issues,
 * you can safely retry with the same parameters.
 * 
 * RESERVATION LIFECYCLE:
 * 1. reserved → Initial state, stock is held
 * 2. confirmed → User completed checkout, stock permanently allocated
 * 3. cancelled → User cancelled, stock returned
 * 4. expired → 10-minute timeout reached, stock returned
 * 
 * CONCURRENCY CONTROL:
 * The backend uses atomic database operations to prevent overselling.
 * If two users try to reserve the last item simultaneously, only one succeeds.
 * 
 * @param request - Reservation details (userId, itemId, quantity)
 * @returns Promise resolving to created Reservation object
 * @throws {ApiError} With code 'OUT_OF_STOCK' if not enough inventory
 * @throws {ApiError} With code 'ITEM_NOT_FOUND' if item doesn't exist
 * 
 * @example
 * ```typescript
 * const reservation = await reserveItem({
 *   userId: 'user_123',
 *   itemId: 'item_1',
 *   qty: 2
 * });
 * // reservation.status === 'reserved'
 * // reservation.expiresAt is 10 minutes from now
 * ```
 */
export async function reserveItem(request: ReserveRequest): Promise<Reservation> {
  // Note: true enables idempotency key generation
  return apiPost<Reservation>('/reserve', request, true);
}

/**
 * Fetches all reservations for a specific user.
 * 
 * This is the primary way to display a user's reservation history and
 * current active reservations. The results are ordered by creation date
 * with newest first.
 * 
 * QUERY PARAMETERS:
 * The backend supports filtering by status via query parameters, but
 * this function currently fetches all reservations. You can extend it
 * to support filtering if needed.
 * 
 * @param userId - Unique identifier for the user
 * @param options - Optional query parameters
 * @param options.status - Filter by reservation status
 * @returns Promise resolving to array of Reservation objects
 * @throws {ApiError} When the request fails
 * 
 * @example
 * ```typescript
 * // Get all reservations for a user
 * const reservations = await getReservationsByUser('user_123');
 * 
 * // Separate active from past reservations in your component
 * const active = reservations.filter(r => 
 *   r.status === 'reserved' || r.status === 'confirmed'
 * );
 * const past = reservations.filter(r => 
 *   r.status === 'cancelled' || r.status === 'expired'
 * );
 * ```
 */
export async function getReservationsByUser(
  userId: string,
  options?: { status?: string }
): Promise<Reservation[]> {
  // Build query string if status filter is provided
  const params = new URLSearchParams();
  if (options?.status) {
    params.append('status', options.status);
  }
  
  const queryString = params.toString();
  const path = `/reservations/user/${userId}${queryString ? `?${queryString}` : ''}`;
  
  return apiGet<Reservation[]>(path);
}

/**
 * Fetches details for a single reservation.
 * 
 * Use this when you need to display or manage a specific reservation.
 * This is less commonly used than getReservationsByUser since you usually
 * get the full list and work with that.
 * 
 * @param reservationId - Unique identifier for the reservation
 * @returns Promise resolving to Reservation object
 * @throws {ApiError} With code 'NOT_FOUND' if reservation doesn't exist
 */
export async function getReservation(reservationId: string): Promise<Reservation> {
  return apiGet<Reservation>(`/reservations/${reservationId}`);
}

/**
 * Confirms a reservation, permanently allocating the stock.
 * 
 * This transitions a reservation from 'reserved' to 'confirmed' status.
 * Once confirmed:
 * - The stock is permanently allocated to the user
 * - The reservation no longer expires
 * - The item cannot be cancelled (only by admin)
 * 
 * WHEN TO CONFIRM:
 * Call this when the user completes checkout or payment. The exact
 * timing depends on your business logic.
 * 
 * IDEMPOTENCY:
 * Like reserveItem, this operation is idempotent. Retrying with the
 * same reservation ID will return the same result without side effects.
 * 
 * @param request - Confirmation details (userId, reservationId)
 * @returns Promise resolving to { status: 'confirmed' }
 * @throws {ApiError} With code 'EXPIRED' if reservation already expired
 * @throws {ApiError} With code 'ALREADY_CONFIRMED' if already confirmed
 * 
 * @example
 * ```typescript
 * await confirmReservation({
 *   userId: 'user_123',
 *   reservationId: 'res_abc123'
 * });
 * ```
 */
export async function confirmReservation(
  request: ConfirmRequest
): Promise<{ status: string }> {
  return apiPost<{ status: string }>('/confirm', request, true);
}

/**
 * Cancels a reservation, returning stock to the pool.
 * 
 * This transitions a reservation from 'reserved' to 'cancelled' status.
 * The stock is immediately returned to the available pool for others
 * to reserve.
 * 
 * WHEN TO CANCEL:
 * Call this when the user decides not to complete their reservation,
 * or when your app needs to clean up reservations (e.g., user navigates away).
 * 
 * LIMITATIONS:
 * - Cannot cancel 'confirmed' reservations
 * - Cannot cancel 'expired' reservations (already handled by system)
 * - Cannot cancel 'cancelled' reservations (already cancelled)
 * 
 * @param request - Cancellation details (userId, reservationId)
 * @returns Promise resolving to { status: 'cancelled' }
 * @throws {ApiError} With code 'ALREADY_CONFIRMED' if already confirmed
 * 
 * @example
 * ```typescript
 * await cancelReservation({
 *   userId: 'user_123',
 *   reservationId: 'res_abc123'
 * });
 * ```
 */
export async function cancelReservation(
  request: CancelRequest
): Promise<{ status: string }> {
  return apiPost<{ status: string }>('/cancel', request, false);
}

// ============================================
// Health Endpoints
// ============================================

/**
 * Checks the health status of the backend API.
 * 
 * This endpoint is useful for:
 * - Dashboard status indicators
 * - Startup health checks
 * - Monitoring and alerting systems
 * 
 * Unlike other endpoints, this uses a direct fetch instead of apiRequest
 * to handle non-JSON responses gracefully (some health endpoints return
 * plain text or empty bodies).
 * 
 * FALLBACK BEHAVIOR:
 * If the request fails entirely (network error), this function returns
 * an 'unhealthy' status instead of throwing. This allows your UI to
 * gracefully handle outages.
 * 
 * @returns Promise resolving to HealthCheck object
 * @throws Never - Returns 'unhealthy' status on any error
 * 
 * @example
 * ```typescript
 * // In a dashboard component
 * const { data: health } = useQuery({
 *   queryKey: ['health'],
 *   queryFn: checkHealth,
 *   refetchInterval: 30000, // Check every 30 seconds
 * });
 * 
 * if (health?.status === 'healthy') {
 *   return <GreenIndicator />;
 * }
 * ```
 */
export async function checkHealth(): Promise<HealthCheck> {
  // Use direct fetch for more control over error handling
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    }
    
    return await response.json().then(data => data.data);
  } catch {
    // Return unhealthy on any error (network, parsing, etc.)
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }
}
