/**
 * Query Keys Module
 * 
 * Centralized query key definitions for TanStack Query.
 * 
 * WHY QUERY KEYS MATTER:
 * TanStack Query uses keys to identify and cache data. When you invalidate
 * a key, all queries with that key refetch. Well-organized keys make cache
 * management predictable and prevent subtle bugs.
 * 
 * KEY HIERARCHY STRATEGY:
 * We use hierarchical keys that allow invalidation at different levels:
 * - ['items'] - All items lists
 * - ['item', 'item_1'] - Specific item
 * - ['reservations', 'user_123'] - All reservations for a user
 * 
 * This allows us to:
 * - Invalidate all items: queryClient.invalidateQueries({ queryKey: ['items'] })
 * - Invalidate specific item: queryClient.invalidateQueries({ queryKey: ['item', id] })
 * 
 * LEARNING OBJECTIVES:
 * 1. Understanding query key hierarchies
 * 2. Organizing keys by domain and specificity
 * 3. Using functions to generate dynamic keys
 * 4. Type-safe key definitions
 * 
 * @module query/keys
 * @see {@link https://tanstack.com/query/latest/docs/framework/react/guides/query-keys} Query Keys Guide
 */

/**
 * Query key factory object.
 * 
 * This object provides a centralized place to define all query keys used
 * in the application. Using a factory pattern ensures consistency and
 * makes it easy to refactor keys later.
 * 
 * Each property is either:
 * - A static array (for simple keys)
 * - A function that returns an array (for dynamic keys)
 * 
 * @example
 * ```typescript
 * // Using static keys
 * const itemsQuery = useQuery({
 *   queryKey: queryKeys.items,
 *   queryFn: listItems,
 * });
 * 
 * // Using dynamic keys
 * const itemQuery = useQuery({
 *   queryKey: queryKeys.item(itemId),
 *   queryFn: () => getItem(itemId),
 * });
 * ```
 */
export const queryKeys = {
  /**
   * Items list query key.
   * 
   * Use this for the list items endpoint.
   * 
   * @example
   * ```typescript
   * const { data: items } = useQuery({
   *   queryKey: queryKeys.items,
   *   queryFn: listItems,
   * });
   * ```
   */
  items: ['items'] as const,
  
  /**
   * Single item query key.
   * 
   * Use this for the get item endpoint. Include the item ID to make
   * the key unique per item.
   * 
   * @param itemId - Unique identifier for the item
   * @returns Query key array
   * 
   * @example
   * ```typescript
   * const { data: item } = useQuery({
   *   queryKey: queryKeys.item(itemId),
   *   queryFn: () => getItem(itemId),
   *   enabled: !!itemId,
   * });
   * ```
   */
  item: (itemId: string) => ['item', itemId] as const,
  
  /**
   * User reservations query key.
   * 
   * Use this for the list reservations endpoint. Include the user ID
   * to cache per-user data separately.
   * 
   * @param userId - Unique identifier for the user
   * @returns Query key array
   * 
   * @example
   * ```typescript
   * const { data: reservations } = useQuery({
   *   queryKey: queryKeys.reservations(userId),
   *   queryFn: () => getReservationsByUser(userId),
   *   enabled: !!userId,
   * });
   * ```
   */
  reservations: (userId: string) => ['reservations', userId] as const,
  
  /**
   * Single reservation query key.
   * 
   * Use this for the get reservation endpoint. Currently not used
   * much since we typically fetch all reservations for a user.
   * 
   * @param reservationId - Unique identifier for the reservation
   * @returns Query key array
   */
  reservation: (reservationId: string) => ['reservation', reservationId] as const,
  
  /**
   * Health check query key.
   * 
   * Use this for the health check endpoint.
   * 
   * @example
   * ```typescript
   * const { data: health } = useQuery({
   *   queryKey: queryKeys.health,
   *   queryFn: checkHealth,
   *   refetchInterval: 30000, // Poll every 30 seconds
   * });
   * ```
   */
  health: ['health'] as const,
} as const;

/**
 * Type export for query keys.
 * 
 * This type can be used when you need to pass query keys as props
 * or store them in variables.
 * 
 * @example
 * ```typescript
 * function useCustomQuery(key: QueryKeys['items']) {
 *   return useQuery({ queryKey: key, queryFn: listItems });
 * }
 * ```
 */
export type QueryKeys = typeof queryKeys;

/**
 * Query key types for specific domains.
 * 
 * These utility types help when you need to constrain function parameters
 * to specific key types.
 */
export type ItemsQueryKey = typeof queryKeys.items;
export type ItemQueryKey = ReturnType<typeof queryKeys.item>;
export type ReservationsQueryKey = ReturnType<typeof queryKeys.reservations>;
export type ReservationQueryKey = ReturnType<typeof queryKeys.reservation>;
export type HealthQueryKey = typeof queryKeys.health;
