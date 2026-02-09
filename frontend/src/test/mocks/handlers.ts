/**
 * MSW API Handlers
 * 
 * This file defines mock HTTP handlers for the Mock Service Worker (MSW).
 * These handlers intercept HTTP requests during tests and return mock responses.
 * 
 * LEARNING OBJECTIVES:
 * 1. Understanding MSW handler syntax
 * 2. REST API mocking patterns
 * 3. Managing mutable state in test mocks
 * 4. Resetting state between tests
 * 
 * WHAT IS MSW?
 * Mock Service Worker (MSW) intercepts requests at the network level using Service
 * Workers. This provides the most realistic mocking possible - your code makes
 * actual HTTP requests that get intercepted and mocked.
 * 
 * STATE MANAGEMENT IN MOCKS:
 * Since these handlers run in the same process as the tests, we can maintain
 * mutable state (like the mockItems and mockReservations arrays). This allows
 * us to simulate the full CRUD cycle:
 * 1. Reserve item → item stock decreases
 * 2. Cancel reservation → stock restored
 * 
 * However, we need to reset this state between tests to prevent pollution.
 * We expose a resetMockData() function for this purpose.
 * 
 * @module test/mocks/handlers
 * @see {@link https://mswjs.io/docs/basics/mocking-responses} MSW Response Mocking
 */

// ============================================
// MSW Imports
// ============================================

import { http, HttpResponse, delay } from 'msw';
import type { Item, Reservation, HealthCheck } from '@/lib/api';
import { createMockData } from './data';

// ============================================
// Configuration
// ============================================

/**
 * API base URL from environment.
 * 
 * We use the same base URL as the real app so handlers match production URLs.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

/**
 * API version prefix.
 * 
 * IMPORTANT: This MUST match the API_PREFIX in src/lib/api/client.ts
 * The handlers use these full paths to intercept requests:
 * - ${API_BASE}${API_PREFIX}/items
 * - ${API_BASE}${API_PREFIX}/reserve
 * etc.
 * 
 * NOTE: /health is NOT under /api/v1 - it's at root level
 */
const API_PREFIX = '/api/v1';

// ============================================
// Mutable Mock Data Store
// ============================================

/**
 * Mutable data store for MSW handlers.
 * 
 * These variables hold the current state of mock data during tests.
 * They are mutated by the handlers (e.g., when creating reservations)
 * and can be reset between tests using resetMockData().
 * 
 * WHY MUTABLE STATE?
 * - Simulates real backend behavior (stock decreases on reserve)
 * - Tests can verify state changes
 * - Allows full CRUD testing
 * 
 * DANGER: If not reset between tests, state pollution occurs:
 * - Test 1 creates reservation
 * - Test 2 sees that reservation (wrong!)
 * 
 * Always call resetMockData() in beforeEach()!
 */
let mockItems: Item[] = [];
let mockReservations: Reservation[] = [];
let mockHealthCheck: HealthCheck;

/**
 * Resets mock data to initial state.
 * 
 * Call this in beforeEach() to ensure each test starts fresh.
 * This prevents test pollution from mutations in previous tests.
 * 
 * @example
 * ```typescript
 * import { resetMockData } from './mocks/handlers';
 * 
 * beforeEach(() => {
 *   resetMockData();
 * });
 * ```
 */
export function resetMockData() {
  const fresh = createMockData();
  mockItems = fresh.mockItems;
  mockReservations = fresh.mockReservations;
  mockHealthCheck = fresh.mockHealthCheck;
}

/**
 * Access to current mock data for test assertions.
 * 
 * Tests can use these to verify state changes after API calls.
 * 
 * @example
 * ```typescript
 * const { mockItems, mockReservations } = getMockData();
 * expect(mockItems[0].availableQty).toBe(3); // After reservation
 * ```
 */
export function getMockData() {
  return {
    mockItems,
    mockReservations,
    mockHealthCheck,
  };
}

// Initialize data on module load
resetMockData();

// ============================================
// Item Handlers
// ============================================

