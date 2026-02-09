/**
 * Main Server File
 *
 * This is the entry point for the Express application.
 * It sets up all middleware, routes, and starts the HTTP server.
 *
 * Architecture:
 * 1. Initialize database
 * 2. Configure Express with middleware
 * 3. Register routes
 * 4. Start HTTP server
 * 5. Handle graceful shutdown
 *
 * Best Practices Implemented:
 * - Graceful shutdown on SIGTERM/SIGINT
 * - Health check endpoints
 * - Structured logging
 * - Error handling middleware
 * - Security middleware
 * - Request tracing
 */

import express from 'express';
import compression from 'compression';
import { initializeSchema, closeDatabase } from './database/index.js';
import { seedAll } from './database/seed.js';
import { appConfig } from './config/index.js';
import {
  logger,
  requestIdMiddleware,
  requestLoggingMiddleware,
  type RequestWithRequestId,
} from './observability/index.js';
import { applySecurityMiddleware } from './middleware/security.js';
import { strictRateLimiter, slowDown } from './middleware/rateLimit.js';
import { initializeCache, shutdownCache } from './cache/index.js';
import { createRouter } from './routes/index.js';
import { createHealthRouter } from './routes/health.js';
import { expireReservations } from './services/reservations.js';

/**
 * ============================================
 * Application Initialization
 * ============================================
 */

/**
 * Create and configure the Express application
 */
function createApp() {
  const app = express();

  // ==========================================
  // Trust proxy (for reverse proxy setups)
  // ==========================================
  // Enable when behind a reverse proxy (nginx, AWS ELB, etc.)
  // Sets req.ip, req.protocol from X-Forwarded-* headers
  app.set('trust proxy', appConfig.isProduction ? 1 : 0);

  // ==========================================
  // Security Middleware
  // ==========================================
  applySecurityMiddleware(app);

  // ==========================================
  // Body Parser Middleware
  // ==========================================
  // Parse JSON request bodies
  app.use(
    express.json({
      // Verify content-type header
      strict: true,
      // Limit request body size
      limit: '1mb',
      // Verify type
      type: 'application/json',
    })
  );

  // ==========================================
  // Compression Middleware
  // ==========================================
  // Compress response bodies for better performance
  app.use(
    compression({
      // Only compress if response is larger than this threshold
      threshold: 1024, // 1KB
      // Filter function to decide which responses to compress
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Don't compress responses with this header
        return compression.filter(req, res);
      },
    })
  );

  // ==========================================
  // Observability Middleware
  // ==========================================
  // Request ID generation and tracing
  app.use(requestIdMiddleware as any);

  // Request/response logging
  app.use(requestLoggingMiddleware as any);

  // ==========================================
  // Rate Limiting
  // ==========================================
  // Apply rate limiting to all API routes
  // More strict limits on mutation endpoints
  app.use('/api/v1/reserve', strictRateLimiter);
  app.use('/api/v1/confirm', strictRateLimiter);
  app.use('/api/v1/cancel', strictRateLimiter);

  // Gradual slowdown for all routes
  app.use(slowDown);

  // ==========================================
  // Routes
  // ==========================================
  // Health check routes (no rate limiting)
  app.use('/', createHealthRouter());

  // API routes
  const apiRouter = createRouter();
  app.use(appConfig.API_BASE_PATH, apiRouter);

  // ==========================================
  // Root Endpoint
  // ==========================================
  app.get('/', (req, res) => {
    res.json({
      ok: true,
      data: {
        name: 'CCA Reservation API',
        version: appConfig.API_VERSION,
        environment: appConfig.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ==========================================
  // API Info Endpoint
  // ==========================================
  app.get('/api', (req, res) => {
    res.json({
      ok: true,
      data: {
        name: 'CCA Reservation API',
        version: appConfig.API_VERSION,
        description: 'Production-ready reservation API with best practices',
        endpoints: {
          items: 'GET /api/v1/items',
          reserve: 'POST /api/v1/reserve',
          confirm: 'POST /api/v1/confirm',
          cancel: 'POST /api/v1/cancel',
          health: 'GET /health',
        },
        documentation: '/api/docs',
        health: '/health',
      },
    });
  });

  // ==========================================
  // 404 Handler
  // ==========================================
  // This must be after all routes but before error handler
  app.use((req, res) => {
    res.status(404).json({
      ok: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        details: {
          method: req.method,
          path: req.path,
          availableRoutes: [
            'GET /',
            'GET /health',
            'GET /api',
            'GET /api/v1/items',
            'POST /api/v1/reserve',
            'POST /api/v1/confirm',
            'POST /api/v1/cancel',
          ],
        },
      },
    });
  });

  // ==========================================
  // Global Error Handler
  // ==========================================
  // This must be the last middleware
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', err, {
      path: req.path,
      method: req.method,
      requestId: (req as any).requestId,
    });

    // Don't leak error details in production
    const message = appConfig.isProduction ? 'Internal server error' : err.message;

    res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
        ...(appConfig.isDevelopment && { stack: err.stack }),
      },
    });
  });

  return app;
}

