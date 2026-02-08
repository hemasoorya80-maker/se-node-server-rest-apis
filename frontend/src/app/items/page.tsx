'use client';

/**
 * Items List Page
 * 
 * Glassmorphism grid of inventory items.
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

export default function ItemsPage() {
  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.items,
    queryFn: listItems,
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Inventory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">Available Items</h1>
          <p className="text-muted-foreground mt-2">
            Browse our collection and reserve what you need
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-sm">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Reservations expire after 10 minutes</span>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <ItemsSkeleton count={8} />
      ) : isError ? (
        <ErrorAlert 
          error={error} 
          title="Failed to load items" 
          onRetry={refetch} 
        />
      ) : items?.length === 0 ? (
        <EmptyState 
          type="items" 
          action={{ label: 'Refresh', href: '/items' }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items?.map((item, idx) => (
            <Link key={item.id} href={`/items/${item.id}`}>
              <Card 
                className={cn(
                  "glass card-hover h-full cursor-pointer group overflow-hidden",
                  item.availableQty === 0 && "opacity-60"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="pb-3 relative">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "p-3 rounded-xl transition-all duration-300 group-hover:scale-110",
                      item.availableQty > 0 
                        ? "bg-gradient-to-br from-primary/20 to-primary/10" 
                        : "bg-muted"
                    )}>
                      <Package className={cn(
                        "h-6 w-6",
                        item.availableQty > 0 ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
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
                  <CardTitle className="text-lg mt-4 group-hover:text-primary transition-colors">
                    {item.name}
                  </CardTitle>
                  <CardDescription className="text-xs font-mono opacity-70">
                    {item.id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "w-full justify-between group/btn transition-all",
                      item.availableQty > 0 
                        ? "hover:bg-primary/10" 
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
