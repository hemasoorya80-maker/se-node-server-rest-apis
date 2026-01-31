/**
 * Security Middleware Module
 *
 * This module provides security-related middleware for the Express application.
 * Security is critical for production APIs to protect against common vulnerabilities.
 *
 * Best Practices Implemented:
 * - Helmet.js: Security headers (CSP, X-Frame-Options, etc.)
 * - CORS: Cross-Origin Resource Sharing configuration
 * - Request size limits: Prevent DoS attacks
 * - Content type validation: Ensure proper content types
 * - Query string validation: Prevent injection attacks
 *
 * Security Headers (via Helmet):
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY (prevent clickjacking)
 * - X-XSS-Protection: Enable browser XSS filter
 * - Strict-Transport-Security: Enforce HTTPS (in production)
 * - Content-Security-Policy: Control resource loading
 *
 * References:
 * - OWASP Top 10: https://owasp.org/www-project-top-ten/
 * - Helmet.js: https://helmetjs.github.io/
 */

import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { appConfig } from '../config/index.js';
import { logger } from '../observability/index.js';

/**
 * ============================================
 * Helmet Configuration
 * ============================================
 */

/**
 * Create Helmet middleware with appropriate configuration
 *
 * Helmet sets various HTTP headers to secure your app.
 * Configuration varies by environment.
 */
export function createHelmetMiddleware() {
  return helmet({
    // Content Security Policy
    // Control what resources can be loaded
    contentSecurityPolicy: appConfig.isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        }
      : false, // Disable in development for easier debugging

    // HTTP Strict Transport Security
    // Tell browsers to only use HTTPS (only if already on HTTPS)
    hsts: appConfig.isProduction
      ? {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        }
      : false,

    // X-Frame-Options
    // Prevent clickjacking by preventing embedding in frames
    frameguard: {
      action: 'deny', // SAMEORIGIN or deny
    },

    // X-Content-Type-Options
    // Prevent MIME type sniffing
    noSniff: true,

    // X-XSS-Protection
    // Enable browser XSS filter
    xssFilter: true,

    // Referrer-Policy
    // Control how much referrer info is sent
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    // Remove X-Powered-By header
    // Hide Express implementation details
    hidePoweredBy: true,
  });
}

/**
 * ============================================
 * CORS Configuration
 * ============================================
 */

/**
 * Create CORS middleware with appropriate configuration
 *
 * CORS controls which origins can access your API.
 * Be restrictive in production, permissive in development.
 */
export function createCorsMiddleware() {
  const corsOptions: cors.CorsOptions = {
    // Allowed origins
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = appConfig.CORS_ORIGIN.split(',').map((o) => o.trim());

      // Check if origin is allowed
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    },

    // Allow credentials (cookies, auth headers)
    credentials: appConfig.CORS_CREDENTIALS,

    // Allowed headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'Idempotency-Key',
      'X-API-Key',
    ],

    // Allowed methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Expose these headers to clients
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],

    // Cache preflight response (seconds)
    maxAge: 86400, // 24 hours

    // Preflight continues to next middleware
    preflightContinue: false,

    // Set status code for successful OPTIONS requests
    optionsSuccessStatus: 204,
  };

  return cors(corsOptions);
}

/**
 * ============================================
 * Request Size Limits
 * ============================================
 */

/**
 * Create request size limit middleware
 *
 * Prevents DoS attacks by limiting request size.
 * Different limits for different request types.
 */
export function createSizeLimitMiddleware() {
  return (req: Request, res: any, next: NextFunction): void => {
    const contentType = req.headers['content-type'];

    // Set different limits based on content type
    const maxSizes: Record<string, string> = {
      'application/json': '1mb',
      'application/x-www-form-urlencoded': '1mb',
      'multipart/form-data': '10mb',
      'text/plain': '1mb',
    };

    let maxSize = '1mb'; // Default

    if (contentType) {
      for (const [type, size] of Object.entries(maxSizes)) {
        if (contentType.includes(type)) {
          maxSize = size;
          break;
        }
      }
    }

    // Parse content-length header if present
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const maxSizeBytes = parseMaxSize(maxSize);

      if (size > maxSizeBytes) {
        logger.warn('Request too large', {
          size,
          maxSize,
          contentType,
          ip: req.ip,
        });

        return res.status(413).json({
          ok: false,
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: `Request body too large. Maximum size is ${maxSize}`,
          },
        });
      }
    }

    next();
  };
}

/**
 * Parse max size string to bytes
 */
function parseMaxSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);

  if (!match) {
    return 1024 * 1024; // Default 1MB
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return value * (units[unit] || 1);
}

/**
 * ============================================
 * Content Type Validation
 * ============================================
 */

/**
 * Validate request content type for POST/PUT/PATCH
 *
 * Ensures request body has correct Content-Type header.
 */
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return (req: Request, res: any, next: NextFunction): void => {
    // Only validate for requests with body
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.headers['content-type']) {
      return res.status(415).json({
        ok: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Content-Type header is required',
          details: { allowedTypes },
        },
      });
    }

    const contentType = req.headers['content-type'];

    if (contentType) {
      // Check if content type is allowed
      const isAllowed = allowedTypes.some((type) => {
        // Exact match or prefix match (e.g., "application/json;charset=utf-8")
        return contentType === type || contentType.startsWith(type + ';');
      });

      if (!isAllowed) {
        logger.warn('Invalid content type', {
          contentType,
          allowedTypes,
          path: req.path,
        });

        return res.status(415).json({
          ok: false,
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: `Content-Type ${contentType} is not supported`,
            details: { allowedTypes },
          },
        });
      }
    }

    next();
  };
}

/**
 * ============================================
 * Query String Validation
 * ============================================
 */

/**
 * Validate query strings against common attack patterns
 *
 * Prevents SQL injection, XSS, and other injection attacks via URL parameters.
 */
export function validateQueryStrings(req: Request, res: Response, next: NextFunction): void {
  const dangerousPatterns = [
    /(<script|javascript:|onerror=|onload=)/i, // XSS
    /(union\s+select|select\s+.*\s+from|drop\s+table)/i, // SQL injection
    /(\.\.\/|\.\.\\)/, // Path traversal
    /(\${|<%|%>|@|&)/, // Template injection
  ];

  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          logger.warn('Suspicious query string detected', {
            key,
            value: value.substring(0, 50), // Truncate for logging
            ip: req.ip,
            path: req.path,
          });

          res.status(400).json({
            ok: false,
            error: {
              code: 'INVALID_QUERY_STRING',
              message: 'Invalid query parameter',
            },
          });
        }
      }
    }
  }

  next();
}

/**
 * ============================================
 * Security Headers Middleware
 * ============================================
 */

/**
 * Add additional security-related headers
 *
 * These headers provide extra security beyond Helmet.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // X-Request-ID header (if not already set)
  if (!res.getHeader('X-Request-ID')) {
    res.setHeader('X-Request-ID', (req as any).requestId || 'unknown');
  }

  // X-Content-Type-Options: nosniff (already set by Helmet, but explicit here)
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options: DENY (already set by Helmet, but explicit here)
  res.setHeader('X-Frame-Options', 'DENY');

  // X-API-Version (useful for clients)
  res.setHeader('X-API-Version', appConfig.API_VERSION);

  // X-Response-Time (for performance monitoring)
  res.setHeader('X-Response-Time', `${Date.now() - ((req as any).startTime || Date.now())}ms`);

  next();
}

/**
 * ============================================
 * Request Logging Middleware
 * ============================================
 */

/**
 * Log security-relevant events
 *
 * Logs suspicious activity for security monitoring.
 */
export function securityLogging(req: Request, res: Response, next: NextFunction): void {
  // Log suspicious user agents
  const userAgent = req.headers['user-agent'];
  const suspiciousAgents = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /go-http-client/i,
  ];

  if (userAgent && suspiciousAgents.some((pattern) => pattern.test(userAgent))) {
    logger.debug('Bot or automated client detected', {
      userAgent,
      ip: req.ip,
      path: req.path,
    });
  }

  // Log requests without proper headers
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.headers['content-type']) {
      logger.warn('Request without content-type', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
    }
  }

  next();
}

/**
 * ============================================
 * Export All Security Middleware
 * ============================================
 */

/**
 * Apply all security middleware at once
 * Convenience function to apply all security middleware
 */
export function applySecurityMiddleware(app: any): void {
  // Security headers (Helmet)
  app.use(createHelmetMiddleware());

  // CORS
  app.use(createCorsMiddleware());

  // Request size limits
  app.use(createSizeLimitMiddleware());

  // Content type validation
  app.use(validateContentType(['application/json']));

  // Query string validation
  app.use(validateQueryStrings);

  // Security headers
  app.use(securityHeaders);

  // Security logging
  app.use(securityLogging);

  logger.info('Security middleware applied');
}
