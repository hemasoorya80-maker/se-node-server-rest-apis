'use client';

/**
 * @fileoverview User Reservations Page - Reservation Management
 * 
 * This page demonstrates:
 * - Nested dynamic routes ([userId] parameter)
 * - Multiple useMutation hooks for different actions
 * - Complex cache invalidation strategies
 * - Data normalization patterns
 * - Tabular data display with action buttons
 * 
 * @example
 * // Access this page at:
 * // http://localhost:3000/users/demo-user/reservations
 * 
 * // The [userId] folder creates a dynamic route segment.
 * // For any user ID, this page will render their reservations.
 * 
 * // Action flow:
 * // 1. User clicks Confirm/Cancel
 * // 2. Corresponding mutation is triggered
 * // 3. On success: Cache invalidated, toast shown, UI updates
 * // 4. Individual row shows loading spinner during action
 * 
 * @see {@link https://tanstack.com/query/latest/docs/react/guides/mutations} Mutations
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes} Dynamic Routes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertCircle, 
  ArrowLeft, 
  Check, 
  X, 
  Package, 
  Loader2, 
  Clock,
  Calendar,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { 
  getReservationsByUser, 
  confirmReservation, 
  cancelReservation,
  type Reservation,
  type ReservationStatus 
} from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { ErrorAlert } from '@/components/ui-blocks/error-alert';
import { EmptyState } from '@/components/ui-blocks/empty-state';
import { ReservationsSkeleton } from '@/components/ui-blocks/loading-skeleton';
import { StatusBadge } from '@/components/ui-blocks/status-badge';
import { isApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * UserReservationsPage Component
 * 
 * Displays and manages reservations for a specific user.
 * 
 * Features:
 * - View active and past reservations in separate tables
 * - Confirm pending reservations
 * - Cancel active reservations
 * - Real-time stock updates via cache invalidation
 * 
 * @returns {JSX.Element} The rendered reservations page
 */
