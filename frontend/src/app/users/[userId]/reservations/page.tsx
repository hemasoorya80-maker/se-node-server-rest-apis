'use client';

/**
 * User Reservations Page
 * 
 * Displays all reservations for a user with confirm/cancel actions.
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
import { AlertCircle, ArrowLeft, Check, X, Package, Loader2, Clock } from 'lucide-react';
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

// ============================================
// Component
// ============================================

export default function UserReservationsPage() {
  const params = useParams();
  const userId = params.userId as string;
  const queryClient = useQueryClient();

  // Fetch reservations
  const { 
    data: reservations, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: queryKeys.reservations(userId),
    queryFn: () => getReservationsByUser(userId),
    enabled: !!userId,
  });

  // Confirm mutation
  const confirmMutation = useMutation({
    mutationFn: confirmReservation,
    onSuccess: (_, variables) => {
      toast.success('Reservation confirmed successfully!');
      
      // Find the reservation to get itemId for invalidation
      const reservation = reservations?.find(r => r.id === variables.reservationId);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
      if (reservation) {
        queryClient.invalidateQueries({ queryKey: queryKeys.item(reservation.itemId) });
      }
    },
    onError: (error) => {
      if (isApiError(error)) {
        toast.error('Failed to confirm reservation', {
          description: `${error.message}${error.requestId ? ` (Request ID: ${error.requestId})` : ''}`,
        });
      } else {
        toast.error('An unexpected error occurred');
      }
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: (_, variables) => {
      toast.success('Reservation cancelled successfully!');
      
      // Find the reservation to get itemId for invalidation
      const reservation = reservations?.find(r => r.id === variables.reservationId);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
      if (reservation) {
        queryClient.invalidateQueries({ queryKey: queryKeys.item(reservation.itemId) });
      }
    },
    onError: (error) => {
      if (isApiError(error)) {
        toast.error('Failed to cancel reservation', {
          description: `${error.message}${error.requestId ? ` (Request ID: ${error.requestId})` : ''}`,
        });
      } else {
        toast.error('An unexpected error occurred');
      }
    },
  });

  const handleConfirm = (reservationId: string) => {
    confirmMutation.mutate({ userId, reservationId });
  };

  const handleCancel = (reservationId: string) => {
    cancelMutation.mutate({ userId, reservationId });
  };

  const isActionPending = (reservationId: string) => {
    return (
      (confirmMutation.isPending && confirmMutation.variables?.reservationId === reservationId) ||
      (cancelMutation.isPending && cancelMutation.variables?.reservationId === reservationId)
    );
  };

  // Filter active and past reservations
  const activeReservations = reservations?.filter(
    r => r.status === 'reserved' || r.status === 'confirmed'
  ) || [];
  const pastReservations = reservations?.filter(
    r => r.status === 'cancelled' || r.status === 'expired'
  ) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/items">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Reservations</h1>
            <p className="text-slate-500 mt-1">
              User: <code className="bg-slate-100 px-2 py-0.5 rounded text-sm">{userId}</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <AlertCircle className="h-4 w-4" />
          <span>Reserved items expire after 10 minutes</span>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <ReservationsSkeleton />
      ) : isError ? (
        <ErrorAlert 
          error={error} 
          title="Failed to load reservations" 
          onRetry={refetch} 
        />
      ) : reservations?.length === 0 ? (
        <EmptyState 
          type="reservations" 
          action={{ label: 'Browse Items', href: '/items' }}
        />
      ) : (
        <div className="space-y-8">
          {/* Active Reservations */}
          {activeReservations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Active Reservations
                  <Badge variant="secondary">{activeReservations.length}</Badge>
                </CardTitle>
                <CardDescription>
                  These reservations are currently active and can be managed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reservation ID</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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

          {/* Past Reservations */}
          {pastReservations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-600">
                  <Package className="h-5 w-5" />
                  Past Reservations
                  <Badge variant="outline">{pastReservations.length}</Badge>
                </CardTitle>
                <CardDescription>
                  These reservations have been completed, cancelled, or expired
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reservation ID</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastReservations.map((reservation) => (
                        <TableRow key={reservation.id} className="opacity-60">
                          <TableCell className="font-mono text-xs">
                            {reservation.id}
                          </TableCell>
                          <TableCell>
                            <Link 
                              href={`/items/${reservation.itemId}`}
                              className="hover:underline"
                            >
                              {reservation.itemId}
                            </Link>
                          </TableCell>
                          <TableCell>{reservation.qty}</TableCell>
                          <TableCell>
                            <StatusBadge status={reservation.status} />
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
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
// Reservation Row Component
// ============================================

interface ReservationRowProps {
  reservation: Reservation;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  isPending: boolean;
}

function ReservationRow({ reservation, onConfirm, onCancel, isPending }: ReservationRowProps) {
  const isExpired = reservation.status === 'expired' || 
    (reservation.status === 'reserved' && Date.now() > reservation.expiresAt);
  
  const canConfirm = reservation.status === 'reserved' && !isExpired;
  const canCancel = reservation.status === 'reserved' && !isExpired;

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        {reservation.id}
      </TableCell>
      <TableCell>
        <Link 
          href={`/items/${reservation.itemId}`}
          className="hover:underline font-medium"
        >
          {reservation.itemId}
        </Link>
      </TableCell>
      <TableCell>{reservation.qty}</TableCell>
      <TableCell>
        <StatusBadge status={reservation.status} />
      </TableCell>
      <TableCell>
        {reservation.status === 'reserved' ? (
          <span className={isExpired ? 'text-red-500' : 'text-amber-600'}>
            {isExpired ? 'Expired' : new Date(reservation.expiresAt).toLocaleTimeString()}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {canConfirm && (
            <Button
              size="sm"
              onClick={() => onConfirm(reservation.id)}
              disabled={isPending}
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
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCancel(reservation.id)}
              disabled={isPending}
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
          {!canConfirm && !canCancel && (
            <span className="text-sm text-slate-400">No actions available</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
