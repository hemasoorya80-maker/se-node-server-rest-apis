/**
 * API Endpoints
 * 
 * Typed functions for each API endpoint.
 * These provide a clean interface for components to interact with the backend.
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
// Items
// ============================================

/**
 * List all available items
 */
export async function listItems(): Promise<Item[]> {
  return apiGet<Item[]>('/items');
}

/**
 * Get a single item by ID
 */
export async function getItem(itemId: string): Promise<Item> {
  return apiGet<Item>(`/items/${itemId}`);
}

// ============================================
// Reservations
// ============================================

/**
 * Reserve an item
 * 
 * Note: Automatically includes Idempotency-Key header
 */
export async function reserveItem(request: ReserveRequest): Promise<Reservation> {
  return apiPost<Reservation>('/reserve', request, true);
}

/**
 * Get reservations for a specific user
 */
export async function getReservationsByUser(
  userId: string,
  options?: { status?: string }
): Promise<Reservation[]> {
  const params = new URLSearchParams();
  if (options?.status) {
    params.append('status', options.status);
  }
  
  const queryString = params.toString();
  const path = `/reservations/user/${userId}${queryString ? `?${queryString}` : ''}`;
  
  return apiGet<Reservation[]>(path);
}

/**
 * Get a single reservation by ID
 */
export async function getReservation(reservationId: string): Promise<Reservation> {
  return apiGet<Reservation>(`/reservations/${reservationId}`);
}

/**
 * Confirm a reservation
 * 
 * Note: Automatically includes Idempotency-Key header
 */
export async function confirmReservation(
  request: ConfirmRequest
): Promise<{ status: string }> {
  return apiPost<{ status: string }>('/confirm', request, true);
}

/**
 * Cancel a reservation
 */
export async function cancelReservation(
  request: CancelRequest
): Promise<{ status: string }> {
  return apiPost<{ status: string }>('/cancel', request, false);
}

// ============================================
// Health
// ============================================

/**
 * Check API health status
 * 
 * Note: Uses direct fetch to handle non-JSON responses gracefully
 */
export async function checkHealth(): Promise<HealthCheck> {
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
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }
}