/**
 * ============================================
 * Server Startup
 * ============================================
 */

/**
 * Start the HTTP server
 */
function startServer() {
  const app = createApp();
  const server = app.listen(appConfig.PORT, appConfig.HOST, () => {
    logger.info(
      `🚀 Server running on ${appConfig.serverUrl}${appConfig.API_BASE_PATH} in ${appConfig.NODE_ENV} mode`
    );
    logger.info(`📚 Health check available at ${appConfig.serverUrl}/health`);
    logger.info(`📖 API info available at ${appConfig.serverUrl}/api`);
  });

  // Handle server startup errors
  server.on('error', (err) => {
    logger.error('Failed to start server', err);
    process.exit(1);
  });

  // Set server timeout
  server.timeout = appConfig.REQUEST_TIMEOUT;
  server.keepAliveTimeout = 65000; // Slightly higher than load balancer timeout
  server.headersTimeout = 66000;

  return server;
}

/**
 * ============================================
 * Graceful Shutdown
 * ============================================
 */

/**
 * Shutdown the application gracefully
 *
 * Graceful shutdown ensures:
 * 1. No new requests are accepted
 * 2. In-flight requests are given time to complete
 * 3. Database connections are closed properly
 * 4. Cache is flushed
 * 5. Logs are flushed
 */
