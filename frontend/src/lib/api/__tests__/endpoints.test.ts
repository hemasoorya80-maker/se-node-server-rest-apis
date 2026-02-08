/**
 * API Endpoints Tests
 * 
 * Tests for all API endpoint functions.
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
import { mockItems, mockItem, mockReservations, mockHealthCheck } from '@/test/mocks';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('API Endpoints', () => {
  describe('listItems', () => {
    it('should return list of items', async () => {
      const items = await listItems();
      expect(items).toEqual(mockItems);
      expect(items).toHaveLength(3);
    });
  });

  describe('getItem', () => {
    it('should return a single item by id', async () => {
      const item = await getItem('item_1');
      expect(item).toEqual(mockItem);
    });

    it('should throw error for non-existent item', async () => {
      server.use(
        http.get('http://localhost:3000/api/v1/items/nonexistent', () => {
          return HttpResponse.json(
            { ok: false, error: { code: 'NOT_FOUND', message: 'Item not found' } },
            { status: 404 }
          );
        })
      );

      await expect(getItem('nonexistent')).rejects.toThrow();
    });
  });

  describe('reserveItem', () => {
    it('should create a reservation', async () => {
      const reservation = await reserveItem({
        userId: 'demo-user',
        itemId: 'item_1',
        qty: 2,
      });

      expect(reservation).toHaveProperty('id');
      expect(reservation).toHaveProperty('status', 'reserved');
      expect(reservation.qty).toBe(2);
      expect(reservation.userId).toBe('demo-user');
    });

    it('should throw error when out of stock', async () => {
      await expect(
        reserveItem({
          userId: 'demo-user',
          itemId: 'item_3', // This item has 0 quantity in mocks
          qty: 1,
        })
      ).rejects.toThrow('Not enough stock available');
    });

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
    it('should return reservations for a user', async () => {
      const reservations = await getReservationsByUser('demo-user');
      expect(reservations).toEqual(mockReservations);
      expect(reservations).toHaveLength(3);
    });

    it('should filter by status when provided', async () => {
      let capturedUrl: string | null = null;
      
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
    it('should confirm a reservation', async () => {
      const result = await confirmReservation({
        userId: 'demo-user',
        reservationId: 'res_abc123',
      });

      expect(result).toEqual({ status: 'confirmed' });
    });
  });

  describe('cancelReservation', () => {
    it('should cancel a reservation', async () => {
      const result = await cancelReservation({
        userId: 'demo-user',
        reservationId: 'res_abc123',
      });

      expect(result).toEqual({ status: 'cancelled' });
    });
  });

  describe('checkHealth', () => {
    it('should return health status', async () => {
      const health = await checkHealth();
      expect(health.status).toBe('healthy');
      expect(health.checks).toBeDefined();
    });

    it('should return unhealthy when API is down', async () => {
      server.use(
        http.get('http://localhost:3000/health', () => {
          return HttpResponse.error();
        })
      );

      const health = await checkHealth();
      expect(health.status).toBe('unhealthy');
    });

    it('should return unhealthy on error response', async () => {
      server.use(
        http.get('http://localhost:3000/health', () => {
          return HttpResponse.json(
            { ok: false },
            { status: 503 }
          );
        })
      );

      const health = await checkHealth();
      expect(health.status).toBe('unhealthy');
    });
  });
});
