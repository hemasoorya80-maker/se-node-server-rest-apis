'use client';

/**
 * Item Detail Page
 * 
 * Glassmorphism detail view with reservation form.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  ArrowLeft, 
  Minus, 
  Plus, 
  Loader2, 
  ShoppingCart,
  Info,
  Clock,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { getItem, reserveItem } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { ErrorAlert } from '@/components/ui-blocks/error-alert';
import { ItemDetailSkeleton } from '@/components/ui-blocks/loading-skeleton';
import { isApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

// ============================================
// Form Schema
// ============================================

const reserveSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  qty: z.number().int().min(1, 'Minimum quantity is 1').max(5, 'Maximum quantity is 5'),
});

type ReserveFormData = z.infer<typeof reserveSchema>;

// ============================================
// Component
// ============================================

export default function ItemDetailPage() {
  const params = useParams();
  const itemId = params.id as string;
  const queryClient = useQueryClient();

  const { 
    data: item, 
    isLoading: isLoadingItem, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: queryKeys.item(itemId),
    queryFn: () => getItem(itemId),
    enabled: !!itemId,
  });

  const reserveMutation = useMutation({
    mutationFn: (data: ReserveFormData) => reserveItem({ ...data, itemId }),
    onSuccess: (reservation) => {
      toast.success('Reservation created!', {
        description: `Reserved ${reservation.qty}× ${item?.name}. Expires at ${new Date(reservation.expiresAt).toLocaleTimeString()}`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
      queryClient.invalidateQueries({ queryKey: queryKeys.item(itemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations(reservation.userId) });
      
      reset();
    },
    onError: (error) => {
      if (isApiError(error)) {
        toast.error('Reservation failed', {
          description: error.message,
        });
      } else {
        toast.error('An unexpected error occurred');
      }
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ReserveFormData>({
    resolver: zodResolver(reserveSchema),
    defaultValues: {
      userId: 'demo-user',
      qty: 1,
    },
  });

  const quantity = watch('qty');

  const onSubmit = (data: ReserveFormData) => {
    reserveMutation.mutate(data);
  };

  if (isLoadingItem) {
    return <ItemDetailSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/items">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Items
          </Link>
        </Button>
        <ErrorAlert error={error} title="Failed to load item" onRetry={refetch} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/items">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Items
          </Link>
        </Button>
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Item not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOutOfStock = item.availableQty === 0;
  const canDecrease = quantity > 1;
  const canIncrease = quantity < Math.min(5, item.availableQty);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" asChild className="group">
        <Link href="/items">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Items
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Item Details */}
        <Card className="glass overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <CardHeader className="relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-4 rounded-2xl",
                  item.availableQty > 0 
                    ? "bg-gradient-to-br from-primary/20 to-primary/10" 
                    : "bg-muted"
                )}>
                  <Package className={cn(
                    "h-8 w-8",
                    item.availableQty > 0 ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <CardTitle className="text-2xl">{item.name}</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">
                    {item.id}
                  </CardDescription>
                </div>
              </div>
              <Badge 
                variant={item.availableQty > 0 ? 'default' : 'destructive'}
                className={cn(
                  "text-sm px-3 py-1",
                  item.availableQty > 0 && "bg-green-500/20 text-green-700 hover:bg-green-500/30 dark:bg-green-500/20 dark:text-green-400"
                )}
              >
                {item.availableQty > 0 ? `${item.availableQty} available` : 'Out of stock'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-subtle p-4 rounded-xl">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Item ID</p>
                <p className="font-mono text-sm font-medium">{item.id}</p>
              </div>
              <div className="glass-subtle p-4 rounded-xl">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Stock</p>
                <p className={cn(
                  "text-3xl font-bold",
                  item.availableQty > 0 ? "text-foreground" : "text-destructive"
                )}>
                  {item.availableQty}
                </p>
              </div>
            </div>
            
            <Separator className="opacity-50" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">10-Minute Expiration</p>
                  <p className="text-sm text-muted-foreground">Reservations auto-expire if not confirmed</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Idempotency Protected</p>
                  <p className="text-sm text-muted-foreground">Safe to retry if network fails</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservation Form */}
        <Card className="glass overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Make Reservation</CardTitle>
                <CardDescription>Secure your items now</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* User ID Field */}
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-sm font-medium">
                  User ID
                </Label>
                <Input
                  id="userId"
                  {...register('userId')}
                  placeholder="Enter your user ID"
                  disabled={reserveMutation.isPending || isOutOfStock}
                  className="glass-subtle border-0 focus-visible:ring-primary"
                />
                {errors.userId && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {errors.userId.message}
                  </p>
                )}
              </div>

              {/* Quantity Field */}
              <div className="space-y-2">
                <Label htmlFor="qty" className="text-sm font-medium">
                  Quantity
                </Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setValue('qty', Math.max(1, quantity - 1))}
                    disabled={!canDecrease || reserveMutation.isPending || isOutOfStock}
                    className="rounded-xl glass-subtle"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="qty"
                    type="number"
                    {...register('qty', { valueAsNumber: true })}
                    className="text-center w-24 glass-subtle border-0 text-lg font-semibold"
                    min={1}
                    max={Math.min(5, item.availableQty)}
                    disabled={reserveMutation.isPending || isOutOfStock}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setValue('qty', Math.min(5, item.availableQty, quantity + 1))}
                    disabled={!canIncrease || reserveMutation.isPending || isOutOfStock}
                    className="rounded-xl glass-subtle"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {errors.qty && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {errors.qty.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {Math.min(5, item.availableQty)} items per reservation
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium rounded-xl"
                disabled={reserveMutation.isPending || isOutOfStock}
              >
                {reserveMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isOutOfStock ? (
                  'Out of Stock'
                ) : (
                  'Reserve Now'
                )}
              </Button>

              {/* Error Display */}
              {reserveMutation.isError && isApiError(reserveMutation.error) && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm">
                  <p className="font-medium text-destructive flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Reservation Failed
                  </p>
                  <p className="text-destructive/80 mt-1">{reserveMutation.error.message}</p>
                  {reserveMutation.error.requestId && (
                    <p className="text-destructive/60 mt-2 text-xs font-mono">
                      Request ID: {reserveMutation.error.requestId}
                    </p>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
