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
 * Application Entry Point
 * ============================================
 */

async function main() {
  try {
    logger.info('🔧 Initializing application...');

    // Initialize database schema
    logger.info('📦 Initializing database...');
    initializeSchema();

    // Seed database (only if empty)
    logger.info('🌱 Seeding database...');
    seedAll();

    // Initialize cache
    logger.info('💾 Initializing cache...');
    initializeCache();

    // Start server
    const server = startServer();

    // Setup shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', err);
      gracefulShutdown(server, 'uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', reason, { promise });
      gracefulShutdown(server, 'unhandledRejection');
    });

    logger.info('✅ Application started successfully');
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

// Start the application
main();
