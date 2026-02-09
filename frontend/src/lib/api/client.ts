/**
 * API Client Module
 * 
 * This module provides a centralized HTTP client for communicating with the
 * backend REST API. It handles request/response formatting, error normalization,
 * and automatic idempotency key generation for safe request retries.
 * 
 * Learning Objectives:
 * 1. Understanding HTTP client abstraction layers
 * 2. Implementing consistent error handling across the app
 * 3. Using idempotency keys for safe network retries
 * 4. Type-safe API communication with TypeScript
 * 
 * @module api/client
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API} Fetch API
 * @see {@link https://datatracker.ietf.org/doc/html/draft-nottingham-http-idempotency-keys} Idempotency Keys
 */

import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse, ApiError } from './types';

// ============================================
// Configuration
// ============================================

/**
 * Base URL for the backend API.
 * 
 * We use NEXT_PUBLIC_ prefix because:
 * 1. Next.js requires this for env vars to be accessible in client-side code
 * 2. Without this prefix, the variable would only be available server-side
 * 3. This is a build-time replacement - the value is baked into the bundle
 * 
 * SECURITY NOTE: Never put secrets in NEXT_PUBLIC_ variables as they
 * become visible in the browser's JavaScript bundle.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

/**
 * API version prefix for all endpoints.
 * 
 * Using a version prefix allows the backend to evolve without breaking
 * existing clients. When v2 is released, we can update just this constant.
 */
const API_PREFIX = '/api/v1';

// ============================================
// Error Handling
// ============================================

/**
 * Creates a normalized API error object from various error sources.
 * 
 * Normalization ensures that no matter what type of error we receive
 * (HTTP error, network error, parsing error), the frontend gets a
 * consistent structure to work with.
 * 
 * @param status - HTTP status code (0 for network errors)
 * @param code - Application-specific error code from backend
 * @param message - Human-readable error description
 * @param requestId - Unique ID for server-side log correlation
 * @param details - Additional error context from backend
 * @returns Normalized ApiError object
 * 
 * @example
 * ```typescript
 * throw createApiError(409, 'OUT_OF_STOCK', 'Not enough inventory');
 * ```
 */
function createApiError(
  status: number,
  code: string,
  message: string,
  requestId?: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    status,
    code,
    message,
    requestId,
    details,
  };
}

/**
 * Parses error responses from the API into a normalized format.
 * 
 * This function handles multiple scenarios:
 * 1. API returns JSON error with { ok: false, error: {...} }
 * 2. API returns non-JSON error (rare, but possible)
 * 3. Network failure (no response at all)
 * 
 * @param response - The Fetch API Response object
 * @returns Promise that resolves to normalized ApiError
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  // Extract request ID from response headers for debugging
  // The backend adds this to every response for traceability
  const requestId = response.headers.get('x-request-id') || undefined;
  
  try {
    // Try to parse the error as JSON first
    const body = await response.json() as ApiResponse<unknown>;
    
    // Check if the API returned a structured error
    if (!body.ok && body.error) {
      return createApiError(
        response.status,
        body.error.code,
        body.error.message,
        body.error.requestId || requestId,
        body.error.details
      );
    }
  } catch {
    // If JSON parsing fails, we'll fall back to HTTP status
    // This can happen if the server returns HTML (like a 502 error page)
  }
  
  // Fallback: create error from HTTP status only
  return createApiError(
    response.status,
    'HTTP_ERROR',
    response.statusText || 'An error occurred',
    requestId
  );
}

// ============================================
// Core Request Function
// ============================================

/**
 * Options for API requests.
 * 
 * This interface extends the standard fetch options with
 * our application-specific needs like idempotency.
 */
interface RequestOptions {
  /** HTTP method for the request */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request body (will be JSON-serialized) */
  body?: unknown;
  /** Additional headers to include */
  headers?: Record<string, string>;
  /** Whether to include an Idempotency-Key header */
  requireIdempotency?: boolean;
}

