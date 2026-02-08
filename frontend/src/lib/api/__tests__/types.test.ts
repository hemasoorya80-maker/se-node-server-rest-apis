/**
 * API Types Tests
 * 
 * Tests for type guards and utilities.
 */

import { describe, it, expect } from 'vitest';
import { isApiError, statusLabels, statusColors } from '../types';
import type { ApiError, ReservationStatus } from '../types';

describe('API Types', () => {
  describe('isApiError', () => {
    it('should return true for valid ApiError', () => {
      const error: ApiError = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        requestId: 'req_123',
      };

      expect(isApiError(error)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isApiError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isApiError(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isApiError('error')).toBe(false);
    });

    it('should return false for Error instance', () => {
      expect(isApiError(new Error('test'))).toBe(false);
    });

    it('should return false for incomplete object', () => {
      expect(isApiError({ status: 400 })).toBe(false);
      expect(isApiError({ code: 'ERROR' })).toBe(false);
      expect(isApiError({ message: 'Error' })).toBe(false);
    });
  });

  describe('statusLabels', () => {
    it('should have labels for all reservation statuses', () => {
      const statuses: ReservationStatus[] = ['reserved', 'confirmed', 'cancelled', 'expired'];
      
      statuses.forEach(status => {
        expect(statusLabels[status]).toBeDefined();
        expect(typeof statusLabels[status]).toBe('string');
      });
    });

    it('should have correct labels', () => {
      expect(statusLabels.reserved).toBe('Reserved');
      expect(statusLabels.confirmed).toBe('Confirmed');
      expect(statusLabels.cancelled).toBe('Cancelled');
      expect(statusLabels.expired).toBe('Expired');
    });
  });

  describe('statusColors', () => {
    it('should have colors for all reservation statuses', () => {
      const statuses: ReservationStatus[] = ['reserved', 'confirmed', 'cancelled', 'expired'];
      
      statuses.forEach(status => {
        expect(statusColors[status]).toBeDefined();
      });
    });

    it('should have valid badge variants', () => {
      const validVariants = ['default', 'secondary', 'destructive', 'outline'];
      
      Object.values(statusColors).forEach(color => {
        expect(validVariants).toContain(color);
      });
    });
  });
});
