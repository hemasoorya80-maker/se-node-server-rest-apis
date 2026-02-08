'use client';

/**
 * Status Badge
 * 
 * Displays reservation status with appropriate color coding.
 */

import { Badge } from '@/components/ui/badge';
import type { ReservationStatus } from '@/lib/api';
import { statusLabels, statusColors } from '@/lib/api';

interface StatusBadgeProps {
  status: ReservationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={statusColors[status]} className={className}>
      {statusLabels[status]}
    </Badge>
  );
}
