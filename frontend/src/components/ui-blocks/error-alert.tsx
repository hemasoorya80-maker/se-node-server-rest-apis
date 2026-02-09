/**
 * Error Alert Component Module
 *
 * This module provides a comprehensive error display component with
 * glass-morphism styling, request ID support, and retry functionality.
 *
 * Learning Objectives:
 * - TypeScript: Type guards and narrowing for error handling
 * - React: useState hook for local UI state
 * - UX: Error message design with actionable feedback
 * - Security: Safe error message display without exposing internals
 *
 * @module components/ui-blocks/error-alert
 * @see {@link https://react.dev/reference/react/useState} useState hook
 * @see {@link https://www.totaltypescript.com/concepts/type-narrowing} Type narrowing
 */

'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * ErrorAlert Props Interface
 *
 * The error prop uses `unknown` type because errors can be:
 * - ApiError objects from our API
 * - Standard Error instances
 * - Thrown primitives (strings, numbers)
 * - Anything else JavaScript can throw
 *
 * Using `unknown` forces us to validate before accessing properties,
 * which is safer than using `any`.
 */
interface ErrorAlertProps {
  /**
   * The error to display.
   * Can be ApiError, Error, or any unknown value.
   */
  error: ApiError | Error | unknown;
  /** Custom title override (defaults to "Something went wrong") */
  title?: string;
  /** Optional retry callback - renders retry button when provided */
  onRetry?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Error Alert Component
 *
 * Displays error information in a user-friendly format with:
 * - Clear error message
 * - Error code display (if available)
 * - Request ID for support (with copy button)
 * - Retry action (if callback provided)
 * - Expandable technical details
 *
 * @example
 * ```tsx
 * // Basic API error
 * <ErrorAlert error={apiError} />
 *
 * // With retry action
 * <ErrorAlert
 *   error={error}
 *   title="Failed to load items"
 *   onRetry={() => refetch()}
 * />
 *
 * // Standard Error object
 * <ErrorAlert error={new Error("Network failed")} />
 * ```
 *
 * @param props - Component props
 * @returns React element or null if no valid error
 */
export function ErrorAlert({
  error,
  title = 'Something went wrong',
  onRetry,
  className
}: ErrorAlertProps) {
  // Local state for toggling technical details visibility
  // This keeps the UI clean by hiding implementation details by default
  const [showDetails, setShowDetails] = useState(false);

  // ============================================================================
  // Error Property Extraction
  // ============================================================================

  // Type assertions with optional chaining for safe property access
  // We cast to object with optional properties since error could be anything
  const rawMessage = (error as { message?: string })?.message;

  // Provide fallback message if error has no message or it's not a string
  const message = typeof rawMessage === 'string' && rawMessage.length > 0
    ? rawMessage
    : 'An unexpected error occurred';

  // Extract ApiError-specific fields for enhanced debugging
  const requestId = (error as { requestId?: string }).requestId;
  const code = (error as { code?: string }).code;
  const status = (error as { status?: number }).status;

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Copy request ID to clipboard for support tickets
   * Uses the Clipboard API which is modern and widely supported
   */
  const handleCopyRequestId = () => {
    if (requestId) {
      navigator.clipboard.writeText(requestId);
      // Show success toast notification
      toast.success('Request ID copied');
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={cn("glass rounded-xl overflow-hidden border-destructive/30", className)}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Error Icon - visual indicator of error state */}
          <div className="p-3 rounded-xl bg-destructive/10 shrink-0">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title Row with Error Code */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-destructive">{title}</h3>
              {code && (
                <code className="px-2 py-0.5 rounded-md bg-destructive/10 text-xs font-mono text-destructive">
                  {code}
                </code>
              )}
            </div>

            {/* Error Message */}
            <p className="text-destructive/80 mt-1">{message}</p>

            {/* Request ID Section - helpful for support/debugging */}
            {requestId && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-destructive/60">Request ID:</span>
                <code className="px-2 py-1 rounded-md bg-destructive/5 text-xs font-mono text-destructive/80">
                  {requestId}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs hover:bg-destructive/10"
                  onClick={handleCopyRequestId}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-4">
              {/* Retry button - only shown when onRetry is provided */}
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              )}

              {/* Details toggle - only shown when technical details exist */}
              {(code || status) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-gray-500"
                >
                  {showDetails ? 'Hide' : 'Details'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Technical Details Section */}
      {showDetails && (code || status) && (
        <div className="px-6 pb-6">
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/10 font-mono text-xs space-y-1">
            {status && <p><span className="text-gray-500">Status:</span> {status}</p>}
            {code && <p><span className="text-gray-500">Code:</span> {code}</p>}
            <p><span className="text-gray-500">Message:</span> {message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
