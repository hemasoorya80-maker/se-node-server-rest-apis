/**
 * Configuration Module
 *
 * This module loads and validates all environment configuration.
 * It provides type-safe access to environment variables with defaults
 * and validation.
 *
 * Best Practices Implemented:
 * - Type-safe configuration
 * - Validation of required environment variables
 * - Sensible defaults for development
 * - Documentation for all configuration options
 */

import { z } from 'zod';

/**
 * Environment Schema Validation
 *
 * Uses Zod for runtime validation of environment variables.
 * This ensures the application fails fast if required configuration is missing.
 */
const envSchema = z.object({
  // Environment
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),

  // Server Configuration
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // API Configuration
  API_VERSION: z.string().default('v1'),
  API_PREFIX: z.string().default('/api'),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z.string().transform(val => val === 'true').default('true'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('10000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('20'),

  // Slow Down (gradual rate limiting)
  SLOW_DOWN_WINDOW_MS: z.string().transform(Number).default('10000'),
  SLOW_DOWN_DELAY_AFTER: z.string().transform(Number).default('10'),
  SLOW_DOWN_DELAY_MS: z.string().transform(Number).default('500'),

  // Cache Configuration
  CACHE_TTL_ITEMS: z.string().transform(Number).default('30000'),
  CACHE_TTL_DEFAULT: z.string().transform(Number).default('5000'),

  // Database Configuration
  DB_PATH: z.string().default('./app.db'),
  DB_MAX_CONNECTIONS: z.string().transform(Number).default('10'),

  // Logging Configuration
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_PRETTY_PRINT: z.string().transform(val => val === 'true').default('true'),

  // Request Timeout
  REQUEST_TIMEOUT: z.string().transform(Number).default('30000'),

  // Reservation Configuration
  RESERVATION_TIMEOUT_MINUTES: z.string().transform(Number).default('10'),

  // Pagination Defaults
  DEFAULT_PAGE_SIZE: z.string().transform(Number).default('20'),
  MAX_PAGE_SIZE: z.string().transform(Number).default('100'),

  // Health Check
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).default('30000'),
});

/**
 * Validates environment variables at startup
 * Throws an error if validation fails
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
}

/**
 * Parsed and validated configuration
 * Export this throughout the application
 */
export const config = validateEnv();

/**
 * Derived configuration values
 * These are computed from the base config for convenience
 */
export const derivedConfig = {
  /** Full API base path including prefix and version */
  API_BASE_PATH: `${config.API_PREFIX}/${config.API_VERSION}`,

  /** Reservation timeout in milliseconds */
  RESERVATION_TIMEOUT_MS: config.RESERVATION_TIMEOUT_MINUTES * 60 * 1000,

  /** Is this a production environment? */
  isProduction: config.NODE_ENV === 'production',

  /** Is this a development environment? */
  isDevelopment: config.NODE_ENV === 'development',

  /** Is this a test environment? */
  isTest: config.NODE_ENV === 'test',

  /** Server URL (useful for logs) */
  serverUrl: `http://${config.HOST}:${config.PORT}`,
} as const;

/**
 * Export all configuration as a single object for convenience
 */
export const appConfig = {
  ...config,
  ...derivedConfig,
} as const;

// Export types for use in other modules
export type AppConfig = typeof appConfig;
