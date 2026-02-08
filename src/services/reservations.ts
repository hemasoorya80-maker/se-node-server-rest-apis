/**
 * Reservation Service Module
 *
 * This module contains all business logic for reservation operations.
 * It implements atomic database operations to prevent race conditions
 * and ensure data consistency.
 *
 * Race Condition Problem:
 * Two concurrent requests read the same stock value before either writes,
 * leading to overselling. For example:
 * - Request A reads: availableQty = 3
 * - Request B reads: availableQty = 3
 * - Request A reserves 2: writes availableQty = 1
 * - Request B reserves 2: writes availableQty = 1
 * - Both succeed, but we oversold by 1!
 *
 * Solution: Conditional Updates + Transactions
 * - Update only if enough stock available
 * - Use database-level atomicity
 * - Rollback on failure
 *
 * Best Practices Implemented:
 * - ACID transactions for consistency
 * - Conditional updates (UPDATE ... WHERE availableQty >= ?)
 * - Proper status transitions
 * - Automatic stock restoration on expiry/cancellation
 * - Comprehensive result types
 */

import crypto from 'node:crypto';
import { db, transaction } from '../database/index.js';
import { appConfig } from '../config/index.js';
import { logger } from '../observability/index.js';
import { CacheKeys } from '../cache/index.js';
import type {
  ReserveResult,
  ConfirmResult,
  CancelResult,
  ExpireResult,
  ReserveRequest,
  ConfirmRequest,
  CancelRequest,
  Reservation,
  Item,
} from '../types/index.js';

/**
 * ============================================
 * Reserve Operation
 * ============================================
 */

/**
 * Reserve an item for a user
 * Uses atomic operations to prevent race conditions
 *
 * Algorithm:
 * 1. Check if item exists
 * 2. Atomically decrement stock (only if enough available)
 * 3. Create reservation if stock decrement succeeded
 * 4. Rollback on any failure
 *
 * @param request - Reserve request parameters
 * @returns Result of the operation
 *
 * @example
 * ```ts
 * const result = reserveItem({
 *   userId: 'user_1',
 *   itemId: 'item_1',
 *   qty: 2
 * });
 *
 * if (result.kind === 'OK') {
 *   console.log('Reserved:', result.reservation);
 * } else if (result.kind === 'OUT_OF_STOCK') {
 *   console.log('Not enough stock');
 * }
 * ```
 */
