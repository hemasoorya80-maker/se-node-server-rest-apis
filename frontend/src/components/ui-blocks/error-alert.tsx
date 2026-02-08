'use client';

/**
 * Error Alert
 * 
 * Displays API errors with request ID for debugging.
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api';

interface ErrorAlertProps {
  error: ApiError | Error | unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorAlert({ 
  error, 
  title = 'Something went wrong', 
  onRetry,
  className 
}: ErrorAlertProps) {
  // Extract error details
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  const requestId = (error as { requestId?: string }).requestId;
  const code = (error as { code?: string }).code;
  
  const handleCopyRequestId = () => {
    if (requestId) {
      navigator.clipboard.writeText(requestId);
      toast.success('Request ID copied to clipboard');
    }
  };

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {title}
        {code && (
          <span className="text-xs font-mono bg-destructive/20 px-2 py-0.5 rounded">
            {code}
          </span>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{message}</p>
        
        {requestId && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Request ID:</span>
            <code className="bg-destructive/20 px-2 py-0.5 rounded font-mono">
              {requestId}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleCopyRequestId}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>
        )}
        
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
