/**
 * MSW Handlers
 * 
 * Mock API handlers for testing.
 */

import { http, HttpResponse } from 'msw';
import { mockItems, mockReservations, mockHealthCheck } from './data';

const API_BASE = 'http://localhost:3000/api/v1';

export const handlers = [
  http.get('http://localhost:3000/health', () => {
    return HttpResponse.json({ ok: true, data: mockHealthCheck });
  }),

  http.get(`${API_BASE}/items`, () => {
    return HttpResponse.json({ ok: true, data: mockItems });
  }),

  http.get(`${API_BASE}/items/:id`, ({ params }) => {
    const item = mockItems.find(i => i.id === params.id);
    if (!item) {
      return HttpResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Item not found' } },
        { status: 404 }
      );
    }
    return HttpResponse.json({ ok: true, data: item });
  }),

  http.post(`${API_BASE}/reserve`, async ({ request }) => {
    const body = await request.json() as { itemId: string; qty: number };
    const item = mockItems.find(i => i.id === body.itemId);
    
    if (!item) {
      return HttpResponse.json(
        { ok: false, error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' } },
        { status: 404 }
      );
    }
    
    if (item.availableQty < body.qty) {
      return HttpResponse.json(
        { 
          ok: false, 
          error: { 
            code: 'OUT_OF_STOCK', 
            message: 'Not enough stock available',
            details: { available: item.availableQty, requested: body.qty }
          } 
        },
        { status: 409 }
      );
    }
    
    return HttpResponse.json({
      ok: true,
      data: {
        id: 'res_new123',
        userId: 'demo-user',
        itemId: body.itemId,
        qty: body.qty,
        status: 'reserved',
        expiresAt: Date.now() + 10 * 60 * 1000,
        createdAt: Date.now(),
      },
    }, { status: 201 });
  }),

  http.get(`${API_BASE}/reservations/user/:userId`, () => {
    return HttpResponse.json({ ok: true, data: mockReservations });
  }),

  http.post(`${API_BASE}/confirm`, async () => {
    return HttpResponse.json({ ok: true, data: { status: 'confirmed' } });
  }),

  http.post(`${API_BASE}/cancel`, async () => {
    return HttpResponse.json({ ok: true, data: { status: 'cancelled' } });
  }),
];