/**
 * GET /api/v1/items - List all items
 * 
 * Returns all mock items. Supports optional delay to test loading states.
 * 
 * TESTING USE CASES:
 * - Happy path: Returns array of items
 * - Loading state: Add delay(500) to test skeleton UI
 * - Empty state: Override to return []
 */
export const getItems = http.get(`${API_BASE}${API_PREFIX}/items`, async () => {
  // Uncomment to test loading states:
  // await delay(500);
  
  return HttpResponse.json({ ok: true, data: mockItems });
});

/**
 * GET /api/v1/items/:id - Get item details
 * 
 * Returns a single item by ID. Returns 404 if item not found.
 * 
 * TESTING USE CASES:
 * - Item found: Returns item object
 * - Item not found: Returns 404 error
 * - Network error: Override to throw
 */
export const getItem = http.get(`${API_BASE}${API_PREFIX}/items/:id`, async ({ params }) => {
  const { id } = params;
  
  /**
   * Find item by ID.
   * In real app, backend would do this. We simulate here.
   */
  const item = mockItems.find((i) => i.id === id);
  
  if (!item) {
    return HttpResponse.json(
      { ok: false, error: { code: 'NOT_FOUND', message: 'Item not found' } },
      { status: 404 }
    );
  }
  
  return HttpResponse.json({ ok: true, data: item });
});

// ============================================
// Reservation Handlers
// ============================================

/**
 * GET /api/v1/reservations/user/:userId - List user reservations
 * 
 * Returns all reservations for a specific user.
 * 
 * TESTING USE CASES:
 * - User has reservations: Returns array
 * - User has no reservations: Returns empty array
 * - Server returns single object (defensive test): Frontend normalizes
 */
export const getReservations = http.get(
  `${API_BASE}${API_PREFIX}/reservations/user/:userId`,
  async ({ params, request }) => {
    const { userId } = params;
    
    /**
     * Parse query parameters for status filter.
     * URLSearchParams makes it easy to work with query strings.
     */
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    
    /**
     * Filter reservations by userId.
     * In real app, backend would filter. We simulate here.
     */
    let userReservations = mockReservations.filter((r) => r.userId === userId);
    
    /**
     * Apply status filter if provided.
     */
    if (statusFilter) {
      userReservations = userReservations.filter((r) => r.status === statusFilter);
    }
    
    return HttpResponse.json({ ok: true, data: userReservations });
  }
);

/**
 * POST /api/v1/reserve - Create reservation
 * 
 * Creates a new reservation and decrements item stock atomically.
 * 
 * TESTING USE CASES:
 * - Success: Returns 201 with reservation
 * - Out of stock: Returns 409 conflict
 * - Invalid input: Returns 400 bad request
 * - Idempotency: Same key returns same result
 */
export const createReservation = http.post(
  `${API_BASE}${API_PREFIX}/reserve`,
  async ({ request }) => {
    /**
     * Parse request body.
     * request.json() returns a Promise that resolves to the parsed body.
     */
    const body = await request.json() as { userId: string; itemId: string; qty: number };
    const { userId, itemId, qty } = body;
    
    /**
     * Validate input (simulating backend validation).
     * In real app, backend would do more thorough validation.
     */
    if (!userId || !itemId || !qty || qty < 1) {
      return HttpResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid input' } },
        { status: 400 }
      );
    }
    
    /**
     * Find item and check stock.
     * This simulates the atomic stock check in the real backend.
     * 
     * IMPORTANT: Must check if item exists FIRST before checking stock.
     * This ensures we return ITEM_NOT_FOUND before OUT_OF_STOCK.
     */
    const item = mockItems.find((i) => i.id === itemId);
    
    if (!item) {
      return HttpResponse.json(
        { ok: false, error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' } },
        { status: 404 }
      );
    }
    
    if (item.availableQty < qty) {
      return HttpResponse.json(
        {
          ok: false,
          error: {
            code: 'OUT_OF_STOCK',
            message: 'Not enough stock available',
            details: { available: item.availableQty, requested: qty },
          },
        },
        { status: 409 }
      );
    }
    
    /**
     * Create reservation and update stock.
     * In real app, this is a database transaction.
     */
    const newReservation: Reservation = {
      id: `res_${Date.now()}`,
      userId,
      itemId,
      qty,
      status: 'reserved',
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      createdAt: Date.now(),
    };
    
    item.availableQty -= qty;
    mockReservations.push(newReservation);
    
    return HttpResponse.json({ ok: true, data: newReservation }, { status: 201 });
  }
);

