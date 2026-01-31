/**
 * HTTP Response Utilities Module
 *
 * This module provides helper functions for sending consistent API responses.
 * All responses follow a standard format for both success and error cases.
 *
 * Standard Success Response Format:
 * {
 *   "ok": true,
 *   "data": { ... },
 *   "meta": { ... } // optional, for pagination etc.
 * }
 *
 * Standard Error Response Format:
 * {
 *   "ok": false,
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "Human-readable message",
 *     "details": { ... },
 *     "requestId": "uuid"
 *   }
 * }
 *
 * Best Practices Implemented:
 * - Consistent response structure across all endpoints
 * - Type-safe response functions
 * - Automatic request ID inclusion
 * - Proper HTTP status codes
 * - Detailed error information for debugging
 */

import type { Response, Request } from 'express';
import type { SuccessResponse, ErrorResponse, HttpStatus, ErrorCode, ResponseMeta } from '../types/index.js';

/**
 * ============================================
 * Response Types
 * ============================================
 */

/**
 * Error details object
 */
export interface ErrorDetails {
  [key: string]: unknown;
}

/**
 * Error response options
 */
export interface ErrorOptions {
  /** Additional error details */
  details?: ErrorDetails;
  /** Override HTTP status code */
  status?: number;
}

/**
 * ============================================
 * Success Response Helpers
 * ============================================
 */

/**
 * Send a successful response
 *
 * @param res - Express response object
 * @param data - Response payload
 * @param status - HTTP status code (default: 200)
 * @param meta - Optional metadata (pagination, etc.)
 *
 * @example
 * ```ts
 * ok(res, { message: 'Success' }, 200);
 * // { "ok": true, "data": { "message": "Success" } }
 *
 * ok(res, { items: [] }, 200, { page: 1, total: 100 });
 * // { "ok": true, "data": { "items": [] }, "meta": { "page": 1, "total": 100 } }
 * ```
 */
export function ok<T>(
  res: Response,
  data: T,
  status: number = 200,
  meta?: ResponseMeta
): Response {
  const responseBody: SuccessResponse<T> = {
    ok: true,
    data,
  };

  if (meta) {
    responseBody.meta = meta;
  }

  return res.status(status).json(responseBody);
}

/**
 * Send a 201 Created response
 * Use this when a new resource is created
 *
 * @example
 * ```ts
 * created(res, { id: 'res_123', ...reservation }, 201);
 * ```
 */
export function created<T>(res: Response, data: T, meta?: ResponseMeta): Response {
  return ok(res, data, 201, meta);
}

/**
 * Send a 200 OK response with no data
 * Use this for DELETE operations or updates where no data is returned
 *
 * @example
 * ```ts
 * noContent(res);
 * ```
 */
export function noContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Send an accepted response
 * Use this when a request is accepted for processing but not completed yet
 *
 * @example
 * ```ts
 * accepted(res, { jobId: 'job_123', status: 'processing' });
 * ```
 */
export function accepted<T>(res: Response, data: T): Response {
  return ok(res, data, 202);
}

/**
 * ============================================
 * Error Response Helpers
 * ============================================
 */

/**
 * Send an error response
 *
 * @param res - Express response object
 * @param req - Express request object (for request ID)
 * @param code - Application error code
 * @param message - Human-readable error message
 * @param status - HTTP status code (default: 400)
 * @param details - Additional error details
 *
 * @example
 * ```ts
 * fail(res, req, 'VALIDATION_ERROR', 'Invalid input', 400, { field: 'email' });
 * ```
 */
export function fail(
  res: Response,
  req: Request,
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: ErrorDetails
): Response {
  const responseBody: ErrorResponse = {
    ok: false,
    error: {
      code,
      message,
    },
  };

  // Add details if provided
  if (details) {
    responseBody.error.details = details;
  }

  // Add request ID if available
  if ((req as any).requestId) {
    responseBody.error.requestId = (req as any).requestId;
  }

  return res.status(status).json(responseBody);
}

