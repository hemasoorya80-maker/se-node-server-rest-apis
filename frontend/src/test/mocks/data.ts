/**
 * Test Mock Data
 * 
 * This file contains sample data used across tests. Centralizing test data:
 * 1. Ensures consistency between tests
 * 2. Makes it easy to update data when schemas change
 * 3. Provides a reference for the data structures used in the app
 * 
 * LEARNING OBJECTIVES:
 * 1. Understanding test data factories
 * 2. Creating fresh data for each test to avoid pollution
 * 3. TypeScript type safety in test data
 * 
 * IMPORTANT: We export factory functions instead of static data.
 * This ensures each test gets fresh, unmutated data. If we exported
 * raw arrays/objects, mutations in one test (e.g., creating reservations)
 * would affect other tests.
 * 
 * BEST PRACTICES:
 * - Export factory functions that create new data each call
 * - Call createMockData() in beforeEach to reset state
 * - Include edge cases (empty arrays, zero quantities, etc.)
 * 
 * @module test/mocks/data
 */

import type { Item, Reservation, HealthCheck } from '@/lib/api';

// ============================================
// Mock Data Factory
// ============================================

/**
 * Creates fresh mock data for each test.
 * 
 * This function returns a new copy of all mock data. Call this in
 * beforeEach() to ensure each test starts with clean, unmutated data.
 * 
 * WHY FACTORIES?
 * - Prevents test pollution: One test can't affect another
 * - Predictable state: Each test knows its starting point
 * - Parallel safe: Tests can run in any order or in parallel
 * 
 * @returns Fresh mock data objects
 * 
 * @example
 * ```typescript
 * let mockData: ReturnType<typeof createMockData>;
 * 
 * beforeEach(() => {
 *   mockData = createMockData();
 * });
 * ```
 */
export function createMockData() {
  // ============================================
  // Items Mock Data
  // ============================================

  /**
   * Array of mock items for testing.
   * 
   * Includes varied scenarios:
   * - item_1: In stock (5 available)
   * - item_2: Low stock (3 available)
   * - item_3: Out of stock (0 available) - for testing out-of-stock errors
   */
  const mockItems: Item[] = [
    { id: 'item_1', name: 'Wireless Mouse', availableQty: 5 },
    { id: 'item_2', name: 'Mechanical Keyboard', availableQty: 3 },
    { id: 'item_3', name: 'USB-C Hub', availableQty: 0 },
  ];

  /**
   * Single mock item for detail page tests.
   * 
   * Use this when you need one specific item rather than an array.
   */
  const mockItem: Item = {
    id: 'item_1',
    name: 'Wireless Mouse',
    availableQty: 5,
  };

  // ============================================
  // Reservations Mock Data
  // ============================================

  /**
   * Active reservation for testing.
   * 
   * Status: 'reserved' (not yet confirmed)
   * Expires: 10 minutes from creation (simulates real expiration time)
   */
  const mockReservation: Reservation = {
    id: 'res_abc123',
    userId: 'demo-user',
    itemId: 'item_1',
    qty: 2,
    status: 'reserved',
    expiresAt: Date.now() + 10 * 60 * 1000,
    createdAt: Date.now(),
  };

  /**
   * Array of mock reservations covering all statuses.
   * 
   * This array tests the filtering and display logic:
   * - [0]: Reserved (active, can confirm/cancel)
   * - [1]: Confirmed (completed reservation)
   * - [2]: Cancelled (user cancelled)
   */
  const mockReservations: Reservation[] = [
    mockReservation,
    {
      id: 'res_def456',
      userId: 'demo-user',
      itemId: 'item_2',
      qty: 1,
      status: 'confirmed',
      expiresAt: Date.now() + 10 * 60 * 1000,
      createdAt: Date.now() - 1000,
    },
    {
      id: 'res_ghi789',
      userId: 'demo-user',
      itemId: 'item_1',
      qty: 1,
      status: 'cancelled',
      expiresAt: Date.now() - 1000,
      createdAt: Date.now() - 2000,
    },
  ];

  // ============================================
  // Health Check Mock Data
  // ============================================

  /**
   * Healthy system status for dashboard tests.
   * 
   * All subsystems report healthy, suitable for positive test cases.
   */
  const mockHealthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: 3600, // 1 hour
    checks: {
      database: { status: 'healthy', latency: 2 },
      cache: { status: 'healthy' },
    },
  };

  // ============================================
  // Error Mock Data
  // ============================================

  /**
   * Example API error for error handling tests.
   * 
   * Use this to test:
   * - Error message display
   * - Request ID copying
   * - Error boundary behavior
   */
  const mockApiError = {
    status: 409,
    code: 'OUT_OF_STOCK',
    message: 'Not enough stock available',
    requestId: 'req_12345',
    details: { available: 2, requested: 5 },
  };

  // Return all data as an object
  return {
    mockItems,
    mockItem,
    mockReservations,
    mockReservation,
    mockHealthCheck,
    mockApiError,
  };
}

// ============================================
// Backward Compatibility Exports
// ============================================

/**
 * Default mock data for backward compatibility.
 * 
 * WARNING: Using these exports directly can lead to test pollution.
 * Prefer using createMockData() in beforeEach() for new tests.
 * 
 * These are kept for existing tests that haven't been updated yet.
 */
const defaultData = createMockData();
export const mockItems = defaultData.mockItems;
export const mockItem = defaultData.mockItem;
export const mockReservations = defaultData.mockReservations;
export const mockReservation = defaultData.mockReservation;
export const mockHealthCheck = defaultData.mockHealthCheck;
export const mockApiError = defaultData.mockApiError;
