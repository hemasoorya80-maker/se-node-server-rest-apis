'use client';

/**
 * User Reservations Page
 * 
 * Glassmorphism reservation management with confirm/cancel actions.
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
// Component
// ============================================

export default function UserReservationsPage() {
  const params = useParams();
  const userId = params.userId as string;
  const queryClient = useQueryClient();

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

  const confirmMutation = useMutation({
    mutationFn: confirmReservation,
    onSuccess: (_, variables) => {
      toast.success('Reservation confirmed!', {
        icon: <Check className="h-4 w-4" />,
      });
      
      const reservation = reservations?.find(r => r.id === variables.reservationId);
      
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

  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: (_, variables) => {
      toast.success('Reservation cancelled', {
        icon: <X className="h-4 w-4" />,
      });
      
      const reservation = reservations?.find(r => r.id === variables.reservationId);
      
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

  const activeReservations = reservations?.filter(
    r => r.status === 'reserved' || r.status === 'confirmed'
  ) || [];
  const pastReservations = reservations?.filter(
    r => r.status === 'cancelled' || r.status === 'expired'
  ) || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
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
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wider">Reservations</span>
            </div>
            <h1 className="text-3xl font-bold">My Reservations</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-subtle px-4 py-2 rounded-full text-sm">
            <span className="text-muted-foreground">User:</span>
            <code className="ml-2 font-mono text-foreground">{userId}</code>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <ReservationsSkeleton />
      ) : isError ? (
        <ErrorAlert error={error} title="Failed to load reservations" onRetry={refetch} />
      ) : reservations?.length === 0 ? (
        <EmptyState type="reservations" action={{ label: 'Browse Items', href: '/items' }} />
      ) : (
        <div className="space-y-8">
          {/* Active Reservations */}
          {activeReservations.length > 0 && (
            <Card className="glass overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <ShoppingBag className="h-5 w-5 text-primary" />
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
                      <TableRow className="hover:bg-transparent border-border/50">
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

          {/* Past Reservations */}
          {pastReservations.length > 0 && (
            <Card className="glass overflow-hidden opacity-80">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-muted">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-muted-foreground">History</CardTitle>
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
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reservation</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Item</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</TableHead>
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
                          <TableCell className="text-sm text-muted-foreground">
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
    <TableRow className="group border-border/50">
      <TableCell className="font-mono text-xs">{reservation.id}</TableCell>
      <TableCell>
        <Link 
          href={`/items/${reservation.itemId}`}
          className="font-medium hover:text-primary transition-colors"
        >
          {reservation.itemId}
        </Link>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-sm font-medium">
          {reservation.qty}
        </span>
      </TableCell>
      <TableCell>
        <StatusBadge status={reservation.status} />
      </TableCell>
      <TableCell>
        {reservation.status === 'reserved' ? (
          <span className={cn(
            "flex items-center gap-1.5 text-sm",
            isExpired ? 'text-destructive' : 'text-amber-600'
          )}>
            <Clock className="h-3.5 w-3.5" />
            {isExpired ? 'Expired' : new Date(reservation.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
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
          {!canConfirm && !canCancel && (
            <span className="text-sm text-muted-foreground py-2">Completed</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