/**
 * 400 Bad Request - Invalid request from client
 *
 * @example
 * ```ts
 * badRequest(res, req, 'VALIDATION_ERROR', 'Email is required');
 * ```
 */
export function badRequest(
  res: Response,
  req: Request,
  code: ErrorCode = 'VALIDATION_ERROR',
  message: string,
  details?: ErrorDetails
): Response {
  return fail(res, req, code, message, 400, details);
}

/**
 * 401 Unauthorized - Authentication required
 *
 * @example
 * ```ts
 * unauthorized(res, req, 'Authentication required');
 * ```
 */
export function unauthorized(res: Response, req: Request, message: string = 'Unauthorized'): Response {
  return fail(res, req, 'UNAUTHORIZED', message, 401);
}

/**
 * 403 Forbidden - Insufficient permissions
 *
 * @example
 * ```ts
 * forbidden(res, req, 'You do not have access to this resource');
 * ```
 */
export function forbidden(res: Response, req: Request, message: string = 'Forbidden'): Response {
  return fail(res, req, 'FORBIDDEN', message, 403);
}

/**
 * 404 Not Found - Resource doesn't exist
 *
 * @example
 * ```ts
 * notFound(res, req, 'ITEM_NOT_FOUND', 'Item not found', { itemId: 'item_123' });
 * ```
 */
export function notFound(
  res: Response,
  req: Request,
  code: ErrorCode = 'NOT_FOUND',
  message: string = 'Resource not found',
  details?: ErrorDetails
): Response {
  return fail(res, req, code, message, 404, details);
}

/**
 * 409 Conflict - Request conflicts with current state
 *
 * Commonly used for:
 * - Duplicate resources
 * - Out of stock
 * - Invalid state transitions
 *
 * @example
 * ```ts
 * conflict(res, req, 'OUT_OF_STOCK', 'Not enough items available', { available: 2 });
 * ```
 */
export function conflict(
  res: Response,
  req: Request,
  code: ErrorCode = 'CONFLICT',
  message: string,
  details?: ErrorDetails
): Response {
  return fail(res, req, code, message, 409, details);
}

/**
 * 422 Unprocessable Entity - Valid request but semantically incorrect
 *
 * @example
 * ```ts
 * unprocessable(res, req, 'Cannot confirm cancelled reservation');
 * ```
 */
export function unprocessable(
  res: Response,
  req: Request,
  code: ErrorCode = 'UNPROCESSABLE_ENTITY',
  message: string,
  details?: ErrorDetails
): Response {
  return fail(res, req, code, message, 422, details);
}

/**
 * 429 Too Many Requests - Rate limited
 *
 * @example
 * ```ts
 * tooManyRequests(res, req, 'RATE_LIMITED', 'Too many requests, try again later');
 * ```
 */
export function tooManyRequests(
  res: Response,
  req: Request,
  code: ErrorCode = 'RATE_LIMITED',
  message: string = 'Too many requests',
  details?: ErrorDetails
): Response {
  return fail(res, req, code, message, 429, details);
}

/**
 * 500 Internal Server Error - Unexpected server error
 *
 * @example
 * ```ts
 * internalError(res, req, 'DATABASE_ERROR', 'Failed to save reservation');
 * ```
 */
export function internalError(
  res: Response,
  req: Request,
  code: ErrorCode = 'INTERNAL_ERROR',
  message: string = 'Internal server error',
  details?: ErrorDetails
): Response {
  return fail(res, req, code, message, 500, details);
}

/**
 * 503 Service Unavailable - Service is down
 *
 * @example
 * ```ts
 * serviceUnavailable(res, req, 'Service temporarily unavailable');
 * ```
 */
export function serviceUnavailable(
  res: Response,
  req: Request,
  message: string = 'Service temporarily unavailable',
  details?: ErrorDetails
): Response {
  return fail(res, req, 'SERVICE_UNAVAILABLE', message, 503, details);
}