export function reserveItem(request: ReserveRequest): ReserveResult {
  const { userId, itemId, qty } = request;
  const now = Date.now();
  const expiresAt = now + appConfig.RESERVATION_TIMEOUT_MS;
  const reservationId = `res_${crypto.randomUUID()}`;

  return transaction(() => {
    // Step 1: Check if item exists
    const item = db
      .prepare('SELECT id, name, availableQty FROM items WHERE id = ?')
      .get(itemId) as { id: string; name: string; availableQty: number } | undefined;

    if (!item) {
      logger.debug('Reserve failed: item not found', { itemId, userId });
      return { kind: 'NOT_FOUND' };
    }

    // Step 2: Atomically decrement stock
    // This UPDATE only succeeds if there's enough stock
    // The WHERE availableQty >= qty condition is key!
    const updateResult = db
      .prepare('UPDATE items SET availableQty = availableQty - ? WHERE id = ? AND availableQty >= ?')
      .run(qty, itemId, qty);

    if (updateResult.changes === 0) {
      // Conditional update failed = not enough stock
      logger.debug('Reserve failed: out of stock', { itemId, userId, qty, available: item.availableQty });
      return { kind: 'OUT_OF_STOCK', available: item.availableQty };
    }

    // Step 3: Create reservation
    const reservation: Reservation = {
      id: reservationId,
      userId,
      itemId,
      qty,
      status: 'reserved',
      expiresAt,
      createdAt: now,
    };

    db.prepare(
      `INSERT INTO reservations (id, userId, itemId, qty, status, expiresAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(reservation.id, reservation.userId, reservation.itemId, reservation.qty, reservation.status,
          reservation.expiresAt, reservation.createdAt, now);

    logger.info('Item reserved', {
      reservationId,
      userId,
      itemId,
      qty,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    return { kind: 'OK', reservation };
  });
}

/**
 * ============================================
 * Confirm Operation
 * ============================================
 */

/**
 * Confirm a reservation
 * Permanently allocates the reserved stock to the user
 *
 * Algorithm:
 * 1. Find reservation
 * 2. Check status transitions (only 'reserved' can be confirmed)
 * 3. Check if expired
 * 4. Update status to 'confirmed'
 *
 * @param request - Confirm request parameters
 * @returns Result of the operation
 *
 * @example
 * ```ts
 * const result = confirmReservation({
 *   userId: 'user_1',
 *   reservationId: 'res_abc123'
 * });
 * ```
 */
export function confirmReservation(request: ConfirmRequest): ConfirmResult {
  const { userId, reservationId } = request;
  const now = Date.now();

  return transaction(() => {
    // Step 1: Find reservation
    const reservation = db
      .prepare('SELECT * FROM reservations WHERE id = ? AND userId = ?')
      .get(reservationId, userId) as
      | { id: string; userId: string; itemId: string; qty: number; status: string; expiresAt: number }
      | undefined;

    if (!reservation) {
      logger.debug('Confirm failed: reservation not found', { reservationId, userId });
      return { kind: 'NOT_FOUND' };
    }

    // Step 2: Check current status
    if (reservation.status === 'confirmed') {
      logger.debug('Confirm failed: already confirmed', { reservationId });
      return { kind: 'ALREADY_CONFIRMED' };
    }

    if (reservation.status === 'cancelled') {
      logger.debug('Confirm failed: reservation cancelled', { reservationId });
      return { kind: 'CANCELLED' };
    }

    // Step 3: Check if expired
    if (now > reservation.expiresAt) {
      // Mark as expired if not already
      if (reservation.status !== 'expired') {
        // Restore stock
        db.prepare('UPDATE items SET availableQty = availableQty + ? WHERE id = ?').run(
          reservation.qty,
          reservation.itemId
        );

        // Mark reservation as expired
        db.prepare('UPDATE reservations SET status = ?, updatedAt = ? WHERE id = ?').run(
          'expired',
          now,
          reservationId
        );

        logger.info('Reservation expired during confirm', {
          reservationId,
          itemId: reservation.itemId,
          qtyRestored: reservation.qty,
        });
      }

      return { kind: 'EXPIRED' };
    }

    // Step 4: Confirm reservation
    db.prepare('UPDATE reservations SET status = ?, updatedAt = ? WHERE id = ?').run(
      'confirmed',
      now,
      reservationId
    );

    logger.info('Reservation confirmed', { reservationId, userId });

    return { kind: 'OK' };
  });
}

/**
 * ============================================
 * Cancel Operation
 * ============================================
 */

/**
 * Cancel a reservation
 * Returns the reserved stock to the available pool
 *
 * Algorithm:
 * 1. Find reservation
 * 2. Check status (can't cancel confirmed reservations)
 * 3. Restore stock
 * 4. Update status to 'cancelled'
 *
 * @param request - Cancel request parameters
 * @returns Result of the operation
 *
 * @example
 * ```ts
 * const result = cancelReservation({
 *   userId: 'user_1',
 *   reservationId: 'res_abc123'
 * });
 * ```
 */
export function cancelReservation(request: CancelRequest): CancelResult {
  const { userId, reservationId } = request;
  const now = Date.now();

  return transaction(() => {
    // Step 1: Find reservation
    const reservation = db
      .prepare('SELECT * FROM reservations WHERE id = ? AND userId = ?')
      .get(reservationId, userId) as
      | { id: string; userId: string; itemId: string; qty: number; status: string }
      | undefined;

    if (!reservation) {
      logger.debug('Cancel failed: reservation not found', { reservationId, userId });
      return { kind: 'NOT_FOUND' };
    }

    // Step 2: Check status
    if (reservation.status === 'cancelled') {
      logger.debug('Cancel failed: already cancelled', { reservationId });
      return { kind: 'ALREADY_CANCELLED' };
    }

    if (reservation.status === 'confirmed') {
      logger.debug('Cancel failed: already confirmed', { reservationId });
      return { kind: 'ALREADY_CONFIRMED' };
    }

    // Step 3: Restore stock (if not already expired)
    if (reservation.status !== 'expired') {
      db.prepare('UPDATE items SET availableQty = availableQty + ? WHERE id = ?').run(
        reservation.qty,
        reservation.itemId
      );

      logger.debug('Stock restored', {
        reservationId,
        itemId: reservation.itemId,
        qtyRestored: reservation.qty,
      });
    }

    // Step 4: Update status
    db.prepare('UPDATE reservations SET status = ?, updatedAt = ? WHERE id = ?').run(
      'cancelled',
      now,
      reservationId
    );

    logger.info('Reservation cancelled', { reservationId, userId });

    return { kind: 'OK' };
  });
}

/**
 * ============================================
 * Expire Operation
 * ============================================
 */

/**
 * Expire old reservations
 * Returns stock from expired reservations to the pool
 *
 * This should be run periodically (e.g., every minute)
 * Can be triggered via a scheduled job or HTTP endpoint
 *
 * Algorithm:
 * 1. Find all expired 'reserved' reservations
 * 2. Restore stock for each
 * 3. Mark reservations as 'expired'
 *
 * @returns Result of the operation
 *
 * @example
 * ```ts
 * // Run every minute via cron
 * const result = expireReservations();
 * console.log(`Expired ${result.expired} reservations`);
 * ```
 */
export function expireReservations(): ExpireResult {
  const now = Date.now();

  return transaction(() => {
    try {
      // Find all expired reservations
      const expiredReservations = db
        .prepare(
          `SELECT id, itemId, userId, qty
           FROM reservations
           WHERE status = 'reserved' AND expiresAt < ?`
        )
        .all(now) as Array<{ id: string; itemId: string; userId: string; qty: number }>;

      if (expiredReservations.length === 0) {
        return { kind: 'OK', expired: 0 };
      }

      let expiredCount = 0;

      for (const resv of expiredReservations) {
        // Restore stock
        db.prepare('UPDATE items SET availableQty = availableQty + ? WHERE id = ?').run(
          resv.qty,
          resv.itemId
        );

        // Mark as expired
        db.prepare('UPDATE reservations SET status = ?, updatedAt = ? WHERE id = ?').run(
          'expired',
          now,
          resv.id
        );

        expiredCount++;

        logger.debug('Reservation expired', {
          reservationId: resv.id,
          userId: resv.userId,
          itemId: resv.itemId,
          qty: resv.qty,
        });
      }

      logger.info('Expired reservations', { count: expiredCount });

      return { kind: 'OK', expired: expiredCount };
    } catch (error) {
      logger.error('Failed to expire reservations', error);
      return { kind: 'ERROR', message: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

/**
 * ============================================
 * Query Operations
 * ============================================
 */

/**
 * Get all items
 *
 * @param options - Query options
 * @returns Array of items
 */
export function listItems(options: { sortBy?: 'name' | 'availableQty'; sortOrder?: 'asc' | 'desc' } = {}): Item[] {
  const { sortBy = 'name', sortOrder = 'asc' } = options;

  const orderBy = `${sortBy} ${sortOrder.toUpperCase()}`;

  const items = db
    .prepare(`SELECT id, name, availableQty FROM items ORDER BY ${orderBy}`)
    .all() as Array<{ id: string; name: string; availableQty: number }>;

  return items;
}

/**
 * Get a single item by ID
 *
 * @param itemId - Item ID
 * @returns Item or null if not found
 */
export function getItem(itemId: string): Item | null {
  const item = db
    .prepare('SELECT id, name, availableQty FROM items WHERE id = ?')
    .get(itemId) as { id: string; name: string; availableQty: number } | undefined;

  return item || null;
}

/**
 * Get all reservations for a user
 *
 * @param userId - User ID
 * @param options - Query options
 * @returns Array of reservations
 */
export function listReservationsForUser(
  userId: string,
  options: { status?: string; limit?: number } = {}
): Reservation[] {
  const { status, limit } = options;

  let query = 'SELECT id, userId, itemId, qty, status, expiresAt, createdAt FROM reservations WHERE userId = ?';
  const params: unknown[] = [userId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY createdAt DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  const reservations = db.prepare(query).all(...params) as Reservation[];

  return reservations;
}

/**
 * Get a single reservation by ID
 *
 * @param reservationId - Reservation ID
 * @returns Reservation or null if not found
 */
export function getReservation(reservationId: string): Reservation | null {
  const reservation = db
    .prepare(
      'SELECT id, userId, itemId, qty, status, expiresAt, createdAt FROM reservations WHERE id = ?'
    )
    .get(reservationId) as Reservation | undefined;

  return reservation || null;
}

/**
 * Get statistics about reservations
 * Useful for monitoring and analytics
 *
 * @returns Statistics object
 */
export function getReservationStats(): {
  total: number;
  byStatus: Record<string, number>;
  expiredCount: number;
  expiringSoon: number;
} {
  const total =
    (db.prepare('SELECT COUNT(*) as count FROM reservations').get() as { count: number }).count || 0;

  const byStatusRows = db
    .prepare('SELECT status, COUNT(*) as count FROM reservations GROUP BY status')
    .all() as Array<{ status: string; count: number }>;

  const byStatus: Record<string, number> = {};
  for (const row of byStatusRows) {
    byStatus[row.status] = row.count;
  }

  const now = Date.now();
  const expiredCount =
    (db
      .prepare('SELECT COUNT(*) as count FROM reservations WHERE status = ? AND expiresAt < ?')
      .get('reserved', now) as { count: number }).count || 0;

  const expiringSoon =
    (db
      .prepare(
        'SELECT COUNT(*) as count FROM reservations WHERE status = ? AND expiresAt >= ? AND expiresAt < ?'
      )
      .get('reserved', now, now + 5 * 60 * 1000) as { count: number }).count || 0;

  return {
    total,
    byStatus,
    expiredCount,
    expiringSoon,
  };
}

/**
 * ============================================
 * Cache Invalidation Helpers
 * ============================================

/**
 * Invalidate item-related caches
 * Call this after any item modification
 */
export function invalidateItemCaches(itemId?: string): void {
  // Invalidate items list cache
  CacheKeys.items();

  // Invalidate specific item cache if provided
  if (itemId) {
    CacheKeys.item(itemId);
  }

  // In production, you'd integrate with your cache module here
  logger.debug('Item caches invalidated', { itemId });
}

/**
 * Invalidate reservation-related caches
 * Call this after any reservation modification
 */
export function invalidateReservationCaches(reservationId: string, userId: string): void {
  // Invalidate user's reservations cache
  CacheKeys.userReservations(userId);

  // Invalidate specific reservation cache
  CacheKeys.reservation(reservationId);

  logger.debug('Reservation caches invalidated', { reservationId, userId });
}

/**
 * ============================================
 * Batch Operations
 * ============================================

/**
 * Reserve multiple items in a single transaction
 * All reservations succeed or all fail together
 *
 * @param userId - User ID
 * @param items - Array of { itemId, qty } pairs
 * @returns Result of the operation
 */
export function reserveMultipleItems(
  userId: string,
  items: Array<{ itemId: string; qty: number }>
): { kind: 'OK'; reservations: Reservation[] } | { kind: 'ERROR'; message: string; failedAt?: string } {
  return transaction(() => {
    const reservations: Reservation[] = [];

    for (const item of items) {
      const result = reserveItem({ userId, itemId: item.itemId, qty: item.qty });

      if (result.kind !== 'OK') {
        return {
          kind: 'ERROR',
          message: `Failed to reserve item ${item.itemId}`,
          failedAt: item.itemId,
        };
      }

      // TypeScript needs explicit type narrowing
      if ('reservation' in result) {
        reservations.push(result.reservation);
      }
    }

    logger.info('Multiple items reserved', { userId, count: reservations.length });

    return { kind: 'OK', reservations };
  });
}
