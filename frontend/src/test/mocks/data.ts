/**
 * Test Mock Data
 * 
 * Sample data for unit tests.
 */

import type { Item, Reservation, HealthCheck } from '@/lib/api';

export const mockItems: Item[] = [
  { id: 'item_1', name: 'Wireless Mouse', availableQty: 5 },
  { id: 'item_2', name: 'Mechanical Keyboard', availableQty: 3 },
  { id: 'item_3', name: 'USB-C Hub', availableQty: 0 },
];

export const mockItem: Item = {
  id: 'item_1',
  name: 'Wireless Mouse',
  availableQty: 5,
};

export const mockReservation: Reservation = {
  id: 'res_abc123',
  userId: 'demo-user',
  itemId: 'item_1',
  qty: 2,
  status: 'reserved',
  expiresAt: Date.now() + 10 * 60 * 1000,
  createdAt: Date.now(),
};

export const mockReservations: Reservation[] = [
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

export const mockHealthCheck: HealthCheck = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  uptime: 3600,
  checks: {
    database: { status: 'healthy', latency: 2 },
    cache: { status: 'healthy' },
  },
};

export const mockApiError = {
  status: 409,
  code: 'OUT_OF_STOCK',
  message: 'Not enough stock available',
  requestId: 'req_12345',
  details: { available: 2, requested: 5 },
};
