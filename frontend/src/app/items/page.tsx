'use client';

/**
 * @fileoverview Items List Page - Inventory Browser
 * 
 * This page displays a grid of all available inventory items with:
 * - Data fetching using TanStack Query's useQuery hook
 * - Loading skeletons for better UX
 * - Error handling with retry functionality
 * - Empty state handling
 * - Stock availability indicators
 * 
 * @example
 * // Access this page at:
 * // http://localhost:3000/items
 * 
 * // The list automatically refreshes when navigating back
 * // thanks to TanStack Query's stale-while-revalidate caching
 * 
 * @see {@link https://tanstack.com/query/latest/docs/react/guides/queries} TanStack Query
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes} Next.js Dynamic Routes
 */

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { listItems } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { ErrorAlert } from '@/components/ui-blocks/error-alert';
import { EmptyState } from '@/components/ui-blocks/empty-state';
import { ItemsSkeleton } from '@/components/ui-blocks/loading-skeleton';
import { cn } from '@/lib/utils';

/**
 * ItemsPage Component
 * 
 * Renders a browsable grid of inventory items. Each item card:
 * - Links to its detail page (/items/[id])
 * - Shows current stock availability
 * - Has visual states for in-stock vs out-of-stock
 * 
 * Data Fetching Pattern:
 * This component uses the "fetch-on-render" pattern where data is fetched
 * when the component mounts. TanStack Query handles:
 * - Caching: Data is cached and reused across navigation
 * - Background updates: Stale data is refreshed in the background
 * - Deduping: Multiple simultaneous requests for the same data are deduplicated
 * 
 * @returns {JSX.Element} The rendered items list page
 */
