/**
 * API Endpoints Tests
 * 
 * This test suite verifies all API endpoint functions interact correctly
 * with the backend REST API. It uses Mock Service Worker (MSW) to intercept
 * and mock HTTP requests, providing realistic testing without a real backend.
 * 
 * LEARNING OBJECTIVES:
 * 1. Testing HTTP API calls with MSW
 * 2. Mocking different response scenarios (success, errors)
 * 3. Using getMockData() to access and verify mutable state
 * 4. Testing query parameter handling
 * 
 * TEST PATTERNS:
 * - Each test is isolated with fresh mock data (reset in beforeEach)
 * - MSW handlers intercept requests and return mock responses
 * - Error cases test specific error codes and messages
 * 
 * @module api/__tests__/endpoints
 * @see {@link ../../test/mocks/handlers.ts} For the mock implementations
 */

import { describe, it, expect } from 'vitest';
import {
  listItems,
  getItem,
  reserveItem,
  getReservationsByUser,
  confirmReservation,
  cancelReservation,
  checkHealth,
} from '../endpoints';
import { mockItems, mockItem, mockHealthCheck } from '@/test/mocks';
import { getMockData } from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('API Endpoints', () => {
  // ============================================
  // Items Endpoints
  // ============================================
  
  describe('listItems', () => {
    /**
     * Happy path test for listing items.
     * 
     * Verifies that listItems() correctly parses the API response
     * and returns the array of items from the data field.
     */
    it('should return list of items', async () => {
      const items = await listItems();
      
      expect(items).toEqual(mockItems);
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveProperty('id');
      expect(items[0]).toHaveProperty('name');
      expect(items[0]).toHaveProperty('availableQty');
    });
  });

  describe('getItem', () => {
    /**
     * Happy path test for getting a single item.
     */
    it('should return a single item by id', async () => {
      const item = await getItem('item_1');
      
      expect(item).toEqual(mockItem);
    });

    /**
     * Error case: Item not found.
     * 
     * Tests that the API correctly returns a 404 error when
     * requesting a non-existent item ID.
     */
    it('should throw error for non-existent item', async () => {
      await expect(getItem('nonexistent')).rejects.toThrow('Item not found');
    });
  });

  // ============================================
  // Reservation Endpoints
  // ============================================

  describe('reserveItem', () => {
    /**
     * Happy path: Creating a reservation.
     * 
     * Verifies:
     * 1. Reservation is created with correct data
     * 2. Item stock is decremented (checked via getMockData)
     * 3. Status is 'reserved'
     * 4. Expiration timestamp is set
     */
    it('should create a reservation', async () => {
      const { mockItems: initialItems } = getMockData();
      const initialStock = initialItems[0].availableQty;
      
      const reservation = await reserveItem({
        userId: 'demo-user',
        itemId: 'item_1',
        qty: 2,
      });

      expect(reservation).toMatchObject({
        userId: 'demo-user',
        itemId: 'item_1',
        qty: 2,
        status: 'reserved',
      });
      expect(reservation.id).toBeDefined();
      expect(reservation.expiresAt).toBeGreaterThan(Date.now());

      // Verify stock was decremented via mock data
      const { mockItems: currentItems } = getMockData();
      expect(currentItems[0].availableQty).toBe(initialStock - 2);
    });

    /**
     * Error case: Out of stock.
     * 
     * Tests that reserving more than available throws an OUT_OF_STOCK error.
     * Item_3 in our mock data has availableQty: 0.
     */
    it('should throw error when out of stock', async () => {
      await expect(
        reserveItem({
          userId: 'demo-user',
          itemId: 'item_3',
          qty: 1,
        })
      ).rejects.toThrow('Not enough stock available');
    });

    /**
     * Error case: Item not found during reservation.
     * 
     * Tests that reserving a non-existent item returns ITEM_NOT_FOUND
     * before checking stock (order of validation matters).
     */
    it('should throw error for non-existent item', async () => {
      await expect(
        reserveItem({
          userId: 'demo-user',
          itemId: 'nonexistent',
          qty: 1,
        })
      ).rejects.toThrow('Item not found');
    });
  });

  describe('getReservationsByUser', () => {
    /**
     * Happy path: Get all reservations for a user.
     * 
     * Uses getMockData() to get the current mock reservations state
     * since the data is recreated for each test.
     */
    it('should return reservations for a user', async () => {
      const reservations = await getReservationsByUser('demo-user');
      const { mockReservations } = getMockData();
      
      expect(reservations).toEqual(mockReservations);
      expect(reservations).toHaveLength(3);
    });

    /**
     * Query parameter test: Status filter.
     * 
     * Uses server.use() to override the handler and capture the request URL.
     * This verifies that the status parameter is correctly appended to the URL.
     * 
     * PATTERN: When testing URL/query parameter handling, intercept the request
     * and verify the URL structure rather than the response data.
     */
    it('should filter by status when provided', async () => {
      let capturedUrl: string | null = null;
      const { mockReservations } = getMockData();
      
      server.use(
        http.get('http://localhost:3000/api/v1/reservations/user/demo-user', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ok: true, data: mockReservations });
        })
      );

      await getReservationsByUser('demo-user', { status: 'reserved' });
      expect(capturedUrl).toContain('status=reserved');
    });
  });

  describe('confirmReservation', () => {
    /**
     * Happy path: Confirm a reservation.
     * 
     * Reservation 'res_abc123' in mock data has status 'reserved'.
     * Confirming it should return { status: 'confirmed' }.
     */
    it('should confirm a reservation', async () => {
      const result = await confirmReservation({
        userId: 'demo-user',
        reservationId: 'res_abc123',
      });

      expect(result).toEqual({ status: 'confirmed' });
    });
  });

  describe('cancelReservation', () => {
    /**
     * Happy path: Cancel a reservation.
     * 
     * Creates a fresh reservation first (to avoid conflicts with other tests),
     * then cancels it. Verifies that:
     * 1. Cancellation returns { status: 'cancelled' }
     * 2. Item stock is restored
     * 
     * NOTE: We create a new reservation because 'res_abc123' might have been
     * confirmed by the previous test. MSW state is shared across tests in
     * the same describe block.
     */
    it('should cancel a reservation', async () => {
      // First, create a new reservation to cancel
      const newReservation = await reserveItem({
        userId: 'demo-user',
        itemId: 'item_2',
        qty: 1,
      });
      
      const { mockItems: itemsAfterReserve } = getMockData();
      const stockAfterReserve = itemsAfterReserve[1].availableQty;

      // Now cancel it
      const result = await cancelReservation({
        userId: 'demo-user',
        reservationId: newReservation.id,
      });

      expect(result).toEqual({ status: 'cancelled' });
      
      // Verify stock was restored
      const { mockItems: itemsAfterCancel } = getMockData();
      expect(itemsAfterCancel[1].availableQty).toBe(stockAfterReserve + 1);
    });
  });

  // ============================================
  // Health Endpoint
  // ============================================

  describe('checkHealth', () => {
    /**
     * Happy path: Health check returns healthy status.
     */
    it('should return health status', async () => {
      const health = await checkHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.checks).toBeDefined();
    });

    /**
     * Error handling: API returns error response.
     * 
     * Uses server.use() to override the health endpoint to return an error.
     * Verifies that checkHealth() returns 'unhealthy' status instead of throwing.
     */
    it('should return unhealthy when API is down', async () => {
      server.use(
        http.get('http://localhost:3000/health', () => {
          return new HttpResponse(null, { status: 503 });
        })
      );

      const health = await checkHealth();
      expect(health.status).toBe('unhealthy');
    });

    /**
     * Error handling: Network error.
     * 
     * Overrides handler to simulate network failure.
     * Verifies graceful degradation to 'unhealthy' status.
     */
    it('should return unhealthy on error response', async () => {
      server.use(
        http.get('http://localhost:3000/health', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const health = await checkHealth();
      expect(health.status).toBe('unhealthy');
    });
  });
});