/**
 * POST /api/v1/confirm - Confirm reservation
 * 
 * Changes reservation status from 'reserved' to 'confirmed'.
 * Returns { status: 'confirmed' } on success (not full reservation).
 * 
 * TESTING USE CASES:
 * - Success: Returns { status: 'confirmed' }
 * - Already confirmed: Returns 409
 * - Already cancelled: Returns 409
 * - Not found: Returns 404
 */
export const confirmReservation = http.post(
  `${API_BASE}${API_PREFIX}/confirm`,
  async ({ request }) => {
    const body = await request.json() as { userId: string; reservationId: string };
    const { reservationId } = body;
    
    const reservation = mockReservations.find((r) => r.id === reservationId);
    
    if (!reservation) {
      return HttpResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } },
        { status: 404 }
      );
    }
    
    if (reservation.status !== 'reserved') {
      return HttpResponse.json(
        { ok: false, error: { code: 'INVALID_STATUS', message: 'Cannot confirm this reservation' } },
        { status: 409 }
      );
    }
    
    reservation.status = 'confirmed';
    
    // Return just the status, not full reservation object
    return HttpResponse.json({ ok: true, data: { status: 'confirmed' } });
  }
);

/**
 * POST /api/v1/cancel - Cancel reservation
 * 
 * Changes reservation status from 'reserved' to 'cancelled'.
 * Restores item stock when cancelled.
 * Returns { status: 'cancelled' } on success (not full reservation).
 * 
 * TESTING USE CASES:
 * - Success: Returns { status: 'cancelled' }, stock restored
 * - Already confirmed: Returns 409 (can't cancel confirmed)
 * - Already cancelled: Returns 409 (can't cancel twice)
 * - Not found: Returns 404
 */
export const cancelReservation = http.post(
  `${API_BASE}${API_PREFIX}/cancel`,
  async ({ request }) => {
    const body = await request.json() as { userId: string; reservationId: string };
    const { reservationId } = body;
    
    const reservation = mockReservations.find((r) => r.id === reservationId);
    
    if (!reservation) {
      return HttpResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } },
        { status: 404 }
      );
    }
    
    if (reservation.status !== 'reserved') {
      return HttpResponse.json(
        { ok: false, error: { code: 'INVALID_STATUS', message: 'Cannot cancel this reservation' } },
        { status: 409 }
      );
    }
    
    /**
     * Restore stock when cancelling.
     * This simulates the backend's stock management logic.
     */
    const item = mockItems.find((i) => i.id === reservation.itemId);
    if (item) {
      item.availableQty += reservation.qty;
    }
    
    reservation.status = 'cancelled';
    
    // Return just the status, not full reservation object
    return HttpResponse.json({ ok: true, data: { status: 'cancelled' } });
  }
);

// ============================================
// Health Check Handler
// ============================================

/**
 * GET /health - Health check endpoint (NOT under /api/v1)
 * 
 * Returns system status information.
 * 
 * NOTE: Health endpoint is at root level, not under API_PREFIX.
 * This is a common pattern - health checks often bypass API versioning.
 * 
 * TESTING USE CASES:
 * - Healthy: Returns 200 with status
 * - Degraded: Override to return 503 with partial health
 * - Slow response: Add delay to test timeout handling
 */
export const getHealth = http.get(`${API_BASE}/health`, async () => {
  return HttpResponse.json({ ok: true, data: mockHealthCheck });
});

// ============================================
// Handler Array Export
// ============================================

/**
 * All handlers exported as an array.
 * 
 * This array is passed to setupServer() in server.ts.
 * You can add more handlers here as the API grows.
 * 
 * NOTE: Order doesn't matter - MSW matches by URL pattern.
 */
export const handlers = [
  getItems,
  getItem,
  getReservations,
  createReservation,
  confirmReservation,
  cancelReservation,
  getHealth,
];