export default function UserReservationsPage() {
  // ------------------------------------------
  // ROUTE PARAMETERS
  // ------------------------------------------
  
  /**
   * useParams - Nested Dynamic Route
   * 
   * The route structure is: /users/[userId]/reservations
   * params.userId captures the user ID from the URL.
   * 
   * This demonstrates nested dynamic routing where:
   * - [userId] is a dynamic segment (can be any string)
   * - /reservations is a static segment after the dynamic part
   * 
   * @example
   * URL: /users/user-123/reservations
   * params.userId = "user-123"
   */
  const params = useParams();
  const userId = params.userId as string;

  // ------------------------------------------
  // QUERY CLIENT - CACHE ACCESS
  // ------------------------------------------
  
  /**
   * QueryClient for cache invalidation
   * 
   * Used to invalidate queries after confirm/cancel mutations
   * to ensure all views show updated stock and reservation data.
   */
  const queryClient = useQueryClient();

  // ------------------------------------------
  // DATA FETCHING - USER RESERVATIONS
  // ------------------------------------------
  
  /**
   * User Reservations Query
   * 
   * Fetches all reservations for the current user.
   * 
   * Configuration:
   * - queryKey: ['reservations', userId] - Unique per user
   * - queryFn: () => getReservationsByUser(userId)
   * - enabled: !!userId - Only fetch when userId exists
   * 
   * Note: The API might return a single reservation or array.
   * We normalize the data below to always work with an array.
   */
  const { 
    data: rawReservations, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: queryKeys.reservations(userId),  // ['reservations', userId]
    queryFn: () => getReservationsByUser(userId),
    enabled: !!userId,
  });

  /**
   * Data Normalization Pattern
   * 
   * The API might return:
   * - An array of reservations
   * - A single reservation object
   * - undefined/null
   * 
   * We normalize to always have an array for consistent rendering:
   * - Array: Use as-is
   * - Single object: Wrap in array
   * - Null/undefined: Empty array
   * 
   * This pattern prevents "cannot read property of undefined" errors
   * and simplifies rendering logic.
   */
  const reservations = Array.isArray(rawReservations) 
    ? rawReservations 
    : rawReservations 
      ? [rawReservations] 
      : [];

  // ------------------------------------------
  // MUTATION - CONFIRM RESERVATION
  // ------------------------------------------
  
  /**
   * Confirm Mutation
   * 
   * Transitions a reservation from 'reserved' to 'confirmed' status.
   * 
   * Cache Invalidation Strategy:
   * When a reservation is confirmed, stock levels change. We invalidate:
   * 1. User's reservations list (this page)
   * 2. Items list (stock badges on items page)
   * 3. Specific item detail (if we're tracking which item was affected)
   * 
   * The onSuccess callback receives:
   * - _: The mutation response data (unused here)
   * - variables: The arguments passed to mutate() (used to find the reservation)
   */
  const confirmMutation = useMutation({
    mutationFn: confirmReservation,
    onSuccess: (_, variables) => {
      // Show success feedback
      toast.success('Reservation confirmed!', {
        icon: <Check className="h-4 w-4" />,
      });
      
      // Find the reservation to get its itemId for targeted cache invalidation
      const reservation = reservations?.find(r => r.id === variables.reservationId);
      
      /**
       * Cache Invalidation Pattern
       * 
       * invalidateQueries marks matching queries as stale and triggers refetching.
       * This ensures all components showing affected data update automatically.
       * 
       * Order matters: Invalidate specific queries before general ones
       * to prevent race conditions.
       */
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
      if (reservation) {
        queryClient.invalidateQueries({ queryKey: queryKeys.item(reservation.itemId) });
      }
    },
    onError: (error) => {
      if (isApiError(error)) {
        toast.error('Failed to confirm', { description: error.message });
      }
    },
  });

  // ------------------------------------------
  // MUTATION - CANCEL RESERVATION
  // ------------------------------------------
  
  /**
   * Cancel Mutation
   * 
   * Transitions a reservation from 'reserved' to 'cancelled' status.
   * Returns stock to the item's available quantity.
   * 
   * Uses the same cache invalidation pattern as confirmMutation
   * since both actions affect stock levels.
   */
  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: (_, variables) => {
      toast.success('Reservation cancelled', {
        icon: <X className="h-4 w-4" />,
      });
      
      const reservation = reservations?.find(r => r.id === variables.reservationId);
      
      // Invalidate caches to update stock displays
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
      if (reservation) {
        queryClient.invalidateQueries({ queryKey: queryKeys.item(reservation.itemId) });
      }
    },
    onError: (error) => {
      if (isApiError(error)) {
        toast.error('Failed to cancel', { description: error.message });
      }
    },
  });

  // ------------------------------------------
  // EVENT HANDLERS
  // ------------------------------------------
  
  /**
   * Handle Confirm Action
   * 
   * Wraps the mutation call with the required parameters.
   * This pattern keeps JSX clean and allows for future enhancements
   * (like confirmation dialogs) without cluttering the render method.
   * 
   * @param reservationId - The ID of the reservation to confirm
   */
  const handleConfirm = (reservationId: string) => {
    confirmMutation.mutate({ userId, reservationId });
  };

  /**
   * Handle Cancel Action
   * 
   * @param reservationId - The ID of the reservation to cancel
   */
  const handleCancel = (reservationId: string) => {
    cancelMutation.mutate({ userId, reservationId });
  };

  // ------------------------------------------
  // DERIVED STATE
  // ------------------------------------------
  
  /**
   * Check if an action is pending for a specific reservation
   * 
   * This function determines which row should show a loading spinner.
   * It checks both mutations to see if either is processing the given reservationId.
   * 
   * Pattern: Optimistic UI without optimistic updates
   * - We show loading state on the specific row being processed
   * - Other rows remain interactive
   * - Prevents double-submission
   * 
   * @param reservationId - The reservation to check
   * @returns boolean - True if an action is pending for this reservation
   */
  const isActionPending = (reservationId: string) => {
    return (
      (confirmMutation.isPending && confirmMutation.variables?.reservationId === reservationId) ||
      (cancelMutation.isPending && cancelMutation.variables?.reservationId === reservationId)
    );
  };

  /**
   * Filter reservations into active and past categories
   * 
   * Active: 'reserved' or 'confirmed' - Can be acted upon
   * Past: 'cancelled' or 'expired' - Read-only history
   * 
   * This computed state keeps the render logic clean and ensures
   * the UI always reflects the current reservation statuses.
   */
  const activeReservations = reservations?.filter(
    r => r.status === 'reserved' || r.status === 'confirmed'
  ) || [];
  const pastReservations = reservations?.filter(
    r => r.status === 'cancelled' || r.status === 'expired'
  ) || [];

  // ------------------------------------------
  // RENDER
  // ------------------------------------------
  
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="group">
            <Link href="/items">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <span className="text-xs font-medium text-violet-600 uppercase tracking-wider">Reservations</span>
            </div>
            <h1 className="text-3xl font-bold">My Reservations</h1>
          </div>
        </div>
        {/* User ID badge for context */}
        <div className="flex items-center gap-3">
          <div className="glass-subtle px-4 py-2 rounded-full text-sm">
            <span className="text-gray-500">User:</span>
            <code className="ml-2 font-mono text-gray-900">{userId}</code>
          </div>
        </div>
      </div>

      {/* 
        Content States
        
        Same four-state pattern as items page:
        1. Loading: Skeleton placeholders
        2. Error: Error alert with retry
        3. Empty: No reservations state
        4. Success: Active and past reservations tables
      */}
      {isLoading ? (
        <ReservationsSkeleton />
      ) : isError ? (
        <ErrorAlert error={error} title="Failed to load reservations" onRetry={refetch} />
      ) : reservations?.length === 0 ? (
        <EmptyState type="reservations" action={{ label: 'Browse Items', href: '/items' }} />
      ) : (
        <div className="space-y-8">
          {/* 
            Active Reservations Table
            
            Displays reservations that can be acted upon:
            - 'reserved': Can confirm or cancel
            - 'confirmed': Already finalized
            
            Includes action buttons that trigger mutations.
          */}
          {activeReservations.length > 0 && (
            <Card className="glass overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-violet-500/10">
                      <ShoppingBag className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Active Reservations</CardTitle>
                      <CardDescription>
                        {activeReservations.length} reservation{activeReservations.length !== 1 ? 's' : ''} ready for action
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-sm px-3">
                    {activeReservations.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="rounded-xl overflow-hidden glass-subtle">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-gray-200/50">
                        <TableHead className="text-xs font-medium uppercase tracking-wider">Reservation</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider">Item</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider">Qty</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider">Expires</TableHead>
                        <TableHead className="text-right text-xs font-medium uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeReservations.map((reservation) => (
                        <ReservationRow
                          key={reservation.id}
                          reservation={reservation}
                          onConfirm={handleConfirm}
                          onCancel={handleCancel}
                          isPending={isActionPending(reservation.id)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 
            Past Reservations Table
            
            Read-only display of completed reservations:
            - 'cancelled': User cancelled
            - 'expired': Auto-expired after 10 minutes
            
            Styled with reduced opacity to indicate they're historical.
          */}
          {pastReservations.length > 0 && (
            <Card className="glass overflow-hidden opacity-80">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gray-100">
                    <Calendar className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-500">History</CardTitle>
                    <CardDescription>
                      {pastReservations.length} past reservation{pastReservations.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl overflow-hidden glass-subtle">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-gray-200/50">
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-500">Reservation</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-500">Item</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-500">Qty</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-500">Status</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-500">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastReservations.map((reservation) => (
                        <TableRow key={reservation.id} className="opacity-60">
                          <TableCell className="font-mono text-xs">{reservation.id}</TableCell>
                          <TableCell>
                            <Link href={`/items/${reservation.itemId}`} className="hover:underline">
                              {reservation.itemId}
                            </Link>
                          </TableCell>
                          <TableCell>{reservation.qty}</TableCell>
                          <TableCell>
                            <StatusBadge status={reservation.status} />
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(reservation.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// RESERVATION ROW SUB-COMPONENT
// ============================================

/**
 * Props for the ReservationRow component
 * 
 * Demonstrates TypeScript interface definition for component props.
 * Using interfaces (vs types) allows for declaration merging and
 * is the recommended pattern for component props in most React projects.
 */
interface ReservationRowProps {
  /** The reservation data to display */  reservation: Reservation;
  /** Callback when confirm is clicked */
  onConfirm: (id: string) => void;
  /** Callback when cancel is clicked */
  onCancel: (id: string) => void;
  /** Whether an action is pending for this row */
  isPending: boolean;
}

/**
 * ReservationRow Component
 * 
 * Renders a single reservation row with:
 * - Reservation details (ID, item, quantity, status, expiration)
 * - Action buttons (Confirm/Cancel) for active reservations
 * - Loading state during actions
 * 
 * This is a presentational component that receives data and callbacks
 * via props, following the presentational/container pattern.
 * 
 * @param props - {@link ReservationRowProps}
 * @returns {JSX.Element} The rendered table row
 */
function ReservationRow({ reservation, onConfirm, onCancel, isPending }: ReservationRowProps) {
  /**
   * Expiration Check
   * 
   * Determines if a reservation has expired based on:
   * 1. Status already marked as 'expired' by backend
   * 2. Current time past the expiresAt timestamp
   * 
   * This is a client-side safety check in addition to server-side validation.
   */
  const isExpired = reservation.status === 'expired' || 
    (reservation.status === 'reserved' && Date.now() > reservation.expiresAt);
  
  /**
   * Action Availability
   * 
   * Only 'reserved' status (not expired) can be acted upon.
   * Confirmed reservations are final and cannot be modified.
   */
  const canConfirm = reservation.status === 'reserved' && !isExpired;
  const canCancel = reservation.status === 'reserved' && !isExpired;

  return (
    <TableRow className="group border-gray-200/50">
      {/* Reservation ID */}
      <TableCell className="font-mono text-xs">{reservation.id}</TableCell>
      
      {/* Item Link - Navigate to item detail */}
      <TableCell>
        <Link 
          href={`/items/${reservation.itemId}`}
          className="font-medium hover:text-violet-600 transition-colors"
        >
          {reservation.itemId}
        </Link>
      </TableCell>
      
      {/* Quantity Badge */}
      <TableCell>
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-sm font-medium">
          {reservation.qty}
        </span>
      </TableCell>
      
      {/* Status Badge Component */}
      <TableCell>
        <StatusBadge status={reservation.status} />
      </TableCell>
      
      {/* Expiration Time */}
      <TableCell>
        {reservation.status === 'reserved' ? (
          <span className={cn(
            "flex items-center gap-1.5 text-sm",
            isExpired ? 'text-red-500' : 'text-amber-600'
          )}>
            <Clock className="h-3.5 w-3.5" />
            {isExpired ? 'Expired' : new Date(reservation.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span className="text-gray-500 text-sm">-</span>
        )}
      </TableCell>
      
      {/* Action Buttons */}
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {/* 
            Confirm Button
            
            Shown only for active reservations.
            Shows spinner when isPending is true for this row.
          */}
          {canConfirm && (
            <Button
              size="sm"
              onClick={() => onConfirm(reservation.id)}
              disabled={isPending}
              className="rounded-lg"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Confirm
                </>
              )}
            </Button>
          )}
          
          {/* 
            Cancel Button
            
            Styled as outline button to indicate it's a secondary action.
            Also shows spinner during pending state.
          */}
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCancel(reservation.id)}
              disabled={isPending}
              className="rounded-lg glass-subtle"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </>
              )}
            </Button>
          )}
          
          {/* Completed state - no actions available */}
          {!canConfirm && !canCancel && (
            <span className="text-sm text-gray-500 py-2">Completed</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
