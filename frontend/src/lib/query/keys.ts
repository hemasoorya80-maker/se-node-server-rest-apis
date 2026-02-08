/**
 * Query Keys
 * 
 * Centralized query key definitions for TanStack Query.
 * Using consistent keys enables proper cache invalidation across the app.
 */

export const queryKeys = {
  // Items
  items: ['items'] as const,
  item: (itemId: string) => ['item', itemId] as const,
  
  // Reservations
  reservations: (userId: string) => ['reservations', userId] as const,
  reservation: (reservationId: string) => ['reservation', reservationId] as const,
  
  // Health
  health: ['health'] as const,
} as const;

// Type exports for type-safe usage
export type QueryKeys = typeof queryKeys;
