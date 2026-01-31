/**
 * Health Check Routes Module
 *
 * This module provides health check and readiness endpoints for monitoring.
 * These endpoints are used by:
 * - Load balancers (to route traffic)
 * - Orchestrators (Kubernetes, Docker Swarm)
 * - Monitoring systems (Prometheus, DataDog)
 * - Alerting systems
 *
 * Best Practices:
 * - Separate liveness (is app running?) from readiness (can app handle requests?)
 * - Check dependencies (database, cache, etc.)
 * - Include latency metrics
 * - Return detailed info in development
 */

import type { Request, Response, Router } from 'express';
import { Router as expressRouter } from 'express';
import { ok } from '../http/index.js';
import { checkDatabaseHealth } from '../database/index.js';
import { getCacheStats } from '../cache/index.js';
import { getHealthMetrics } from '../observability/index.js';
import { appConfig } from '../config/index.js';
import type { HealthCheckResponse, HealthStatus } from '../types/index.js';

/**
 * Package version from package.json
 * In production, read from package.json dynamically
 */
const API_VERSION = '1.0.0';

/**
 * ============================================
 * GET /health - Basic health check
 * ============================================
 *
 * Quick health check for load balancers.
 * Returns 200 if service is running, 503 if not.
 *
 * Use this for:
 * - Kubernetes liveness probes
 * - Load balancer health checks
 * - Simple uptime monitoring
 *
 * Response (200):
 * ```json
 * {
 *   "ok": true,
 *   "data": {
 *     "status": "healthy",
 *     "timestamp": "2024-01-31T12:00:00.000Z"
 *   }
 * }
 * ```
 */
export function createHealthRouter(): Router {
  const router = expressRouter();

  router.get('/health', (req: Request, res: Response) => {
    const status: HealthStatus = 'healthy';

    return res.status(status === 'healthy' ? 200 : 503).json({
      ok: true,
      data: {
        status,
        timestamp: new Date().toISOString(),
      },
    });
  });

  /**
   * ============================================
   * GET /health/ready - Readiness check
   * ============================================
   *
   * Detailed health check including dependencies.
   * Returns 200 if ready to handle requests, 503 if not.
   *
   * Use this for:
   * - Kubernetes readiness probes
   * - Dependency health monitoring
   * - Pre-deployment checks
   *
   * Response (200):
   * ```json
   * {
   *   "ok": true,
   *   "data": {
   *     "status": "healthy",
   *     "timestamp": "2024-01-31T12:00:00.000Z",
   *     "checks": {
   *       "database": { "status": "healthy", "latency": 2 },
   *       "cache": { "status": "healthy" }
   *     }
   *   }
   * }
   * ```
   */
  router.get('/health/ready', (req: Request, res: Response) => {
    const checks: HealthCheckResponse['checks'] = {
      database: { status: 'healthy' },
      cache: { status: 'healthy' },
    };

    let overallStatus: HealthStatus = 'healthy';

    // Check database
    try {
      const dbHealth = checkDatabaseHealth();
      if (!dbHealth.healthy) {
        overallStatus = 'unhealthy';
        checks.database = {
          status: 'unhealthy',
          latency: dbHealth.latency,
        };
      } else {
        checks.database = {
          status: 'healthy',
          latency: dbHealth.latency,
        };
      }
    } catch (error) {
      overallStatus = 'unhealthy';
      checks.database = { status: 'unhealthy' };
    }

    // Check cache
    try {
      const cacheStats = getCacheStats();
      checks.cache = { status: 'healthy' };
    } catch (error) {
      overallStatus = 'unhealthy';
      checks.cache = { status: 'unhealthy' };
    }

    // Determine HTTP status
    const httpStatus = overallStatus === 'healthy' ? 200 : 503;

    return res.status(httpStatus).json({
      ok: overallStatus === 'healthy',
      data: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks,
      },
    });
  });

  /**
   * ============================================
   * GET /health/live - Liveness check
   * ============================================
   *
   * Simple check if the application is running.
   * Used by Kubernetes to know if the container needs to be restarted.
   */
  router.get('/health/live', (req: Request, res: Response) => {
    return res.status(200).json({ status: 'ok' });
  });

  /**
   * ============================================
   * GET /health/detailed - Detailed health info
   * ============================================
   *
   * Comprehensive health information including metrics.
   * Only available in non-production environments.
   *
   * Use this for:
   * - Development debugging
   * - Monitoring dashboards
   * - Performance analysis
   *
   * Response:
   * ```json
   * {
   *   "ok": true,
   *   "data": {
   *     "status": "healthy",
   *     "timestamp": "2024-01-31T12:00:00.000Z",
   *     "uptime": 3600,
   *     "checks": { ... },
   *     "metrics": { ... },
   *     "version": "1.0.0",
   *     "environment": "development"
   *   }
   * }
   * ```
   */
  router.get('/health/detailed', (req: Request, res: Response) => {
    // Only allow in non-production
    if (appConfig.isProduction) {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Detailed health info is not available in production',
        },
      });
    }

    const healthMetrics = getHealthMetrics();
    const dbHealth = checkDatabaseHealth();
    const cacheStats = getCacheStats();

    const checks: HealthCheckResponse['checks'] = {
      database: {
        status: dbHealth.healthy ? 'healthy' : 'unhealthy',
        latency: dbHealth.latency,
      },
      cache: {
        status: 'healthy',
      },
    };

    const overallStatus: HealthStatus = dbHealth.healthy ? 'healthy' : 'unhealthy';

    return res.status(overallStatus === 'healthy' ? 200 : 503).json({
      ok: overallStatus === 'healthy',
      data: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: healthMetrics.uptime,
        checks,
        metrics: {
          memory: healthMetrics.memory,
          cache: cacheStats,
        },
        version: API_VERSION,
        environment: appConfig.NODE_ENV,
      },
    });
  });

  return router;
}
