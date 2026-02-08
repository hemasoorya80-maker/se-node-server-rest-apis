/**
 * Error Alert Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorAlert } from '../error-alert';
import type { ApiError } from '@/lib/api';

describe('ErrorAlert', () => {
  it('should render with default title', () => {
    render(<ErrorAlert error={new Error('Test error')} />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should render with custom title', () => {
    render(<ErrorAlert error={new Error('Test error')} title="Custom Title" />);
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should render API error with code', () => {
    const apiError: ApiError = {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
    };
    
    render(<ErrorAlert error={apiError} />);
    
    expect(screen.getByText('VALIDATION_ERROR')).toBeInTheDocument();
    // The message is shown for API errors
    expect(screen.getByText((content) => content.includes('Invalid input data'))).toBeInTheDocument();
  });

  it('should render request ID when available', () => {
    const apiError: ApiError = {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Server error',
      requestId: 'req_abc123',
    };
    
    render(<ErrorAlert error={apiError} />);
    
    expect(screen.getByText(/req_abc123/)).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorAlert error={new Error('Test')} onRetry={onRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should not show retry button when onRetry is not provided', () => {
    render(<ErrorAlert error={new Error('Test')} />);
    
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('should handle unknown error types', () => {
    render(<ErrorAlert error="string error" />);
    
    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
  });
});