async function gracefulShutdown(
  server: ReturnType<typeof startServer>,
  signal: string
): Promise<void> {
  logger.info(`\n${signal} received, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      logger.error('Error closing HTTP server', err);
      process.exit(1);
    }

    logger.info('✅ HTTP server closed');

    // Close database connection
    try {
      closeDatabase();
    } catch (error) {
      logger.error('Error closing database', error);
      process.exit(1);
    }

    // Shutdown cache
    try {
      shutdownCache();
    } catch (error) {
      logger.error('Error shutting down cache', error);
    }

    logger.info('✅ Shutdown complete');
    process.exit(0);
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 30000); // 30 seconds
}

/**
 * ============================================
 * Background Job: Reservation Expiration
 * ============================================
 * 
 * This module implements a background job that periodically checks for
 * and expires stale reservations. This is a critical component for
 * maintaining data consistency and preventing "lost" inventory.
 * 
 * LEARNING OBJECTIVES:
 * 1. Background job patterns in Node.js
 * 2. setInterval vs setTimeout for recurring tasks
 * 3. Graceful shutdown with cleanup
 * 4. Error handling in background tasks
 * 
 * WHY A BACKGROUND JOB?
 * 
 * Reservations have a time limit (10 minutes). When they expire, the stock
 * must be returned to the available pool. There are two approaches:
 * 
 * 1. Lazy expiration: Check expiry when the reservation is accessed
 *    - Pros: No background job needed
 *    - Cons: Stock appears unavailable until someone tries to use it
 * 
 * 2. Background expiration (what we use): Periodically scan and expire
 *    - Pros: Stock becomes available immediately when expired
 *    - Cons: Requires a background process
 * 
 * We chose approach 2 for better UX - expired stock becomes available
 * for new reservations immediately.
 * 
 * BEST PRACTICES IMPLEMENTED:
 * - Run immediately on startup (catch expired reservations from downtime)
 * - Regular interval (30 seconds - balance between freshness and load)
 * - Error isolation (job errors don't crash the server)
 * - Graceful cleanup (clear interval on shutdown)
 * - Structured logging (track what the job is doing)
 * 
 * @see {@link ./services/reservations.ts} For the expireReservations() function
 * @see {@link ./config/index.ts} For RESERVATION_TIMEOUT_MS configuration
 */

/**
 * Handle to the background expiration interval timer.
 * 
 * We store this to:
 * 1. Prevent multiple intervals from being started
 * 2. Allow clean shutdown by clearing the interval
 * 3. Enable unit testing (can mock the timer)
 */
let expirationInterval: NodeJS.Timeout | null = null;

/**
 * Start the background reservation expiration job.
 * 
 * This function:
 * 1. Runs expiration immediately (catches reservations that expired while server was down)
 * 2. Sets up a recurring interval (every 30 seconds)
 * 3. Handles errors gracefully (logs but doesn't crash)
 * 
 * ERROR HANDLING STRATEGY:
 * The job runs in an isolated try-catch block. If expiration fails:
 * - Error is logged with context
 * - Server continues running
 * - Next interval will retry
 * 
 * This is important because we don't want a database hiccup to crash the server.
 * 
 * INTERVAL CHOICE:
 * 30 seconds is a balance between:
 * - Too frequent: Unnecessary database load
 * - Too rare: Stock stays "locked" longer than needed
 * 
 * With a 10-minute reservation timeout, 30-second checks are plenty.
 * 
 * @example
 * ```typescript
 * // In main() during startup
 * startExpirationJob();
 * 
 * // Logs on startup:
 * // "Initial expiration check" (if any expired while down)
 * // "⏰ Background expiration job started (30s interval)"
 * 
 * // Every 30 seconds (only if there are expired reservations):
 * // "Expired stale reservations" { count: 3 }
 * ```
 */
function startExpirationJob(): void {
  // Run immediately on startup to catch any reservations that expired
  // while the server was down. This ensures stock is returned promptly.
  const result = expireReservations();
  if (result.kind === 'OK' && result.expired > 0) {
    logger.info('Initial expiration check', { expired: result.expired });
  }

  // Schedule periodic runs every 30 seconds
  // setInterval is appropriate here because:
  // - The task runs indefinitely
  // - Regular intervals are desired
  // - We don't need the flexibility of setTimeout recursion
  expirationInterval = setInterval(() => {
    try {
      // Run the expiration logic
      const result = expireReservations();
      
      // Only log if we actually expired something (reduces noise)
      if (result.kind === 'OK' && result.expired > 0) {
        logger.info('Expired stale reservations', { count: result.expired });
      }
      // Silently succeed if nothing expired - this is normal
    } catch (error) {
      // Error isolation: Log the error but don't let it crash the server
      // The next interval will retry
      logger.error('Error in expiration job', error);
    }
  }, 30000); // 30 seconds = 30,000 milliseconds

  logger.info('⏰ Background expiration job started (30s interval)');
}

/**
 * Stop the background expiration job.
 * 
 * This is called during graceful shutdown to:
 * 1. Prevent the job from running after shutdown starts
 * 2. Clean up resources (Node.js won't exit while intervals are pending)
 * 3. Allow for clean unit testing (no hanging timers)
 * 
 * WHY CLEAR THE INTERVAL?
 * 
 * Node.js keeps the event loop alive while timers are pending.
 * If we don't clear the interval, the process might hang during shutdown.
 * 
 * @example
 * ```typescript
 * // During graceful shutdown
 * stopExpirationJob();
 * // Logs: "⏰ Background expiration job stopped"
 * ```
 */
function stopExpirationJob(): void {
  if (expirationInterval) {
    clearInterval(expirationInterval);
    expirationInterval = null; // Clear the reference
    logger.info('⏰ Background expiration job stopped');
  }
}

/**
 * ============================================
 * Application Entry Point
 * ============================================
 * 
 * This is the main entry point for the application. It orchestrates
 * the startup sequence and manages the application lifecycle.
 * 
 * STARTUP SEQUENCE:
 * 
 * 1. Initialize database (create tables if not exist)
 * 2. Seed database with sample data (if empty)
 * 3. Initialize cache layer
 * 4. Start background expiration job (CRITICAL - returns expired stock)
 * 5. Start HTTP server
 * 6. Register shutdown handlers
 * 
 * WHY THIS ORDER?
 * 
 * Database MUST be ready before the server starts accepting requests.
 * The expiration job MUST start before the server to ensure any stock
 * from expired reservations (while server was down) is returned immediately.
 * 
 * BACKGROUND JOB INTEGRATION:
 * 
 * The expiration job is started before the HTTP server. This ensures:
 * - Stock from expired reservations is returned immediately on startup
 * - No race condition where requests come in before job is ready
 * - Clean shutdown sequence (job stops before HTTP connections close)
 * 
 * SHUTDOWN SEQUENCE:
 * 
 * When SIGTERM/SIGINT is received:
 * 1. Stop expiration job (no new expirations)
 * 2. Close HTTP server (no new connections)
 * 3. Wait for in-flight requests to complete (30s timeout)
 * 4. Close database connection
 * 5. Flush logs and exit
 * 
 * ERROR HANDLING:
 * 
 * Startup errors are fatal (we exit with code 1).
 * Runtime errors trigger graceful shutdown.
 * Background job errors are logged but don't crash the server.
 */
async function main() {
  try {
    logger.info('🔧 Initializing application...');

    // Step 1: Initialize database schema
    // Creates tables if they don't exist. Safe to run multiple times.
    logger.info('📦 Initializing database...');
    initializeSchema();

    // Step 2: Seed database (only if empty)
    // Adds sample items for development/testing. Idempotent operation.
    logger.info('🌱 Seeding database...');
    seedAll();

    // Step 3: Initialize cache layer
    // Sets up in-memory caching for frequently accessed data
    logger.info('💾 Initializing cache...');
    initializeCache();

    // Step 4: Start background expiration job
    // CRITICAL: This returns expired stock to the available pool.
    // Started BEFORE the HTTP server to ensure stock consistency
    // before any requests can come in.
    logger.info('⏰ Starting background jobs...');
    startExpirationJob();

    // Step 5: Start HTTP server
    // Now we're ready to accept requests. All dependencies are initialized.
    const server = startServer();

    // Step 6: Register shutdown handlers
    // These ensure graceful cleanup when the process is terminated
    
    // SIGTERM: Kubernetes/docker sends this to stop the container
    process.on('SIGTERM', () => {
      stopExpirationJob(); // Stop background job first
      gracefulShutdown(server, 'SIGTERM');
    });
    
    // SIGINT: Ctrl+C in terminal
    process.on('SIGINT', () => {
      stopExpirationJob(); // Stop background job first
      gracefulShutdown(server, 'SIGINT');
    });

    // Uncaught exceptions: Something went really wrong
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', err);
      stopExpirationJob();
      gracefulShutdown(server, 'uncaughtException');
    });

    // Unhandled promise rejections: Async error not caught
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', reason, { promise });
      stopExpirationJob();
      gracefulShutdown(server, 'unhandledRejection');
    });

    logger.info('✅ Application started successfully');
  } catch (error) {
    // Startup errors are fatal - we can't run without these components
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

// Start the application
main();
