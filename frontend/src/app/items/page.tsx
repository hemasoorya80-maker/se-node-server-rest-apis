'use client';

/**
 * Items List Page
 * 
 * Displays all available items with their stock levels.
 */

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ArrowRight, AlertCircle } from 'lucide-react';
import { listItems } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { ErrorAlert } from '@/components/ui-blocks/error-alert';
import { EmptyState } from '@/components/ui-blocks/empty-state';
import { ItemsSkeleton } from '@/components/ui-blocks/loading-skeleton';

export default function ItemsPage() {
  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.items,
    queryFn: listItems,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Available Items</h1>
          <p className="text-slate-500 mt-1">
            Browse our inventory and reserve items
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <AlertCircle className="h-4 w-4" />
          <span>Reservations expire after 10 minutes if not confirmed</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items?.map((item) => (
            <Link key={item.id} href={`/items/${item.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-slate-200 transition-colors">
                      <Package className="h-5 w-5 text-slate-700" />
                    </div>
                    <Badge 
                      variant={item.availableQty > 0 ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {item.availableQty > 0 ? `${item.availableQty} in stock` : 'Out of stock'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{item.name}</CardTitle>
                  <CardDescription className="text-xs font-mono">
                    {item.id}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-between group-hover:bg-slate-100"
                    disabled={item.availableQty === 0}
                  >
                    <span>View Details</span>
                    <ArrowRight className="h-4 w-4" />
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