export default function ItemsPage() {
  /**
   * Items List Query - useQuery Pattern
   * 
   * This query fetches all available items from the inventory API.
   * 
   * Key configuration:
   * - queryKey: queryKeys.items = ['items']
   *   This key identifies the cache entry. When mutations modify items,
   *   they invalidate this key to trigger a refetch.
   * 
   * - queryFn: listItems
   *   The API function that returns Promise<Item[]>
   * 
   * Returned states:
   * - data: Item[] | undefined - The array of items when loaded
   * - isLoading: boolean - True only during initial fetch (no cached data)
   * - isError: boolean - True if the query failed
   * - error: Error | null - The error object if failed
   * - refetch: () => Promise - Manual retry function
   * 
   * Caching Behavior:
   * - First visit: Shows loading skeleton, then displays data
   * - Return visit: Shows cached data immediately, refreshes in background
   * - Cache invalidation: Mutations (reserve, confirm, cancel) call
   *   queryClient.invalidateQueries({ queryKey: queryKeys.items })
   *   which marks this cache as stale and triggers a refetch
   * 
   * @see {@link https://tanstack.com/query/latest/docs/react/guides/caching} Caching Guide
   */
  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.items,  // ['items'] - shared cache key
    queryFn: listItems,         // GET /api/items
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 
        Page Header
        
        Demonstrates responsive layout with flexbox:
        - On mobile: Stack vertically with gap-4
        - On sm+ screens: Horizontal layout with items-center
        
        The badge shows a contextual hint about reservation expiration.
      */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Section label with icon */}
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <span className="text-sm font-medium text-violet-600 uppercase tracking-wider">Inventory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">Available Items</h1>
          <p className="text-gray-500 mt-2">
            Browse our collection and reserve what you need
          </p>
        </div>
        {/* Contextual hint badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-sm">
          <AlertCircle className="h-4 w-4 text-gray-500" />
          <span className="text-gray-500">Reservations expire after 10 minutes</span>
        </div>
      </div>

      {/* 
        Content Area - Four States
        
        The content area renders one of four states based on the query status:
        
        1. isLoading: Show skeleton placeholders while fetching
        2. isError: Show error alert with retry button
        3. items?.length === 0: Show empty state when no items exist
        4. default: Render the items grid
        
        This pattern ensures users always see appropriate feedback.
      */}
      
      {/* State 1: Loading - Skeleton placeholders */}
      {isLoading ? (
        <ItemsSkeleton count={8} />
      ) : isError ? (
        /* 
          State 2: Error - Error alert with retry
          
          The ErrorAlert component displays the error message
          and provides a retry button that calls refetch().
          
          This demonstrates error boundary patterns without
          actually using React Error Boundaries.
        */
        <ErrorAlert 
          error={error} 
          title="Failed to load items" 
          onRetry={refetch} 
        />
      ) : items?.length === 0 ? (
        /* 
          State 3: Empty - No items in inventory
          
          The EmptyState component provides helpful context
          and a call-to-action when there's no data to display.
        */
        <EmptyState 
          type="items" 
          action={{ label: 'Refresh', href: '/items' }}
        />
      ) : (
        /* 
          State 4: Success - Items Grid
          
          Renders a responsive grid of item cards:
          - 1 column on mobile
          - 2 columns on sm screens
          - 3 columns on lg screens
          - 4 columns on xl screens
          
          Each card is wrapped in a Next.js Link for client-side
          navigation to the item detail page.
        */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items?.map((item, idx) => (
            /* 
              Next.js Link Component
              
              Link enables client-side navigation without full page reloads.
              - href: The destination route (/items/[id])
              - Automatic prefetching on hover for instant navigation
              - Preserves scroll position and component state
              
              @see {@link https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating} Next.js Linking
            */
            <Link key={item.id} href={`/items/${item.id}`}>
              <Card 
                className={cn(
                  "glass card-hover h-full cursor-pointer group overflow-hidden",
                  /* Dim the card if item is out of stock */
                  item.availableQty === 0 && "opacity-60"
                )}
                /* Staggered animation delay based on index */
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <CardHeader className="pb-3 relative">
                  <div className="flex items-start justify-between">
                    {/* 
                      Item Icon
                      
                      The icon container changes style based on availability:
                      - In stock: Gradient background with primary color
                      - Out of stock: Muted background with gray icon
                    */}
                    <div className={cn(
                      "p-3 rounded-xl transition-all duration-300 group-hover:scale-110",
                      item.availableQty > 0 
                        ? "bg-gradient-to-br from-primary/20 to-primary/10" 
                        : "bg-gray-100"
                    )}>
                      <Package className={cn(
                        "h-6 w-6",
                        item.availableQty > 0 ? "text-violet-600" : "text-gray-500"
                      )} />
                    </div>
                    
                    {/* 
                      Availability Badge
                      
                      Shows the exact quantity available or "Out of stock".
                      Uses conditional styling for visual feedback.
                    */}
                    <Badge 
                      variant={item.availableQty > 0 ? 'default' : 'destructive'}
                      className={cn(
                        "text-xs font-medium",
                        item.availableQty > 0 && "bg-green-500/20 text-green-700 hover:bg-green-500/30 dark:bg-green-500/20 dark:text-green-400"
                      )}
                    >
                      {item.availableQty > 0 ? `${item.availableQty} available` : 'Out of stock'}
                    </Badge>
                  </div>
                  
                  {/* Item name with hover color change */}
                  <CardTitle className="text-lg mt-4 group-hover:text-violet-600 transition-colors">
                    {item.name}
                  </CardTitle>
                  {/* Item ID as monospace text */}
                  <CardDescription className="text-xs font-mono opacity-70">
                    {item.id}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative">
                  {/* 
                    CTA Button
                    
                    The button text and state depend on availability:
                    - Available: "Reserve Now" with hover effects
                    - Unavailable: "Unavailable" disabled state
                  */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "w-full justify-between group/btn transition-all",
                      item.availableQty > 0 
                        ? "hover:bg-violet-500/10" 
                        : "opacity-50 cursor-not-allowed"
                    )}
                    disabled={item.availableQty === 0}
                  >
                    <span>{item.availableQty > 0 ? 'Reserve Now' : 'Unavailable'}</span>
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
