/**
 * API Routes Module
 *
 * This module defines all API endpoints for the reservation system.
 * Each endpoint includes:
 * - Input validation
 * - Error handling
 * - Response formatting
 * - Logging
 * - Idempotency support
 * - Cache invalidation
 *
 * Endpoints:
 * - GET  /api/v1/items              - List all items
 * - GET  /api/v1/items/:id          - Get single item
 * - GET  /api/v1/reservations/:userId - List user's reservations
 * - GET  /api/v1/reservations/:id   - Get single reservation
 * - POST /api/v1/reserve            - Reserve an item
 * - POST /api/v1/confirm            - Confirm a reservation
 * - POST /api/v1/cancel             - Cancel a reservation
 * - POST /api/v1/expire/run         - Expire old reservations (admin)
 */

import type { Request, Response, Router } from 'express';
import { Router as expressRouter } from 'express';
import { ok, created, notFound, conflict, badRequest } from '../http/index.js';
import {
  validateRequest,
  reserveRequestSchema,
  confirmRequestSchema,
  cancelRequestSchema,
  getItemsQuerySchema,
} from '../validation/schemas.js';
import {
  reserveItem,
  confirmReservation,
  cancelReservation,
  expireReservations,
  listItems,
  getItem,
  listReservationsForUser,
  getReservation,
} from '../services/reservations.js';
import { idempotencyMiddleware } from '../idempotency/index.js';
import { getCache, setCache, invalidate, CacheKeys } from '../cache/index.js';
import { logger, incrementCounter, recordHistogram } from '../observability/index.js';
import { appConfig } from '../config/index.js';

/**
 * ============================================
 * Create Router
 * ============================================
 */

