'use client';

/**
 * @fileoverview Item Detail Page - Reservation Creation
 * 
 * This page demonstrates advanced patterns:
 * - Dynamic route parameters with Next.js App Router
 * - React Hook Form with Zod validation
 * - useMutation for form submissions
 * - Optimistic UI updates with cache invalidation
 * - Comprehensive error handling
 * 
 * @example
 * // Access this page at:
 * // http://localhost:3000/items/item-123
 * 
 * // The [id] in the filename indicates a dynamic route segment.
 * // Next.js captures the URL parameter and passes it to useParams().
 * 
 * // Form submission flow:
 * // 1. User fills form → React Hook Form validates (Zod schema)
 * // 2. On submit → useMutation sends POST request
 * // 3. On success → Cache invalidated, toast shown, form reset
 * // 4. On error → Error toast with API message
 * 
 * @see {@link https://react-hook-form.com/} React Hook Form
 * @see {@link https://zod.dev/} Zod Schema Validation
 * @see {@link https://tanstack.com/query/latest/docs/react/guides/mutations} Mutations Guide
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
// FORM SCHEMA WITH ZOD
// ============================================

/**
 * Zod Schema Definition
 * 
 * Zod is a TypeScript-first schema validation library.
 * It provides type inference AND runtime validation.
 * 
 * This schema validates:
 * - userId: Required non-empty string
 * - qty: Integer between 1 and 5 (inclusive)
 * 
 * Type Inference:
 * The ReserveFormData type is automatically derived from the schema,
 * ensuring form values match the validation rules at compile time.
 * 
 * @example
 * // Valid data:
 * { userId: "user-123", qty: 3 }
 * 
 * // Invalid data (Zod will throw):
 * { userId: "", qty: 10 }  // Empty userId, qty exceeds max
 * 
 * @see {@link https://zod.dev/?id=basic-usage} Zod Basics
 */
const reserveSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  qty: z.number().int().min(1, 'Minimum quantity is 1').max(5, 'Maximum quantity is 5'),
});

/**
 * Inferred Type from Schema
 * 
 * z.infer extracts the TypeScript type from the Zod schema.
 * This ensures the form's type definition stays in sync with
 * the validation rules automatically.
 */
type ReserveFormData = z.infer<typeof reserveSchema>;

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * ItemDetailPage Component
 * 
 * Displays detailed item information and a reservation form.
 * 
 * Architecture:
 * 1. Data Fetching: useQuery loads item details
 * 2. Form Management: React Hook Form handles input state
 * 3. Submission: useMutation sends data to API
 * 4. Cache Management: QueryClient invalidates related queries on success
 * 
 * @returns {JSX.Element} The rendered item detail page
 */