/**
 * ============================================
 * Specialized Error Helpers
 * ============================================
 */

/**
 * Validation error helper
 * Formats Zod validation errors consistently
 *
 * @param res - Express response
 * @param req - Express request
 * @param issues - Zod error issues
 * @param message - Override error message
 */
export function validationError(
  res: Response,
  req: Request,
  issues: Array<{ field: string; message: string }>,
  message: string = 'Request validation failed'
): Response {
  return badRequest(res, req, 'VALIDATION_ERROR', message, { issues });
}

/**
 * Database error helper
 * Logs the error internally but returns generic message to client
 *
 * @param res - Express response
 * @param req - Express request
 * @param error - Original error (for logging)
 * @param message - User-facing message
 */
export function databaseError(
  res: Response,
  req: Request,
  error: unknown,
  message: string = 'Database operation failed'
): Response {
  // Log the actual error for debugging
  console.error('[Database Error]', error);

  // Return generic message to client
  return internalError(res, req, 'DATABASE_ERROR', message);
}

/**
 * ============================================
 * Response Builder Pattern
 * ============================================
 */

/**
 * Response builder class for chaining response operations
 * Useful for complex responses with multiple conditions
 *
 * @example
 * ```ts
 * return ResponseBuilder.success(res)
 *   .data({ id: 'res_123' })
 *   .status(201)
 *   .meta({ version: '1' })
 *   .send();
 * ```
 */
export class ResponseBuilder {
  constructor(
    private res: Response,
    private req?: Request
  ) {}

  /**
   * Create a success response builder
   */
  static success(res: Response, req?: Request): ResponseBuilder {
    return new ResponseBuilder(res, req);
  }

  /**
   * Create an error response builder
   */
  static error(res: Response, req: Request): ResponseBuilder {
    return new ResponseBuilder(res, req);
  }

  /** Set response data */
  data<T>(data: T): this {
    this.res.locals.data = data;
    return this;
  }

  /** Set response status */
  status(status: number): this {
    this.res.locals.status = status;
    return this;
  }

  /** Set response metadata */
  meta(meta: ResponseMeta): this {
    this.res.locals.meta = meta;
    return this;
  }

  /** Set error code */
  code(code: ErrorCode): this {
    this.res.locals.errorCode = code;
    return this;
  }

  /** Set error message */
  message(message: string): this {
    this.res.locals.errorMessage = message;
    return this;
  }

  /** Set error details */
  details(details: ErrorDetails): this {
    this.res.locals.errorDetails = details;
    return this;
  }

  /** Send the response */
  send(): Response {
    const data = this.res.locals.data;
    const status = this.res.locals.status || 200;
    const meta = this.res.locals.meta;
    const errorCode = this.res.locals.errorCode;
    const errorMessage = this.res.locals.errorMessage;
    const errorDetails = this.res.locals.errorDetails;

    if (errorCode && this.req) {
      return fail(this.res, this.req, errorCode, errorMessage || 'Error', status, errorDetails);
    }

    return ok(this.res, data, status, meta);
  }
}

/**
 * ============================================
 * HTTP Status Code Helpers
 * ============================================
 */

/**
 * Check if status code is a success code (2xx)
 */
export function isSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Check if status code is a redirect code (3xx)
 */
export function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

/**
 * Check if status code is a client error code (4xx)
 */
export function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

/**
 * Check if status code is a server error code (5xx)
 */
export function isServerError(status: number): boolean {
  return status >= 500 && status < 600;
}

/**
 * Check if status code is an error code (4xx or 5xx)
 */
export function isError(status: number): boolean {
  return status >= 400;
}

/**
 * Get status code name from number
 */
export function getStatusName(status: number): string {
  const statusNames: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  };
  return statusNames[status] || 'Unknown';
}
