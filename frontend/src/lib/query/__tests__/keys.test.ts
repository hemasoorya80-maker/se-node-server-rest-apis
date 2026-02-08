/**
 * Query Keys Tests
 * 
 * Tests for TanStack Query key definitions.
 */

import { describe, it, expect } from 'vitest';
import { queryKeys } from '../keys';

describe('Query Keys', () => {
  describe('items', () => {
    it('should return items key', () => {
      expect(queryKeys.items).toEqual(['items']);
    });
  });

  describe('item', () => {
    it('should return item key with id', () => {
      expect(queryKeys.item('item_1')).toEqual(['item', 'item_1']);
    });

    it('should return different keys for different ids', () => {
      const key1 = queryKeys.item('item_1');
      const key2 = queryKeys.item('item_2');
      
      expect(key1).not.toEqual(key2);
    });
  });

  describe('reservations', () => {
    it('should return reservations key with userId', () => {
      expect(queryKeys.reservations('user_1')).toEqual(['reservations', 'user_1']);
    });

    it('should return different keys for different users', () => {
      const key1 = queryKeys.reservations('user_1');
      const key2 = queryKeys.reservations('user_2');
      
      expect(key1).not.toEqual(key2);
    });
  });

  describe('reservation', () => {
    it('should return reservation key with id', () => {
      expect(queryKeys.reservation('res_123')).toEqual(['reservation', 'res_123']);
    });
  });

  describe('health', () => {
    it('should return health key', () => {
      expect(queryKeys.health).toEqual(['health']);
    });
  });
});
