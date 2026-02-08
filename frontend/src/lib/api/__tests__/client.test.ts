/**
 * API Client Tests
 * 
 * Comprehensive tests for the HTTP client and endpoints.
 */

import { describe, it, expect, vi } from 'vitest';
import { apiRequest, apiGet, apiPost } from '../client';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import type { ApiError } from '../types';

describe('API Client', () => {
  describe('apiRequest', () => {
    it('should make a successful GET request', async () => {
      server.use(
        http.get('http://localhost:3000/api/v1/test-success', () => {
          return HttpResponse.json({ ok: true, data: { success: true } });
        })
      );
      
      const data = await apiRequest<{ success: boolean }>('/test-success');
      expect(data.success).toBe(true);
    });

    it('should include Idempotency-Key header for POST requests when required', async () => {
      let capturedHeaders: Headers | null = null;
      
      server.use(
        http.post('http://localhost:3000/api/v1/test-idempotency', async ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({ ok: true, data: {} });
        })
      );

      await apiRequest('/test-idempotency', {
        method: 'POST',
        body: { test: true },
        requireIdempotency: true,
      });

      expect(capturedHeaders?.get('Idempotency-Key')).toBeDefined();
      expect(capturedHeaders?.get('Idempotency-Key')).toHaveLength(36);
    });

    it('should throw ApiError on HTTP error', async () => {
      server.use(
        http.get('http://localhost:3000/api/v1/test-error', () => {
          return HttpResponse.json(
            { 
              ok: false, 
              error: { 
                code: 'TEST_ERROR', 
                message: 'Test error message',
                requestId: 'req_123'
              } 
            },
            { status: 400 }
          );
        })
      );

      try {
        await apiRequest('/test-error');
        expect.fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(400);
        expect(apiError.code).toBe('TEST_ERROR');
        expect(apiError.message).toBe('Test error message');
        expect(apiError.requestId).toBe('req_123');
      }
    });

    it('should throw network error when fetch fails', async () => {
      server.use(
        http.get('http://localhost:3000/api/v1/test-network', () => {
          return HttpResponse.error();
        })
      );

      try {
        await apiRequest('/test-network');
        expect.fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.code).toBe('NETWORK_ERROR');
      }
    });

    it('should include Accept and Content-Type headers', async () => {
      let capturedHeaders: Headers | null = null;
      
      server.use(
        http.post('http://localhost:3000/api/v1/test-headers', async ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({ ok: true, data: {} });
        })
      );

      await apiRequest('/test-headers', {
        method: 'POST',
        body: { test: true },
      });

      expect(capturedHeaders?.get('Accept')).toBe('application/json');
      expect(capturedHeaders?.get('Content-Type')).toBe('application/json');
    });
  });

  describe('apiGet', () => {
    it('should make GET request with correct URL', async () => {
      server.use(
        http.get('http://localhost:3000/api/v1/test-get', () => {
          return HttpResponse.json({ ok: true, data: { id: 1 } });
        })
      );

      const data = await apiGet<{ id: number }>('/test-get');
      expect(data.id).toBe(1);
    });
  });

  describe('apiPost', () => {
    it('should make POST request with body', async () => {
      let requestBody: unknown;
      
      server.use(
        http.post('http://localhost:3000/api/v1/test-post', async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json({ ok: true, data: { received: true } });
        })
      );

      const data = await apiPost('/test-post', { name: 'test' });
      expect(data).toEqual({ received: true });
      expect(requestBody).toEqual({ name: 'test' });
    });

    it('should include idempotency key when specified', async () => {
      let capturedHeaders: Headers | null = null;
      
      server.use(
        http.post('http://localhost:3000/api/v1/test-post-idempotent', async ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({ ok: true, data: {} });
        })
      );

      await apiPost('/test-post-idempotent', {}, true);
      expect(capturedHeaders?.get('Idempotency-Key')).toBeDefined();
    });
  });
});
