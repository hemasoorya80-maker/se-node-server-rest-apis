'use client';

/**
 * Status Badge
 * 
 * Glass-morphism styled reservation status badges.
 */

import { Badge } from '@/components/ui/badge';
import type { ReservationStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

const statusConfig: Record<ReservationStatus, { 
  label: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  reserved: {
    label: 'Reserved',
    variant: 'default',
    className: 'bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/30',
  },
  confirmed: {
    label: 'Confirmed',
    variant: 'secondary',
    className: 'bg-green-500/20 text-green-700 hover:bg-green-500/30 dark:bg-green-500/20 dark:text-green-400 border-green-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'outline',
    className: 'bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 dark:bg-slate-500/20 dark:text-slate-400 border-slate-500/20',
  },
  expired: {
    label: 'Expired',
    variant: 'destructive',
    className: 'bg-red-500/20 text-red-700 hover:bg-red-500/30 dark:bg-red-500/20 dark:text-red-400 border-red-500/30',
  },
};

interface StatusBadgeProps {
  status: ReservationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant={config.variant}
      className={cn(
        'font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
