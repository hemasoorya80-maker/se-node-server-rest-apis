'use client';

/**
 * Loading Skeletons
 * 
 * Glass-morphism styled skeleton loaders.
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ItemsSkeletonProps {
  count?: number;
}

export function ItemsSkeleton({ count = 4 }: ItemsSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="glass overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
              <div className="w-20 h-6 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="w-3/4 h-5 rounded bg-muted animate-pulse mt-4" />
            <div className="w-1/2 h-3 rounded bg-muted/50 animate-pulse mt-2" />
          </CardHeader>
          <CardContent>
            <div className="w-full h-9 rounded-lg bg-muted animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ReservationsSkeletonProps {
  count?: number;
}

export function ReservationsSkeleton({ count = 5 }: ReservationsSkeletonProps) {
  return (
    <div className="space-y-6">
      <Card className="glass overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
              <div>
                <div className="w-40 h-6 rounded bg-muted animate-pulse" />
                <div className="w-32 h-4 rounded bg-muted/50 animate-pulse mt-2" />
              </div>
            </div>
            <div className="w-10 h-6 rounded-full bg-muted animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Table header */}
            <div className="flex gap-4 pb-2 border-b border-border/50">
              <div className="w-32 h-4 rounded bg-muted/50 animate-pulse" />
              <div className="w-24 h-4 rounded bg-muted/50 animate-pulse" />
              <div className="w-16 h-4 rounded bg-muted/50 animate-pulse" />
              <div className="w-20 h-4 rounded bg-muted/50 animate-pulse" />
              <div className="w-24 h-4 rounded bg-muted/50 animate-pulse" />
              <div className="w-20 h-4 rounded bg-muted/50 animate-pulse ml-auto" />
            </div>
            {/* Table rows */}
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-3">
                <div className="w-28 h-4 rounded bg-muted animate-pulse" />
                <div className="w-20 h-4 rounded bg-muted animate-pulse" />
                <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                <div className="w-20 h-6 rounded-full bg-muted animate-pulse" />
                <div className="w-24 h-4 rounded bg-muted animate-pulse" />
                <div className="ml-auto flex gap-2">
                  <div className="w-20 h-8 rounded-lg bg-muted animate-pulse" />
                  <div className="w-20 h-8 rounded-lg bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ItemDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="w-24 h-9 rounded-lg bg-muted animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-muted animate-pulse" />
                <div>
                  <div className="w-48 h-7 rounded bg-muted animate-pulse" />
                  <div className="w-24 h-3 rounded bg-muted/50 animate-pulse mt-2" />
                </div>
              </div>
              <div className="w-24 h-7 rounded-full bg-muted animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/50 animate-pulse h-20" />
              <div className="p-4 rounded-xl bg-muted/50 animate-pulse h-20" />
            </div>
            <div className="space-y-3">
              <div className="w-full h-4 rounded bg-muted animate-pulse" />
              <div className="w-3/4 h-4 rounded bg-muted animate-pulse" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
              <div>
                <div className="w-40 h-6 rounded bg-muted animate-pulse" />
                <div className="w-32 h-4 rounded bg-muted/50 animate-pulse mt-2" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="w-16 h-4 rounded bg-muted/50 animate-pulse" />
              <div className="w-full h-10 rounded-xl bg-muted animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="w-20 h-4 rounded bg-muted/50 animate-pulse" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
                <div className="w-24 h-10 rounded-xl bg-muted animate-pulse" />
                <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
              </div>
            </div>
            <div className="w-full h-12 rounded-xl bg-muted animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface HealthSkeletonProps {
  className?: string;
}

export function HealthSkeleton({ className }: HealthSkeletonProps) {
  return (
    <Card className={cn("glass overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
            <div>
              <div className="w-32 h-6 rounded bg-muted animate-pulse" />
              <div className="w-48 h-4 rounded bg-muted/50 animate-pulse mt-2" />
            </div>
          </div>
          <div className="w-24 h-6 rounded-full bg-muted animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 py-4">
          <div className="w-10 h-10 rounded-full border-2 border-muted animate-spin" />
          <div className="w-48 h-4 rounded bg-muted animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
