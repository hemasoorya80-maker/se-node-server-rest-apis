/**
 * Validation Schemas Module
 *
 * This module defines all Zod validation schemas for API requests.
 * Zod provides runtime type validation with excellent TypeScript inference.
 *
 * Best Practices Implemented:
 * - Input validation at API boundaries
 * - Type-safe schema definitions
 * - Clear error messages
 * - Custom validation for business rules
 * - Reusable schema compositions
 *
 * Why Zod?
 * - Runtime validation with TypeScript support
 * - Excellent error messages
 * - Schema composition
 * - Zero dependencies (other than Zod itself)
 */

import { z } from 'zod';
import type { ReserveRequest, ConfirmRequest, CancelRequest, ErrorCode } from '../types/index.js';

/**
 * ============================================
 * Common/Shared Schemas
 * ============================================
 */

/**
 * Non-empty string schema
 * Useful for IDs and names that can't be empty
 */
const nonEmptyString = z.string().min(1, 'This field cannot be empty');

/**
 * Item ID schema
 * Validates item IDs match expected format (e.g., "item_1", "item_123")
 */
export const itemIdSchema = nonEmptyString.regex(
  /^item_\d+$/,
  'Item ID must be in format "item_N" where N is a number'
);

/**
 * Reservation ID schema
 * Validates reservation IDs match expected format (e.g., "res_abc123")
 */
export const reservationIdSchema = nonEmptyString.regex(
  /^res_[a-z0-9-]+$/,
  'Reservation ID must be in format "res_<uuid>"'
);

/**
 * User ID schema
 * Simple validation for user IDs
 */
export const userIdSchema = nonEmptyString.min(1, 'User ID is required');

/**
 * Quantity schema
 * Validates quantity for reservations (1-5 items per reservation)
 * - Minimum: 1 (can't reserve 0 items)
 * - Maximum: 5 (prevent overselling in single request)
 */
export const quantitySchema = z
  .number({
    required_error: 'Quantity is required',
    invalid_type_error: 'Quantity must be a number',
  })
  .int('Quantity must be a whole number')
  .min(1, 'Minimum quantity is 1')
  .max(5, 'Maximum quantity per reservation is 5')
  .positive('Quantity must be positive');

/**
 * ============================================
 * Pagination & Filtering Schemas
 * ============================================
 */

/**
 * Pagination parameters schema
 */
export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, 'Page must be at least 1')
    .optional()
    .default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'Page size must be at least 1')
    .max(100, 'Maximum page size is 100')
    .optional(),
});

/**
 * Sorting parameters schema
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * ============================================
 * Request Body Schemas
 * ============================================
 */

/**
 * POST /reserve request schema
 *
 * Validates:
 * - userId: Required, non-empty string
 * - itemId: Required, must match "item_N" format
 * - qty: Required, integer between 1-5
 */
export const reserveRequestSchema = z
  .object({
    userId: userIdSchema,
    itemId: itemIdSchema,
    qty: quantitySchema,
  })
  .strict(); // Disallow additional properties

/**
 * POST /confirm request schema
 *
 * Validates:
 * - userId: Required, non-empty string
 * - reservationId: Required, must match "res_<uuid>" format
 */
export const confirmRequestSchema = z
  .object({
    userId: userIdSchema,
    reservationId: reservationIdSchema,
  })
  .strict();

/**
 * POST /cancel request schema
 *
 * Validates:
 * - userId: Required, non-empty string
 * - reservationId: Required, must match "res_<uuid>" format
 */
export const cancelRequestSchema = z
  .object({
    userId: userIdSchema,
    reservationId: reservationIdSchema,
  })
  .strict();

/**
 * ============================================
 * Query Parameter Schemas
 * ============================================
 */

/**
 * GET /items query parameters
 */
export const getItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['name', 'availableQty']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * GET /reservations/:userId query parameters
 */
export const getReservationsQuerySchema = z.object({
  status: z.enum(['reserved', 'confirmed', 'cancelled', 'expired']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * ============================================
 * Schema Inference
 * ============================================
 */

/**
 * TypeScript types inferred from schemas
 * Use these for type-safe request handling
 */
export type ReserveRequestInput = z.infer<typeof reserveRequestSchema>;
export type ConfirmRequestInput = z.infer<typeof confirmRequestSchema>;
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;
export type GetItemsQuery = z.infer<typeof getItemsQuerySchema>;
export type GetReservationsQuery = z.infer<typeof getReservationsQuerySchema>;

/**
 * ============================================
 * Validation Helpers
 * ============================================
 */

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: ErrorCode;
        message: string;
        details: z.ZodError['issues'];
      };
    };

/**
 * Parse and validate request data against a schema
 *
 * This helper wraps Zod's safeParse with a consistent error format
 * for API responses.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate (usually request body)
 * @returns Validation result with success status
 *
 * @example
 * ```ts
 * const result = validateRequest(reserveRequestSchema, req.body);
 * if (!result.success) {
 *   return fail(res, result.error.code, result.error.message, result.error.details);
 * }
 * // result.data is now typed correctly
 * const { userId, itemId, qty } = result.data;
 * ```
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format error for API response
  const firstError = result.error.issues[0];
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR' as ErrorCode,
      message: firstError?.message || 'Validation failed',
      details: result.error.issues,
    },
  };
}

/**
 * Validate query parameters
 *
 * Helper specifically for query string validation
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  query: unknown
): ValidationResult<T> {
  return validateRequest(schema, query);
}

/**
 * Validate path parameters
 *
 * Helper specifically for route parameters
 */
export function validatePathParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown
): ValidationResult<T> {
  return validateRequest(schema, params);
}

/**
 * ============================================
 * Custom Error Formatter
 * ============================================
 */

/**
 * Format Zod error issues for API responses
 * Converts Zod's internal error format to a more user-friendly format
 *
 * @param issues - Zod error issues
 * @returns Formatted error details array
 *
 * @example
 * Input: [{ path: ['qty'], message: 'Minimum quantity is 1', ... }]
 * Output: [{ field: 'qty', message: 'Minimum quantity is 1' }]
 */
export function formatZodError(issues: z.ZodError['issues']): Array<{
  field: string;
  message: string;
}> {
  return issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * ============================================
 * Request Validation Middleware Factories
 * ============================================
 */

/**
 * Create a validation middleware for request bodies
 *
 * @param schema - The Zod schema to validate against
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * app.post('/reserve', validateBody(reserveRequestSchema), (req, res) => {
 *   // req.body is now validated and typed
 * });
 * ```
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: { body: unknown }, res: any, next: (err?: any) => void) => {
    const result = validateRequest(schema, req.body);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: result.error.code,
          message: result.error.message,
          details: formatZodError(result.error.details),
        },
      });
    }

    // Attach validated data to request
    req.body = result.data;
    next();
  };
}

/**
 * Create a validation middleware for query parameters
 */
export function validateQueryMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: { query: unknown }, res: any, next: (err?: any) => void) => {
    const result = validateQueryParams(schema, req.query);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: result.error.code,
          message: result.error.message,
          details: formatZodError(result.error.details),
        },
      });
    }

    req.query = result.data;
    next();
  };
}

/**
 * Create a validation middleware for path parameters
 */
export function validateParamsMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: { params: unknown }, res: any, next: (err?: any) => void) => {
    const result = validatePathParams(schema, req.params);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: result.error.code,
          message: result.error.message,
          details: formatZodError(result.error.details),
        },
      });
    }

    req.params = result.data;
    next();
  };
}