export function createRouter(): Router {
  const router = expressRouter();

  /**
   * ============================================
   * GET /items - List all items
   * ============================================
   *
   * Returns a list of all available items with their current stock.
   * Cached for 30 seconds to reduce database load.
   *
   * Query Parameters:
   * - page: Page number (default: 1)
   * - pageSize: Items per page (default: 20, max: 100)
   * - sortBy: Sort field (name or availableQty)
   * - sortOrder: Sort order (asc or desc)
   *
   * Example Response:
   * ```json
   * {
   *   "ok": true,
   *   "data": [
   *     { "id": "item_1", "name": "Wireless Mouse", "availableQty": 3 }
   *   ]
   * }
   * ```
   */
  router.get('/items', async (req: Request, res: Response) => {
    const start = Date.now();

    try {
      // Validate query parameters
      const queryResult = validateRequest(getItemsQuerySchema, req.query);
      if (!queryResult.success) {
        return badRequest(res, req, queryResult.error.code, queryResult.error.message, {
          issues: queryResult.error.details,
        });
      }

      const { sortBy, sortOrder } = queryResult.data;

      // Check cache
      const cacheKey = CacheKeys.items();
      const cached = getCache(cacheKey);
      if (cached) {
        logger.debug('Cache hit for items list');
        return ok(res, cached);
      }

      // Fetch from database
      const items = listItems({ sortBy, sortOrder });

      // Cache for 30 seconds
      setCache(cacheKey, items, appConfig.CACHE_TTL_ITEMS);

      // Record metrics
      const duration = Date.now() - start;
      incrementCounter('requests.getItems.success');
      recordHistogram('request_duration', duration, { endpoint: '/items' });

      return ok(res, items);
    } catch (error) {
      logger.error('Failed to list items', error);
      incrementCounter('requests.getItems.error');
      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve items',
        },
      });
    }
  });

  /**
   * ============================================
   * GET /items/:id - Get single item
   * ============================================
   *
   * Returns details for a specific item.
   * Cached for 30 seconds.
   *
   * Example Response:
   * ```json
   * {
   *   "ok": true,
   *   "data": {
   *     "id": "item_1",
   *     "name": "Wireless Mouse",
   *     "availableQty": 3
   *   }
   * }
   * ```
   */
  router.get('/items/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check cache
      const cacheKey = CacheKeys.item(id);
      const cached = getCache(cacheKey);
      if (cached) {
        return ok(res, cached);
      }

      // Fetch from database
      const item = getItem(id);

      if (!item) {
        return notFound(res, req, 'ITEM_NOT_FOUND', 'Item not found', { itemId: id });
      }

      // Cache for 30 seconds
      setCache(cacheKey, item, appConfig.CACHE_TTL_ITEMS);

      return ok(res, item);
    } catch (error) {
      logger.error('Failed to get item', error);
      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve item',
        },
      });
    }
  });

  /**
   * ============================================
   * GET /reservations/:userId - List user's reservations
   * ============================================
   *
   * Returns all reservations for a specific user.
   *
   * Query Parameters:
   * - status: Filter by status (reserved, confirmed, cancelled, expired)
   *
   * Example Response:
   * ```json
   * {
   *   "ok": true,
   *   "data": [
   *     {
   *       "id": "res_abc123",
   *       "itemId": "item_1",
   *       "qty": 2,
   *       "status": "reserved",
   *       "expiresAt": 1706720400000
   *     }
   *   ]
   * }
   * ```
   */
  router.get('/reservations/user/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status } = req.query;

      const reservations = listReservationsForUser(userId, {
        status: status as string | undefined,
      });

      return ok(res, reservations);
    } catch (error) {
      logger.error('Failed to list reservations', error);
      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve reservations',
        },
      });
    }
  });

  /**
   * ============================================
   * GET /reservations/:id - Get single reservation
   * ============================================
   *
   * Returns details for a specific reservation.
   *
   * Example Response:
   * ```json
   * {
   *   "ok": true,
   *   "data": {
   *     "id": "res_abc123",
   *     "userId": "user_1",
   *     "itemId": "item_1",
   *     "qty": 2,
   *     "status": "reserved",
   *     "expiresAt": 1706720400000,
   *     "createdAt": 1706716800000
   *   }
   * }
   * ```
   */
  router.get('/reservations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const reservation = getReservation(id);

      if (!reservation) {
        return notFound(res, req, 'RESERVATION_NOT_FOUND', 'Reservation not found', { reservationId: id });
      }

      return ok(res, reservation);
    } catch (error) {
      logger.error('Failed to get reservation', error);
      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve reservation',
        },
      });
    }
  });

  /**
   * ============================================
   * POST /reserve - Reserve an item
   * ============================================
   *
   * Creates a new reservation, temporarily holding stock.
   * Reservation expires after 10 minutes if not confirmed.
   *
   * Idempotency: Provide `Idempotency-Key` header to prevent duplicate reservations.
   *
   * Headers:
   * - Idempotency-Key: Unique key for idempotency (recommended)
   *
   * Request Body:
   * ```json
   * {
   *   "userId": "user_1",
   *   "itemId": "item_1",
   *   "qty": 2
   * }
   * ```
   *
   * Success Response (201):
   * ```json
   * {
   *   "ok": true,
   *   "data": {
   *     "id": "res_abc123",
   *     "userId": "user_1",
   *     "itemId": "item_1",
   *     "qty": 2,
   *     "status": "reserved",
   *     "expiresAt": 1706720400000,
   *     "createdAt": 1706716800000
   *   }
   * }
   * ```
   *
   * Error Responses:
   * - 400: Invalid request body
   * - 404: Item not found
   * - 409: Out of stock
   */
  router.post('/reserve', idempotencyMiddleware('/reserve'), async (req: Request, res: Response) => {
    try {
      // Validate request body
      const bodyResult = validateRequest(reserveRequestSchema, req.body);
      if (!bodyResult.success) {
        return badRequest(res, req, bodyResult.error.code, bodyResult.error.message, {
          issues: bodyResult.error.details,
        });
      }

      const { userId, itemId, qty } = bodyResult.data;

      logger.info('Processing reservation request', { userId, itemId, qty });

      // Reserve item
      const result = reserveItem({ userId, itemId, qty });

      if (result.kind === 'NOT_FOUND') {
        return notFound(res, req, 'ITEM_NOT_FOUND', 'Item not found', { itemId });
      }

      if (result.kind === 'OUT_OF_STOCK') {
        return conflict(res, req, 'OUT_OF_STOCK', 'Not enough stock available', {
          itemId,
          requested: qty,
          available: result.available,
        });
      }

      if (result.kind === 'INVALID_QUANTITY') {
        return badRequest(res, req, 'VALIDATION_ERROR', 'Invalid quantity', {
          min: result.min,
          max: result.max,
        });
      }

      // Invalidate items cache
      invalidate(CacheKeys.items());
      invalidate(CacheKeys.item(itemId));

      // At this point, result must be OK (all other cases handled)
      logger.info('Reservation created', { reservationId: result.reservation.id });
      return created(res, result.reservation);
    } catch (error) {
      logger.error('Failed to create reservation', error);
      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create reservation',
        },
      });
    }
  });

  /**
   * ============================================
   * POST /confirm - Confirm a reservation
   * ============================================
   *
   * Confirms a reservation, permanently allocating the stock.
   *
   * Idempotency: Provide `Idempotency-Key` header to handle duplicate confirm requests.
   *
   * Headers:
   * - Idempotency-Key: Unique key for idempotency (recommended)
   *
   * Request Body:
   * ```json
   * {
   *   "userId": "user_1",
   *   "reservationId": "res_abc123"
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "ok": true,
   *   "data": {
   *     "status": "confirmed"
   *   }
   * }
   * ```
   *
   * Special Cases:
   * - Already confirmed: Returns 200 with status "already_confirmed" (idempotent)
   * - Expired: Returns 409 with error
   *
   * Error Responses:
   * - 400: Invalid request body
   * - 404: Reservation not found
   * - 409: Reservation expired or cancelled
   */
  router.post('/confirm', idempotencyMiddleware('/confirm'), async (req: Request, res: Response) => {
    try {
      // Validate request body
      const bodyResult = validateRequest(confirmRequestSchema, req.body);
      if (!bodyResult.success) {
        return badRequest(res, req, bodyResult.error.code, bodyResult.error.message, {
          issues: bodyResult.error.details,
        });
      }

      const { userId, reservationId } = bodyResult.data;

      logger.info('Processing confirmation request', { userId, reservationId });

      // Confirm reservation
      const result = confirmReservation({ userId, reservationId });

      if (result.kind === 'NOT_FOUND') {
        return notFound(res, req, 'RESERVATION_NOT_FOUND', 'Reservation not found', { reservationId });
      }

      if (result.kind === 'EXPIRED') {
        // Invalidate cache on expiry
        invalidate(CacheKeys.items());

        return conflict(res, req, 'EXPIRED', 'Reservation has expired', { reservationId });
      }

      if (result.kind === 'ALREADY_CONFIRMED') {
        // Return success for idempotency
        return ok(res, { status: 'already_confirmed' });
      }

      if (result.kind === 'CANCELLED') {
        return conflict(res, req, 'CANCELLED', 'Reservation has been cancelled', { reservationId });
      }

      logger.info('Reservation confirmed', { reservationId });

      return ok(res, { status: 'confirmed' });
    } catch (error) {
      logger.error('Failed to confirm reservation', error);
      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to confirm reservation',
        },
      });
    }
  });

  /**
   * ============================================
   * POST /cancel - Cancel a reservation
   * ============================================
   *
   * Cancels a reservation, returning stock to the available pool.
   *
   * Request Body:
   * ```json
   * {
   *   "userId": "user_1",
   *   "reservationId": "res_abc123"
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "ok": true,
   *   "data": {
   *     "status": "cancelled"
   *   }
   * }
   * ```
   *
   * Special Cases:
   * - Already cancelled: Returns 200 with status "already_cancelled" (idempotent)
   * - Already confirmed: Returns 409 (can't cancel confirmed reservations)
   *
   * Error Responses:
   * - 400: Invalid request body
   * - 404: Reservation not found
   * - 409: Already confirmed
   */
  router.post('/cancel', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const bodyResult = validateRequest(cancelRequestSchema, req.body);
      if (!bodyResult.success) {
        return badRequest(res, req, bodyResult.error.code, bodyResult.error.message, {
          issues: bodyResult.error.details,
        });
      }

      const { userId, reservationId } = bodyResult.data;

      logger.info('Processing cancellation request', { userId, reservationId });

      // Cancel reservation
      const result = cancelReservation({ userId, reservationId });

      if (result.kind === 'NOT_FOUND') {
        return notFound(res, req, 'RESERVATION_NOT_FOUND', 'Reservation not found', { reservationId });
      }

      if (result.kind === 'ALREADY_CANCELLED') {
        // Return success for idempotency
        return ok(res, { status: 'already_cancelled' });
      }

      if (result.kind === 'ALREADY_CONFIRMED') {
        return conflict(res, req, 'ALREADY_CONFIRMED', 'Cannot cancel confirmed reservation', {
          reservationId,
        });
      }

      // Invalidate items cache
      invalidate(CacheKeys.items());

      logger.info('Reservation cancelled', { reservationId });

      return ok(res, { status: 'cancelled' });
    } catch (error) {
      logger.error('Failed to cancel reservation', error);
      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel reservation',
        },
      });
    }
  });

  /**
   * ============================================
   * POST /expire/run - Expire old reservations
   * ============================================
   *
   * Manually trigger expiration of old reservations.
   * In production, this would be run as a scheduled job (cron).
   *
   * Success Response (200):
   * ```json
   * {
   *   "ok": true,
   *   "data": {
   *     "expired": 5,
   *     "message": "Expired 5 reservations"
   *   }
   * }
   * ```
   */
  router.post('/expire/run', async (req: Request, res: Response) => {
    try {
      logger.info('Running expiration job');

      const result = expireReservations();

      if (result.kind === 'ERROR') {
        return res.status(500).json({
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to expire reservations',
            details: { error: result.message },
          },
        });
      }

      // Invalidate all caches
      invalidate(CacheKeys.items());

      logger.info('Expiration job completed', { expired: result.expired });

      return ok(res, {
        expired: result.expired,
        message: `Expired ${result.expired} reservation${result.expired === 1 ? '' : 's'}`,
      });
    } catch (error) {
      logger.error('Failed to run expiration', error);
      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to run expiration',
        },
      });
    }
  });

  return router;
}
