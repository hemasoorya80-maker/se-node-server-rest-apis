'use client';

/**
 * Item Detail Page
 * 
 * Shows item details and provides a form to reserve the item.
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
import { Package, ArrowLeft, Minus, Plus, Loader2 } from 'lucide-react';
import { getItem, reserveItem } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { ErrorAlert } from '@/components/ui-blocks/error-alert';
import { ItemDetailSkeleton } from '@/components/ui-blocks/loading-skeleton';
import { isApiError } from '@/lib/api';

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

  // Fetch item details
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

  // Reserve mutation
  const reserveMutation = useMutation({
    mutationFn: (data: ReserveFormData) => reserveItem({ ...data, itemId }),
    onSuccess: (reservation) => {
      toast.success('Reservation created successfully!', {
        description: `Reserved ${reservation.qty} x ${item?.name}. Expires at ${new Date(reservation.expiresAt).toLocaleTimeString()}`,
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
      queryClient.invalidateQueries({ queryKey: queryKeys.item(itemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations(reservation.userId) });
      
      // Reset form
      reset();
    },
    onError: (error) => {
      if (isApiError(error)) {
        toast.error('Failed to create reservation', {
          description: `${error.message}${error.requestId ? ` (Request ID: ${error.requestId})` : ''}`,
        });
      } else {
        toast.error('An unexpected error occurred');
      }
    },
  });

  // Form setup
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

  // Loading state
  if (isLoadingItem) {
    return <ItemDetailSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/items">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Items
          </Link>
        </Button>
        <ErrorAlert 
          error={error} 
          title="Failed to load item" 
          onRetry={refetch} 
        />
      </div>
    );
  }

  // Item not found
  if (!item) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/items">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Items
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">Item not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOutOfStock = item.availableQty === 0;
  const canDecrease = quantity > 1;
  const canIncrease = quantity < Math.min(5, item.availableQty);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/items">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Items
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Item Details */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-3 rounded-lg">
                  <Package className="h-6 w-6 text-slate-700" />
                </div>
                <div>
                  <CardTitle>{item.name}</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">
                    {item.id}
                  </CardDescription>
                </div>
              </div>
              <Badge 
                variant={item.availableQty > 0 ? 'default' : 'destructive'}
                className="text-sm"
              >
                {item.availableQty > 0 ? `${item.availableQty} available` : 'Out of stock'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">Item ID</p>
                <p className="font-mono text-sm font-medium">{item.id}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500">Available Quantity</p>
                <p className="text-2xl font-bold">{item.availableQty}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-sm text-slate-600 space-y-2">
              <p>
                <strong>How reservations work:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>Reserve up to 5 items at once</li>
                <li>Reservations expire after 10 minutes</li>
                <li>Confirm your reservation to complete the process</li>
                <li>Cancel anytime before confirmation</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Reservation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Make a Reservation</CardTitle>
            <CardDescription>
              Enter your details to reserve this item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* User ID Field */}
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  {...register('userId')}
                  placeholder="Enter your user ID"
                  disabled={reserveMutation.isPending}
                />
                {errors.userId && (
                  <p className="text-sm text-red-500">{errors.userId.message}</p>
                )}
              </div>

              {/* Quantity Field */}
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setValue('qty', Math.max(1, quantity - 1))}
                    disabled={!canDecrease || reserveMutation.isPending || isOutOfStock}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="qty"
                    type="number"
                    {...register('qty', { valueAsNumber: true })}
                    className="text-center w-20"
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
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {errors.qty && (
                  <p className="text-sm text-red-500">{errors.qty.message}</p>
                )}
                <p className="text-xs text-slate-500">
                  Max: {Math.min(5, item.availableQty)} items
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={reserveMutation.isPending || isOutOfStock}
              >
                {reserveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Reservation...
                  </>
                ) : isOutOfStock ? (
                  'Out of Stock'
                ) : (
                  'Reserve Now'
                )}
              </Button>

              {/* Error Display */}
              {reserveMutation.isError && isApiError(reserveMutation.error) && (
                <div className="p-4 bg-red-50 rounded-lg text-sm">
                  <p className="font-medium text-red-800">Reservation Failed</p>
                  <p className="text-red-600 mt-1">{reserveMutation.error.message}</p>
                  {reserveMutation.error.requestId && (
                    <p className="text-red-500 mt-2 text-xs">
                      Request ID: <code>{reserveMutation.error.requestId}</code>
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
