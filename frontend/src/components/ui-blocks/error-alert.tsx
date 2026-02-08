'use client';

/**
 * Error Alert
 * 
 * Glass-morphism styled error display with request ID.
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api';
import { useState } from 'react';
import { cn } from '@/lib/utils';

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
  const [showDetails, setShowDetails] = useState(false);
  
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  const requestId = (error as { requestId?: string }).requestId;
  const code = (error as { code?: string }).code;
  const status = (error as { status?: number }).status;
  
  const handleCopyRequestId = () => {
    if (requestId) {
      navigator.clipboard.writeText(requestId);
      toast.success('Request ID copied');
    }
  };

  return (
    <div className={cn("glass rounded-xl overflow-hidden border-destructive/30", className)}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-destructive/10 shrink-0">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-destructive">{title}</h3>
              {code && (
                <code className="px-2 py-0.5 rounded-md bg-destructive/10 text-xs font-mono text-destructive">
                  {code}
                </code>
              )}
            </div>
            <p className="text-destructive/80 mt-1">{message}</p>
            
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
            
            <div className="flex items-center gap-2 mt-4">
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
              {(code || status) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-muted-foreground"
                >
                  {showDetails ? 'Hide' : 'Details'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {showDetails && (code || status) && (
        <div className="px-6 pb-6">
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/10 font-mono text-xs space-y-1">
            {status && <p><span className="text-muted-foreground">Status:</span> {status}</p>}
            {code && <p><span className="text-muted-foreground">Code:</span> {code}</p>}
            <p><span className="text-muted-foreground">Message:</span> {message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