export default function ItemDetailPage() {
  // ------------------------------------------
  // ROUTE PARAMETERS
  // ------------------------------------------
  
  /**
   * useParams - Next.js Dynamic Route Access
   * 
   * useParams returns an object with dynamic route parameters.
   * For a route like /items/item-123, params.id will be "item-123".
   * 
   * The filename [id] creates this dynamic segment.
   * Multiple segments: [id]/[subId] would give { id: string, subId: string }
   * 
   * Type assertion needed because params values are typed as string | string[]
   * @see {@link https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes} Dynamic Routes
   */
  const params = useParams();
  const itemId = params.id as string;

  // ------------------------------------------
  // QUERY CLIENT - CACHE ACCESS
  // ------------------------------------------
  
  /**
   * useQueryClient - Cache Manipulation Hook
   * 
   * The QueryClient provides methods to interact with TanStack Query's cache:
   * - invalidateQueries: Mark data as stale and trigger refetch
   * - setQueryData: Manually update cached data
   * - getQueryData: Read cached data
   * - removeQueries: Delete cached data
   * 
   * Used here to invalidate related queries after a successful reservation,
   * ensuring all parts of the UI reflect the updated stock levels.
   * 
   * @see {@link https://tanstack.com/query/latest/docs/react/reference/QueryClient} QueryClient API
   */
  const queryClient = useQueryClient();

  // ------------------------------------------
  // DATA FETCHING - ITEM DETAILS
  // ------------------------------------------
  
  /**
   * Item Detail Query
   * 
   * Fetches detailed information for a specific item.
   * 
   * Configuration:
   * - queryKey: ['items', itemId] - Unique per item, allows individual cache invalidation
   * - queryFn: () => getItem(itemId) - API call with the item ID
   * - enabled: !!itemId - Only run if itemId exists (prevents undefined ID calls)
   * 
   * The enabled option is important for dynamic routes where the param
   * might be undefined during initial render or static generation.
   * 
   * Caching Strategy:
   * - Each item has its own cache entry
   * - When a reservation is made, we invalidate both the specific item
   *   AND the items list to update stock displays everywhere
   */
  const { 
    data: item, 
    isLoading: isLoadingItem, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: queryKeys.item(itemId),  // ['items', itemId]
    queryFn: () => getItem(itemId),    // GET /api/items/:id
    enabled: !!itemId,                 // Prevent fetching with undefined ID
  });

  // ------------------------------------------
  // MUTATION - RESERVATION CREATION
  // ------------------------------------------
  
  /**
   * Reservation Mutation - useMutation Pattern
   * 
   * useMutation handles operations that modify server state (POST, PUT, DELETE).
   * Unlike useQuery, mutations are triggered manually via mutate().
   * 
   * Configuration:
   * - mutationFn: The async function that performs the API call
   * - onSuccess: Callback when mutation succeeds (invalidate caches, show toast)
   * - onError: Callback when mutation fails (show error toast)
   * 
   * Returned properties:
   * - mutate: Function to trigger the mutation
   * - isPending: Boolean for loading state during submission
   * - isError: Boolean if mutation failed
   * - error: Error object if failed
   * 
   * @see {@link https://tanstack.com/query/latest/docs/react/guides/mutations} Mutations Guide
   */
  const reserveMutation = useMutation({
    /**
     * Mutation Function
     * 
     * Receives the form data and adds the itemId to create the full payload.
     * The spread operator preserves all form fields while adding the dynamic itemId.
     */
    mutationFn: (data: ReserveFormData) => reserveItem({ ...data, itemId }),
    
    /**
     * Success Handler - Cache Invalidation Pattern
     * 
     * When a reservation succeeds, we must update all parts of the UI
     * that display stock information. TanStack Query uses cache invalidation
     * to trigger automatic refetching.
     * 
     * Invalidated Queries:
     * 1. queryKeys.items - The items list page (stock badges)
     * 2. queryKeys.item(itemId) - This detail page (availableQty display)
     * 3. queryKeys.reservations(userId) - User's reservation list
     * 
     * This pattern is called "cache invalidation" and is the standard way
     * to keep multiple views synchronized after mutations.
     * 
     * @see {@link https://tanstack.com/query/latest/docs/react/guides/invalidations-from-mutations} Invalidations Guide
     */
    onSuccess: (reservation) => {
      // Show success toast with reservation details
      toast.success('Reservation created!', {
        description: `Reserved ${reservation.qty}× ${item?.name}. Expires at ${new Date(reservation.expiresAt).toLocaleTimeString()}`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      
      // Invalidate related queries to refresh stock data across the app
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
      queryClient.invalidateQueries({ queryKey: queryKeys.item(itemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations(reservation.userId) });
      
      // Reset form to default values after successful submission
      reset();
    },
    
    /**
     * Error Handler - API Error Pattern
     * 
     * Handles different types of errors:
     * 1. API errors (structured error with message and requestId)
     * 2. Unexpected errors (network failures, etc.)
     * 
     * isApiError is a type guard that checks if the error follows
     * the API's error structure (has message property).
     */
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

  // ------------------------------------------
  // FORM MANAGEMENT - REACT HOOK FORM
  // ------------------------------------------
  
  /**
   * React Hook Form Setup
   * 
   * useForm is the core hook for managing form state. It handles:
   * - Form value tracking
   * - Validation (via Zod resolver)
   * - Error messaging
   * - Form submission
   * 
   * Configuration:
   * - resolver: zodResolver(reserveSchema) - Connects Zod validation
   * - defaultValues: Initial form state
   * 
   * Returned methods:
   * - register: Connects inputs to form state (handles onChange, value, ref)
   * - handleSubmit: Wraps submit handler with validation
   * - watch: Subscribes to field changes (used for quantity display)
   * - setValue: Programmatically sets field values (increment/decrement buttons)
   * - reset: Resets form to default values
   * - formState.errors: Validation errors by field
   * 
   * @see {@link https://react-hook-form.com/get-started} React Hook Form Getting Started
   */
  const {
    register,           // Input registration function
    handleSubmit,       // Form submission handler
    watch,              // Subscribe to field value changes
    setValue,           // Programmatic field value setter
    reset,              // Reset form to defaults
    formState: { errors },  // Validation errors
  } = useForm<ReserveFormData>({
    /**
     * Zod Resolver Configuration
     * 
     * zodResolver connects Zod schema validation to React Hook Form.
     * When handleSubmit is called, the form data is validated against
     * the schema before onSubmit executes.
     * 
     * If validation fails, errors object is populated and onSubmit is NOT called.
     */
    resolver: zodResolver(reserveSchema),
    defaultValues: {
      userId: 'demo-user',  // Pre-fill for demo convenience
      qty: 1,               // Default quantity
    },
  });

  /**
   * Watch Quantity Value
   * 
   * watch() subscribes to form field changes and returns the current value.
   * Used here to:
   * 1. Display current quantity in the number input
   * 2. Determine if increment/decrement buttons should be disabled
   * 
   * Note: watch causes re-renders on every change. For performance-critical
   * forms, consider using useWatch or Controller for individual fields.
   */
  const quantity = watch('qty');

  // ------------------------------------------
  // FORM SUBMISSION HANDLER
  // ------------------------------------------
  
  /**
   * Form Submit Handler
   * 
   * This function is called when the form passes validation.
   * handleSubmit from React Hook Form ensures data matches the Zod schema
   * before calling this function.
   * 
   * @param data - Validated form data (ReserveFormData type)
   */
  const onSubmit = (data: ReserveFormData) => {
    // Trigger the mutation with the validated form data
    reserveMutation.mutate(data);
  };

  // ------------------------------------------
  // RENDER STATES
  // ------------------------------------------
  
  // State 1: Loading - Show skeleton while fetching item data
  if (isLoadingItem) {
    return <ItemDetailSkeleton />;
  }

  // State 2: Error - Show error alert with retry button
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

  // State 3: Not Found - Item ID doesn't exist in database
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
            <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-lg text-gray-500">Item not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ------------------------------------------
  // DERIVED STATE
  // ------------------------------------------
  
  // Calculate button states based on stock and form state
  const isOutOfStock = item.availableQty === 0;
  const canDecrease = quantity > 1;  // Prevent going below 1
  const canIncrease = quantity < Math.min(5, item.availableQty);  // Max 5 or stock limit

  // ------------------------------------------
  // MAIN RENDER
  // ------------------------------------------
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Button - Navigation */}
      <Button variant="ghost" asChild className="group">
        <Link href="/items">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Items
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 
          ITEM DETAILS CARD
          
          Displays:
          - Item name and ID
          - Current stock availability
          - Feature highlights (expiration, idempotency)
        */}
        <Card className="glass overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <CardHeader className="relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Stock status icon */}
                <div className={cn(
                  "p-4 rounded-2xl",
                  item.availableQty > 0 
                    ? "bg-gradient-to-br from-primary/20 to-primary/10" 
                    : "bg-gray-100"
                )}>
                  <Package className={cn(
                    "h-8 w-8",
                    item.availableQty > 0 ? "text-violet-600" : "text-gray-500"
                  )} />
                </div>
                <div>
                  <CardTitle className="text-2xl">{item.name}</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">
                    {item.id}
                  </CardDescription>
                </div>
              </div>
              {/* Dynamic availability badge */}
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
            {/* ID and Stock Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-subtle p-4 rounded-xl">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Item ID</p>
                <p className="font-mono text-sm font-medium">{item.id}</p>
              </div>
              <div className="glass-subtle p-4 rounded-xl">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Stock</p>
                <p className={cn(
                  "text-3xl font-bold",
                  item.availableQty > 0 ? "text-gray-900" : "text-red-500"
                )}>
                  {item.availableQty}
                </p>
              </div>
            </div>
            
            <Separator className="opacity-50" />
            
            {/* Feature List */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Clock className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="font-medium">10-Minute Expiration</p>
                  <p className="text-sm text-gray-500">Reservations auto-expire if not confirmed</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Shield className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="font-medium">Idempotency Protected</p>
                  <p className="text-sm text-gray-500">Safe to retry if network fails</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 
          RESERVATION FORM CARD
          
          Demonstrates:
          - React Hook Form integration
          - Zod validation error display
          - Controlled inputs with register
          - Programmatic value changes (increment/decrement)
          - Loading states during submission
        */}
        <Card className="glass overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-violet-500/10">
                <ShoppingCart className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <CardTitle>Make Reservation</CardTitle>
                <CardDescription>Secure your items now</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {/* 
              Form Element
              
              handleSubmit(onSubmit) wraps our submit handler:
              1. Prevents default form submission (page reload)
              2. Validates form data against Zod schema
              3. Only calls onSubmit if validation passes
              4. Populates errors object if validation fails
            */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 
                User ID Field
                
                register('userId') connects this input to React Hook Form:
                - name="userId" is set automatically
                - onChange handles value updates
                - ref handles focus management
                - value is controlled by the form state
              */}
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-sm font-medium">
                  User ID
                </Label>
                <Input
                  id="userId"
                  {...register('userId')}  // Spread register props
                  placeholder="Enter your user ID"
                  disabled={reserveMutation.isPending || isOutOfStock}
                  className="glass-subtle border-0 focus-visible:ring-primary"
                />
                {/* 
                  Validation Error Display
                  
                  errors.userId is populated by Zod validation.
                  The error message comes from the schema definition:
                  z.string().min(1, 'User ID is required')
                */}
                {errors.userId && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {errors.userId.message}
                  </p>
                )}
              </div>

              {/* 
                Quantity Field
                
                This is a compound input with:
                - Decrement button (setValue)
                - Number input (register with valueAsNumber)
                - Increment button (setValue)
                
                valueAsNumber: true converts the string input value to a number
                before storing in form state (prevents type mismatch with Zod schema).
              */}
              <div className="space-y-2">
                <Label htmlFor="qty" className="text-sm font-medium">
                  Quantity
                </Label>
                <div className="flex items-center gap-3">
                  {/* Decrement Button */}
                  <Button
                    type="button"  // Important: type="button" prevents form submission
                    variant="outline"
                    size="icon"
                    onClick={() => setValue('qty', Math.max(1, quantity - 1))}
                    disabled={!canDecrease || reserveMutation.isPending || isOutOfStock}
                    className="rounded-xl glass-subtle"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  {/* Number Input */}
                  <Input
                    id="qty"
                    type="number"
                    {...register('qty', { valueAsNumber: true })}
                    className="text-center w-24 glass-subtle border-0 text-lg font-semibold"
                    min={1}
                    max={Math.min(5, item.availableQty)}
                    disabled={reserveMutation.isPending || isOutOfStock}
                  />
                  
                  {/* Increment Button */}
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
                {/* Quantity validation error */}
                {errors.qty && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {errors.qty.message}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Maximum: {Math.min(5, item.availableQty)} items per reservation
                </p>
              </div>

              {/* 
                Submit Button
                
                Three states:
                1. Loading: Shows spinner during mutation (reserveMutation.isPending)
                2. Disabled: Out of stock (isOutOfStock)
                3. Ready: Normal submit button
              */}
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

              {/* 
                Mutation Error Display
                
                Shows API errors that occur during submission.
                This displays errors from the mutation's onError handler.
              */}
              {reserveMutation.isError && isApiError(reserveMutation.error) && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-destructive/20 text-sm">
                  <p className="font-medium text-red-500 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Reservation Failed
                  </p>
                  <p className="text-red-500/80 mt-1">{reserveMutation.error.message}</p>
                  {reserveMutation.error.requestId && (
                    <p className="text-red-500/60 mt-2 text-xs font-mono">
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
