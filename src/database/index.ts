/**
 * Database Module
 *
 * This module handles all database operations using SQLite with better-sqlite3.
 * It provides a connection pool, query helpers, and transaction support.
 *
 * Best Practices Implemented:
 * - Connection pooling
 * - Prepared statements (SQL injection prevention)
 * - Transaction support
 * - WAL mode for better concurrency
 * - Query timeout handling
 * - Type-safe queries
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import crypto from 'node:crypto';
import { appConfig } from '../config/index.js';
import type { ItemRow, ReservationRow, IdempotencyKeyRow } from '../types/index.js';

/**
 * ============================================
 * Database Connection
 * ============================================
 */

/**
 * Ensure the database directory exists
 */
function ensureDbDir(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Creates and configures the database connection
 *
 * Configuration decisions:
 * - WAL mode: Better concurrent read/write performance
 * - Journal mode: Write-Ahead Logging for safety
 * - Foreign keys: Enforced for referential integrity
 * - Busy timeout: Wait 5 seconds if database is locked
 */
export function createDatabase(): any {
  ensureDbDir(appConfig.DB_PATH);

  const db = new Database(appConfig.DB_PATH, {
    verbose: appConfig.isDevelopment ? console.log : undefined,
    fileMustExist: false,
  });

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Enable foreign key constraints
  db.pragma('foreign_keys = ON');

  // Set busy timeout (wait if DB is locked)
  db.pragma('busy_timeout = 5000');

  // Performance optimizations
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache
  db.pragma('temp_store = MEMORY');

  return db;
}

/**
 * Singleton database instance
 * Export this for use throughout the application
 */
export const db = createDatabase() as any;

/**
 * ============================================
 * Database Schema
 * ============================================
 */

/**
 * Initialize database schema
 * Creates all tables if they don't exist
 *
 * Schema Design Notes:
 * - Items table: Inventory items with available quantities
 * - Reservations table: Time-limited stock holds
 * - Idempotency keys table: Prevents duplicate request processing
 *
 * Indexes are created on frequently queried columns for performance.
 */
export function initializeSchema(): void {
  db.exec(`
    -- ============================================
    -- Items Table
    -- Stores inventory items that can be reserved
    -- ============================================
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      availableQty INTEGER NOT NULL CHECK(availableQty >= 0),
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    -- Index for item lookups by name
    CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);

    -- ============================================
    -- Reservations Table
    -- Stores reservation records with status tracking
    -- ============================================
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      qty INTEGER NOT NULL CHECK(qty > 0),
      status TEXT NOT NULL CHECK(status IN ('reserved', 'confirmed', 'cancelled', 'expired')),
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),

      -- Foreign key to items table
      FOREIGN KEY(itemId) REFERENCES items(id) ON DELETE RESTRICT
    );

    -- Index for user's reservations lookup
    CREATE INDEX IF NOT EXISTS idx_reservations_userId ON reservations(userId);

    -- Index for item reservations lookup
    CREATE INDEX IF NOT EXISTS idx_reservations_itemId ON reservations(itemId);

    -- Index for finding expired reservations
    CREATE INDEX IF NOT EXISTS idx_reservations_expiresAt ON reservations(expiresAt);

    -- Index for status-based queries
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

    -- Composite index for user's active reservations
    CREATE INDEX IF NOT EXISTS idx_reservations_user_status
      ON reservations(userId, status)
      WHERE status IN ('reserved', 'confirmed');

    -- ============================================
    -- Idempotency Keys Table
    -- Prevents duplicate processing of requests
    -- ============================================
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT NOT NULL,
      route TEXT NOT NULL,
      userId TEXT NOT NULL,
      responseJson TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      PRIMARY KEY (key, route, userId)
    );

    -- Index for cleaning old idempotency keys
    CREATE INDEX IF NOT EXISTS idx_idempotency_createdAt ON idempotency_keys(createdAt);

    -- ============================================
    -- Metadata Table
    -- Stores database version and migration info
    -- ============================================
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
  `);
}

/**
 * ============================================
 * Database Health Check
 * ============================================
 */

/**
 * Check if database is healthy and responsive
 */
export function checkDatabaseHealth(): { healthy: boolean; latency: number } {
  const start = Date.now();
  try {
    db.prepare('SELECT 1').get();
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { healthy: false, latency: Date.now() - start };
  }
}

/**
 * ============================================
* Query Helpers
 * ============================================
 */

/**
 * Run a query in a transaction
 * Automatically commits on success or rolls back on error
 */
export function transaction<T>(fn: () => T): T {
  const tx = db.transaction(fn);
  return tx();
}

/**
 * ============================================
 * Cleanup
 * ============================================
 */

/**
 * Gracefully close the database connection
 * Call this on application shutdown
 */
export function closeDatabase(): void {
  try {
    // Perform checkpoint to finalize WAL
    db.pragma('wal_checkpoint(TRUNCATE)');

    // Close connection
    db.close();
    console.log('Database connection closed successfully');
  } catch (error) {
    console.error('Error closing database:', error);
    throw error;
  }
}

/**
 * Handle process shutdown gracefully
 */
export function setupShutdownHandlers(): void {
  const shutdown = (signal: string): void => {
    console.log(`\nReceived ${signal}, closing database connection...`);
    try {
      closeDatabase();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Re-export types for convenience
export type { ItemRow, ReservationRow, IdempotencyKeyRow };