/**
 * Makes an API request with standardized error handling.
 * 
 * This is the core function that all other API methods use. It:
 * 1. Builds the full URL from base + prefix + path
 * 2. Adds standard headers (Accept, Content-Type)
 * 3. Generates idempotency keys when needed
 * 4. Parses responses and normalizes errors
 * 5. Handles network failures gracefully
 * 
 * WHY USE GENERICS?
 * The <T> generic allows TypeScript to infer the response type,
 * giving us autocomplete and type checking on the returned data.
 * 
 * @param path - API endpoint path (without base URL or prefix)
 * @param options - Request configuration
 * @returns Promise resolving to typed response data
 * @throws {ApiError} When the request fails
 * 
 * @example
 * ```typescript
 * // Simple GET request
 * const items = await apiRequest<Item[]>('/items');
 * 
 * // POST with idempotency
 * const reservation = await apiRequest<Reservation>('/reserve', {
 *   method: 'POST',
 *   body: { itemId: 'item_1', qty: 2 },
 *   requireIdempotency: true,
 * });
 * ```
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    requireIdempotency = false,
  } = options;

  // Build full URL: http://localhost:3000 + /api/v1 + /items
  const url = `${API_BASE_URL}${API_PREFIX}${path}`;

  // Build headers object
  const requestHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...headers,
  };

  // Add content-type for JSON bodies
  // We only add this when there's a body to avoid unnecessary headers on GETs
  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  // Add idempotency key for POST/PUT/PATCH operations that require it
  // 
  // WHAT IS IDEMPOTENCY?
  // An idempotent operation can be performed multiple times without
  // changing the result beyond the initial application. For example,
  // charging a credit card should only happen once, even if the
  // request is retried due to network issues.
  //
  // HOW IT WORKS:
  // 1. Client generates unique key (UUID)
  // 2. Server stores response with this key
  // 3. On retry with same key, server returns stored response
  // 4. Prevents double-charging, double-booking, etc.
  if (requireIdempotency && ['POST', 'PUT', 'PATCH'].includes(method)) {
    requestHeaders['Idempotency-Key'] = uuidv4();
  }

  try {
    // Make the actual HTTP request using Fetch API
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Parse response body
    let responseBody: ApiResponse<T>;
    
    try {
      responseBody = await response.json();
    } catch {
      // If no JSON body, create a generic response
      if (response.ok) {
        return {} as T;
      }
      throw await parseErrorResponse(response);
    }

    // Check for API-level errors (ok: false) or HTTP errors
    if (!response.ok || !responseBody.ok) {
      if (!responseBody.ok && responseBody.error) {
        throw createApiError(
          response.status,
          responseBody.error.code,
          responseBody.error.message,
          responseBody.error.requestId,
          responseBody.error.details
        );
      }
      throw await parseErrorResponse(response);
    }

    return responseBody.data;
  } catch (error) {
    // Re-throw ApiError instances (already normalized)
    if (error instanceof Error && 'status' in error) {
      throw error;
    }
    
    // Handle network errors (fetch throws TypeError on network failure)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw createApiError(
        0,
        'NETWORK_ERROR',
        'Unable to connect to the server. Please check your connection.'
      );
    }
    
    // Re-throw unknown errors
    throw error;
  }
}

// ============================================
// Convenience Methods
// ============================================

/**
 * Makes a GET request to the API.
 * 
 * This is a convenience wrapper around apiRequest for the common case
 * of fetching data. It sets the method to GET automatically.
 * 
 * @param path - API endpoint path
 * @param headers - Optional additional headers
 * @returns Promise resolving to typed response data
 * 
 * @example
 * ```typescript
 * const items = await apiGet<Item[]>('/items');
 * const item = await apiGet<Item>('/items/item_1');
 * ```
 */
export function apiGet<T>(path: string, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>(path, { method: 'GET', headers });
}

/**
 * Makes a POST request to the API.
 * 
 * This is a convenience wrapper around apiRequest for creating resources.
 * It automatically sets the method to POST and handles JSON serialization.
 * 
 * @param path - API endpoint path
 * @param body - Request body (will be JSON-serialized)
 * @param requireIdempotency - Whether to add Idempotency-Key header
 * @param headers - Optional additional headers
 * @returns Promise resolving to typed response data
 * 
 * @example
 * ```typescript
 * // Regular POST
 * const result = await apiPost('/login', { username, password });
 * 
 * // POST with idempotency (for important operations)
 * const reservation = await apiPost('/reserve', {
 *   userId: 'user_1',
 *   itemId: 'item_1',
 *   qty: 2
 * }, true);
 * ```
 */
export function apiPost<T>(
  path: string,
  body: unknown,
  requireIdempotency = false,
  headers?: Record<string, string>
): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body,
    headers,
    requireIdempotency,
  });
}
