/**
 * API Client
 * 
 * Centralized HTTP client for communicating with the backend API.
 * Handles request/response formatting, error normalization, and idempotency headers.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse, ApiError } from './types';

// ============================================
// Configuration
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1';

// ============================================
// Error Handling
// ============================================

/**
 * Create a normalized API error from various error sources
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
 * Extract error details from API response
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  const requestId = response.headers.get('x-request-id') || undefined;
  
  try {
    const body = await response.json() as ApiResponse<unknown>;
    
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
    // If JSON parsing fails, use HTTP status
  }
  
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

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  requireIdempotency?: boolean;
}

/**
 * Make an API request with standardized error handling
 * 
 * @param path - API path (without prefix)
 * @param options - Request options
 * @returns Parsed response data
 * @throws ApiError on failure
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

  // Build full URL
  const url = `${API_BASE_URL}${API_PREFIX}${path}`;

  // Build headers
  const requestHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...headers,
  };

  // Add content-type for JSON bodies
  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  // Add idempotency key for POST/PUT/PATCH operations that require it
  if (requireIdempotency && ['POST', 'PUT', 'PATCH'].includes(method)) {
    requestHeaders['Idempotency-Key'] = uuidv4();
  }

  try {
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
    // Re-throw ApiError instances
    if (error instanceof Error && 'status' in error) {
      throw error;
    }
    
    // Handle network errors
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

export function apiGet<T>(path: string, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>(path, { method: 'GET', headers });
}

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
